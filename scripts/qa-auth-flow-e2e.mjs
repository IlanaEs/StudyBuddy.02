// Real end-to-end Auth Foundation flow validation (API + DB) — Google-only model.
//
//   node scripts/qa-auth-flow-e2e.mjs          (cleans up test users after)
//   KEEP=1 node scripts/qa-auth-flow-e2e.mjs   (leaves rows for inspection)
//
// Drives the running backend (http://localhost:4000) through:
//   admin-client user creation → signInWithPassword (dev fixture) → complete-oauth-signup →
//   /me → profile creation → onboarding → logout → re-session → /me (idempotent)
//
// Tests the surviving Google-OAuth path. Email+password app endpoints are removed;
// session minting here uses the Supabase admin client as a dev-only fixture.
//
// Safe: operates only on qaflow.* @studybuddy.local test accounts and deletes
// them (auth + public rows) before and after the run.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const API = process.env.QA_API_BASE ?? 'http://localhost:4000';

function loadBackendEnv() {
  const raw = readFileSync(resolve(REPO, 'apps/backend/.env'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}
const benv = loadBackendEnv();
const SUPABASE_URL = benv.SUPABASE_URL;
const SERVICE_KEY = benv.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = benv.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('FATAL: Supabase env missing'); process.exit(2); }
console.log(`Supabase: ${SUPABASE_URL}`);
console.log(`NODE_ENV=${benv.NODE_ENV}\n`);

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = createClient(SUPABASE_URL, ANON_KEY ?? SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const results = [];
function check(flow, name, cond, detail = '') {
  results.push({ flow, name, pass: !!cond, detail });
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
  return !!cond;
}

const PASSWORD = 'QaFlow123!';
const ROLES = [
  { role: 'teacher', email: 'qaflow.teacher@studybuddy.local', fullName: 'QA Flow Teacher', accountType: 'independent_student' },
  { role: 'parent', email: 'qaflow.parent@studybuddy.local', fullName: 'QA Flow Parent', accountType: 'parent_for_child' },
  { role: 'student', email: 'qaflow.student@studybuddy.local', fullName: 'QA Flow Student', accountType: 'independent_student' },
];

async function apiCall(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { status: res.status, json };
}

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email ?? '').toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}
async function dbUsersByEmail(email) {
  const { data, error } = await admin.from('users').select('*').eq('email', email);
  if (error) throw new Error('users query: ' + error.message);
  return data;
}
async function cleanupEmail(email) {
  const authUser = await findAuthUserByEmail(email);
  const rows = await dbUsersByEmail(email);
  const ids = new Set(rows.map((r) => r.id));
  if (authUser) ids.add(authUser.id);
  for (const uid of ids) {
    const tp = await admin.from('teacher_profiles').select('id').eq('user_id', uid);
    if (!tp.error && tp.data) for (const p of tp.data) {
      await admin.from('availability_slots').delete().eq('teacher_id', p.id);
      await admin.from('teacher_subjects').delete().eq('teacher_id', p.id);
    }
    await admin.from('teacher_profiles').delete().eq('user_id', uid);
    const studs = await admin.from('students').select('id').or(`user_id.eq.${uid},parent_user_id.eq.${uid}`);
    if (!studs.error && studs.data) for (const s of studs.data) {
      await admin.from('student_intakes').delete().eq('student_id', s.id);
    }
    await admin.from('students').delete().or(`user_id.eq.${uid},parent_user_id.eq.${uid}`);
    await admin.from('onboarding_drafts').delete().eq('user_id', uid);
    await admin.from('users').delete().eq('id', uid);
  }
  if (authUser) await admin.auth.admin.deleteUser(authUser.id).then(() => {}, () => {});
}

// Create a Supabase auth user via admin client and sign in to get a session token.
// This is a dev-only fixture — in production, users sign in via Google OAuth.
async function mintSession(email, password, role, fullName) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: fullName },
  });
  if (createError) throw new Error(`admin.createUser: ${createError.message}`);

  const { data: signIn, error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session) throw new Error(`signInWithPassword: ${signInError?.message ?? 'no session'}`);

  return { authUser: created.user, token: signIn.session.access_token };
}

async function runRole(spec) {
  const flow = spec.role;
  console.log(`\n================= ${spec.role.toUpperCase()} =================`);
  await cleanupEmail(spec.email);

  // Mint a session via admin client (dev fixture, simulates Google OAuth return)
  const { authUser, token } = await mintSession(spec.email, PASSWORD, spec.role, spec.fullName);
  check(flow, 'session minted via admin client', !!token);

  // Verify removed endpoints return 404
  const signupRes = await apiCall('/api/auth/signup', { method: 'POST', body: { email: spec.email, password: PASSWORD, full_name: spec.fullName, role: spec.role } });
  check(flow, 'POST /api/auth/signup returns 404 (removed)', signupRes.status === 404, `status=${signupRes.status}`);
  const loginRes = await apiCall('/api/auth/login', { method: 'POST', body: { email: spec.email, password: PASSWORD } });
  check(flow, 'POST /api/auth/login returns 404 (removed)', loginRes.status === 404, `status=${loginRes.status}`);

  // complete-oauth-signup (assigns role + creates public.users row)
  const oauthComplete = await apiCall('/api/auth/complete-oauth-signup', {
    method: 'POST', token,
    body: { account_type: spec.accountType, full_name: spec.fullName },
  });
  check(flow, 'complete-oauth-signup 200', oauthComplete.status === 200, `status=${oauthComplete.status} ${oauthComplete.status !== 200 ? JSON.stringify(oauthComplete.json)?.slice(0, 160) : ''}`);
  const user = oauthComplete.json?.data?.user;
  check(flow, 'oauth user role correct', user?.role === spec.role, `role=${user?.role}`);
  check(flow, 'oauth user status active', user?.status === 'active');
  const userId = user?.id;

  // db single row
  const rows1 = await dbUsersByEmail(spec.email);
  check(flow, 'exactly 1 users row after oauth signup', rows1.length === 1, `count=${rows1.length}`);
  check(flow, 'db role correct', rows1[0]?.role === spec.role);

  if (spec.role === 'teacher' && userId) {
    const d = await admin.from('onboarding_drafts').select('*').eq('user_id', userId);
    check(flow, 'teacher onboarding_draft auto-created (1)', !d.error && d.data?.length === 1, d.error?.message ?? `count=${d.data?.length}`);
    check(flow, 'teacher draft not completed initially', d.data?.[0]?.onboarding_completed === false);
  }

  // /me
  const me = await apiCall('/api/auth/me', { token });
  check(flow, '/me 200', me.status === 200, `status=${me.status}`);
  check(flow, '/me role matches', me.json?.data?.user?.role === spec.role);

  // role-specific profile creation
  if (spec.role === 'student') {
    const prof = await apiCall('/api/students', { method: 'POST', token, body: { account_type: 'independent_student', full_name: spec.fullName, grade_level: 'יב' } });
    check(flow, 'student profile created (201)', prof.status === 201, `status=${prof.status} ${prof.status !== 201 ? JSON.stringify(prof.json)?.slice(0, 160) : ''}`);
    const studentId = prof.json?.data?.student_id;
    const studs = await admin.from('students').select('*').eq('user_id', userId);
    check(flow, 'students row linked via user_id (1)', !studs.error && studs.data?.length === 1, `count=${studs.data?.length}`);

    if (studentId) {
      const intake = await apiCall('/api/student-intakes', { method: 'POST', token, body: {
        student_id: studentId, subject_name: 'מתמטיקה', level: '5 יחידות', goal: 'שיפור ציונים',
        location_preference: 'online', city: 'תל אביב', budget_min: 80, budget_max: 200,
        preferred_days: [0, 2], preferred_time_ranges: [{ start: '17:00', end: '20:00' }], learning_style: 'structured',
      }});
      check(flow, 'student intake created', intake.status === 201, `status=${intake.status} ${intake.status !== 201 ? JSON.stringify(intake.json)?.slice(0, 180) : ''}`);
    }
  }

  if (spec.role === 'parent') {
    const prof = await apiCall('/api/students', { method: 'POST', token, body: { account_type: 'parent_for_child', full_name: spec.fullName, child_name: 'ילד בדיקה', grade_level: 'ח' } });
    check(flow, 'child profile created (201)', prof.status === 201, `status=${prof.status} ${prof.status !== 201 ? JSON.stringify(prof.json)?.slice(0, 160) : ''}`);
    const kids = await admin.from('students').select('*').eq('parent_user_id', userId);
    check(flow, 'child linked via parent_user_id (1)', !kids.error && kids.data?.length === 1, `count=${kids.data?.length}`);
  }

  if (spec.role === 'teacher' && userId) {
    const save = await apiCall('/api/teachers/me/onboarding', { method: 'PUT', token, body: { onboardingStep: 4, fullName: spec.fullName, hourlyRate: 150, professionalStatus: 'industry_expert' } });
    check(flow, 'teacher onboarding PUT 200', save.status === 200, `status=${save.status}`);
    const comp = await apiCall('/api/teachers/me/onboarding/complete', { method: 'POST', token, body: {
      fullName: spec.fullName, hourlyRate: 150, professionalStatus: 'industry_expert',
      legalTax: true, legalContractor: true, legalMinors: true, legalCommunity: true,
      draft: { weeklyTimeBlocks: ['ראשון-evening', 'שלישי-evening'], weeklyAvailability: [], selectedSubjects: [], teachingLevels: [] },
    }});
    check(flow, 'teacher onboarding complete 200', comp.status === 200, `status=${comp.status}`);
    const tp = await admin.from('teacher_profiles').select('*').eq('user_id', userId);
    check(flow, 'teacher_profiles created (1)', !tp.error && tp.data?.length === 1);
    if (tp.data?.[0]) {
      check(flow, 'teacher_profiles activated', tp.data[0].is_active === true);
      const av = await admin.from('availability_slots').select('*').eq('teacher_id', tp.data[0].id);
      check(flow, 'availability_slots created from draft', !av.error && (av.data?.length ?? 0) >= 1);
    }
  }

  // logout
  const lo = await apiCall('/api/auth/logout', { method: 'POST', token });
  check(flow, 'logout 200', lo.status === 200, `status=${lo.status}`);

  // re-session (via admin client, simulates returning Google OAuth user)
  const { token: token2 } = await (() => {
    return publicClient.auth.signInWithPassword({ email: spec.email, password: PASSWORD })
      .then(({ data, error }) => {
        if (error || !data.session) throw new Error('re-session failed');
        return { token: data.session.access_token };
      });
  })();
  check(flow, 're-session obtained', !!token2);

  const me2 = await apiCall('/api/auth/me', { token: token2 });
  check(flow, '/me after re-session 200', me2.status === 200);
  check(flow, '/me same user id', me2.json?.data?.user?.id === userId);
  const rows2 = await dbUsersByEmail(spec.email);
  check(flow, 'still exactly 1 users row after re-session', rows2.length === 1, `count=${rows2.length}`);

  // no duplicate profiles after re-session
  if (spec.role === 'teacher' && userId) {
    const tp2 = await admin.from('teacher_profiles').select('id').eq('user_id', userId);
    check(flow, 'teacher_profiles still single (no duplicate)', tp2.data?.length === 1);
  }
  if (spec.role === 'student' && userId) {
    const s2 = await admin.from('students').select('id').eq('user_id', userId);
    check(flow, 'student profile single (no duplicate)', s2.data?.length === 1);
  }
  if (spec.role === 'parent' && userId) {
    const c2 = await admin.from('students').select('id').eq('parent_user_id', userId);
    check(flow, 'child single (no duplicate)', c2.data?.length === 1);
  }
}

async function dbAudit() {
  console.log(`\n================= DB AUDIT =================`);
  const flow = 'db-audit';
  for (const spec of ROLES) {
    const rows = await dbUsersByEmail(spec.email);
    check(flow, `${spec.role}: single users row`, rows.length === 1, `count=${rows.length}`);
  }
  const orphan = await admin.from('students').select('id').is('user_id', null).is('parent_user_id', null);
  check(flow, 'no fully-orphan students', !orphan.error && (orphan.data?.length ?? 0) === 0);
}

async function oauthProbe() {
  console.log(`\n================= OAUTH ENDPOINT PROBE =================`);
  const flow = 'oauth';
  const good = await apiCall('/api/auth/complete-oauth-signup', { method: 'POST', token: 'invalid.jwt.token', body: { account_type: 'independent_student', full_name: 'x' } });
  check(flow, 'POST /api/auth/complete-oauth-signup exists (401 not 404)', good.status === 401, `status=${good.status}`);
}

async function main() {
  const h = await apiCall('/health');
  check('env', 'backend /health reachable', h.status === 200, `status=${h.status}`);
  for (const spec of ROLES) {
    try { await runRole(spec); } catch (e) { check(spec.role, 'flow completed without throwing', false, e.message); }
  }
  await dbAudit();
  await oauthProbe();

  if (process.env.KEEP !== '1') {
    console.log('\nCleaning up test accounts...');
    for (const spec of ROLES) { try { await cleanupEmail(spec.email); } catch { /* ignore */ } }
  } else console.log('\nKEEP=1 — leaving test accounts for inspection.');

  const total = results.length, passed = results.filter((r) => r.pass).length;
  console.log(`\n================= SUMMARY =================`);
  const byFlow = {};
  for (const r of results) {
    byFlow[r.flow] ??= { pass: 0, fail: 0, fails: [] };
    if (r.pass) byFlow[r.flow].pass++; else { byFlow[r.flow].fail++; byFlow[r.flow].fails.push(`${r.name}${r.detail ? ' (' + r.detail + ')' : ''}`); }
  }
  for (const [f, s] of Object.entries(byFlow)) {
    console.log(`${f}: ${s.pass} pass / ${s.fail} fail`);
    for (const x of s.fails) console.log(`    FAIL: ${x}`);
  }
  console.log(`\nTOTAL: ${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}
main().catch((e) => { console.error('FATAL', e); process.exit(2); });
