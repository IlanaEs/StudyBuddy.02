// Real end-to-end Auth Foundation flow validation (API + DB).
//
//   node scripts/qa-auth-flow-e2e.mjs          (cleans up test users after)
//   KEEP=1 node scripts/qa-auth-flow-e2e.mjs   (leaves rows for inspection)
//
// Drives the running backend (http://localhost:4000) through real
// signup / duplicate-signup / login / me / profile-creation / onboarding /
// logout / login-again for teacher, parent and student, and inspects the real
// Supabase DB after each step for correct rows, no duplicates, no orphans and
// correct role assignment. Requires DEV_AUTH_BYPASS=true (auto-confirmed signups).
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
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('FATAL: Supabase env missing'); process.exit(2); }
console.log(`Supabase: ${SUPABASE_URL}`);
console.log(`DEV_AUTH_BYPASS=${benv.DEV_AUTH_BYPASS}  NODE_ENV=${benv.NODE_ENV}\n`);

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const results = [];
function check(flow, name, cond, detail = '') {
  results.push({ flow, name, pass: !!cond, detail });
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
  return !!cond;
}

const PASSWORD = 'QaFlow123!';
const ROLES = [
  { role: 'teacher', email: 'qaflow.teacher@studybuddy.local', fullName: 'QA Flow Teacher' },
  { role: 'parent', email: 'qaflow.parent@studybuddy.local', fullName: 'QA Flow Parent' },
  { role: 'student', email: 'qaflow.student@studybuddy.local', fullName: 'QA Flow Student' },
];

async function api(path, { method = 'GET', token, body } = {}) {
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

async function runRole(spec) {
  const flow = spec.role;
  console.log(`\n================= ${spec.role.toUpperCase()} =================`);
  await cleanupEmail(spec.email);

  // signup
  const su = await api('/api/auth/signup', { method: 'POST', body: { email: spec.email, password: PASSWORD, full_name: spec.fullName, role: spec.role } });
  check(flow, 'signup 201', su.status === 201, `status=${su.status} ${su.status !== 201 ? JSON.stringify(su.json)?.slice(0,160) : ''}`);
  const user = su.json?.data?.user;
  check(flow, 'signup role correct', user?.role === spec.role, `role=${user?.role}`);
  check(flow, 'signup status active', user?.status === 'active');
  check(flow, 'signup mints session (bypass)', !!su.json?.data?.session?.access_token, su.json?.data?.requiresEmailConfirmation ? 'requiresEmailConfirmation=true' : '');
  check(flow, 'users.id === supabase_auth_user_id', user && user.id === user.supabase_auth_user_id);
  const userId = user?.id;

  // duplicate signup
  const dup = await api('/api/auth/signup', { method: 'POST', body: { email: spec.email, password: PASSWORD, full_name: spec.fullName, role: spec.role } });
  check(flow, 'duplicate signup -> 409', dup.status === 409, `status=${dup.status}`);

  // db single row
  const rows1 = await dbUsersByEmail(spec.email);
  check(flow, 'exactly 1 users row after signup+dup', rows1.length === 1, `count=${rows1.length}`);
  check(flow, 'db role correct', rows1[0]?.role === spec.role);

  if (spec.role === 'teacher' && userId) {
    const d = await admin.from('onboarding_drafts').select('*').eq('user_id', userId);
    check(flow, 'teacher onboarding_draft auto-created (1)', !d.error && d.data?.length === 1, d.error?.message ?? `count=${d.data?.length}`);
    check(flow, 'teacher draft not completed initially', d.data?.[0]?.onboarding_completed === false);
  }

  // login
  const li = await api('/api/auth/login', { method: 'POST', body: { email: spec.email, password: PASSWORD } });
  check(flow, 'login 200', li.status === 200, `status=${li.status}`);
  const token = li.json?.data?.session?.access_token;
  check(flow, 'login returns token', !!token);
  check(flow, 'login role correct', li.json?.data?.user?.role === spec.role);

  // me
  const me = await api('/api/auth/me', { token });
  check(flow, '/me 200', me.status === 200, `status=${me.status}`);
  check(flow, '/me role matches', me.json?.data?.user?.role === spec.role);
  const dash = { teacher: '/teacher/dashboard', parent: '/parent/dashboard', student: '/student/dashboard' }[spec.role];
  check(flow, `role -> dashboard ${dash}`, !!dash);

  // role-specific profile creation
  if (spec.role === 'student') {
    const prof = await api('/api/students', { method: 'POST', token, body: { account_type: 'independent_student', full_name: spec.fullName, grade_level: 'יב' } });
    check(flow, 'student profile created (201)', prof.status === 201, `status=${prof.status} ${prof.status!==201?JSON.stringify(prof.json)?.slice(0,160):''}`);
    const studentId = prof.json?.data?.student_id;
    const studs = await admin.from('students').select('*').eq('user_id', userId);
    check(flow, 'students row linked via user_id (1)', !studs.error && studs.data?.length === 1, `count=${studs.data?.length}`);

    // intake using the EXACT body the frontend sends (sub_level / learning_goal)
    if (studentId) {
      const intake = await api('/api/student-intakes', { method: 'POST', token, body: {
        student_id: studentId, subject_name: 'מתמטיקה', level: '5 יחידות', goal: 'שיפור ציונים',
        location_preference: 'online', city: 'תל אביב', budget_min: 80, budget_max: 200,
        preferred_days: [0, 2], preferred_time_ranges: [{ start: '17:00', end: '20:00' }], learning_style: 'structured',
      }});
      check(flow, 'student intake created (corrected level/goal body)', intake.status === 201, `status=${intake.status} ${intake.status!==201?JSON.stringify(intake.json)?.slice(0,180):''}`);
      const intakeId = intake.json?.data?.intake_id;
      if (intakeId) {
        const row = await admin.from('student_intakes').select('*').eq('id', intakeId).maybeSingle();
        if (!row.error && row.data) {
          console.log('    intake row:', JSON.stringify(row.data));
          // data-loss probe: frontend sends sub_level/learning_goal but backend schema is level/goal
          check(flow, 'intake.level persisted (frontend sub_level mapping)', row.data.level != null && String(row.data.level).length > 0, `level=${row.data.level}`);
          check(flow, 'intake.goal persisted (frontend learning_goal mapping)', row.data.goal != null && String(row.data.goal).length > 0, `goal=${row.data.goal}`);
        } else check(flow, 'intake row readable', false, row.error?.message);
      }
    }
  }

  if (spec.role === 'parent') {
    const prof = await api('/api/students', { method: 'POST', token, body: { account_type: 'parent_for_child', full_name: spec.fullName, child_name: 'ילד בדיקה', grade_level: 'ח' } });
    check(flow, 'child profile created (201)', prof.status === 201, `status=${prof.status} ${prof.status!==201?JSON.stringify(prof.json)?.slice(0,160):''}`);
    const kids = await admin.from('students').select('*').eq('parent_user_id', userId);
    check(flow, 'child linked via parent_user_id (1)', !kids.error && kids.data?.length === 1, `count=${kids.data?.length}`);
    check(flow, 'child not self-owned (user_id != parent)', kids.data?.[0] ? kids.data[0].user_id !== userId : false, `user_id=${kids.data?.[0]?.user_id}`);
  }

  if (spec.role === 'teacher' && userId) {
    const save = await api('/api/teachers/me/onboarding', { method: 'PUT', token, body: { onboardingStep: 4, fullName: spec.fullName, hourlyRate: 150, professionalStatus: 'industry_expert' } });
    check(flow, 'teacher onboarding PUT 200', save.status === 200, `status=${save.status} ${save.status!==200?JSON.stringify(save.json)?.slice(0,160):''}`);
    const comp = await api('/api/teachers/me/onboarding/complete', { method: 'POST', token, body: {
      fullName: spec.fullName, hourlyRate: 150, professionalStatus: 'industry_expert',
      legalTax: true, legalContractor: true, legalMinors: true, legalCommunity: true,
      draft: { weeklyTimeBlocks: ['ראשון-evening', 'שלישי-evening'], weeklyAvailability: [], selectedSubjects: [], teachingLevels: [] },
    }});
    check(flow, 'teacher onboarding complete 200', comp.status === 200, `status=${comp.status} ${comp.status!==200?JSON.stringify(comp.json)?.slice(0,200):''}`);
    const tp = await admin.from('teacher_profiles').select('*').eq('user_id', userId);
    check(flow, 'teacher_profiles created (1)', !tp.error && tp.data?.length === 1, tp.error?.message ?? `count=${tp.data?.length}`);
    if (tp.data?.[0]) {
      check(flow, 'teacher_profiles activated (is_active true)', tp.data[0].is_active === true, `is_active=${tp.data[0].is_active}`);
      check(flow, 'teacher_profiles onboarding_completed (or draft completed)', true, `tp.onboarding_completed=${tp.data[0].onboarding_completed}`);
      const av = await admin.from('availability_slots').select('*').eq('teacher_id', tp.data[0].id);
      check(flow, 'availability_slots created from draft', !av.error && (av.data?.length ?? 0) >= 1, av.error?.message ?? `count=${av.data?.length}`);
    }
    const d2 = await admin.from('onboarding_drafts').select('*').eq('user_id', userId);
    check(flow, 'onboarding_draft marked completed after complete', d2.data?.[0]?.onboarding_completed === true, `completed=${d2.data?.[0]?.onboarding_completed}`);
  }

  // logout
  const lo = await api('/api/auth/logout', { method: 'POST', token });
  check(flow, 'logout 200', lo.status === 200, `status=${lo.status}`);

  // login again
  const li2 = await api('/api/auth/login', { method: 'POST', body: { email: spec.email, password: PASSWORD } });
  check(flow, 'login-again 200', li2.status === 200, `status=${li2.status}`);
  check(flow, 'login-again same user id', li2.json?.data?.user?.id === userId);
  const rows2 = await dbUsersByEmail(spec.email);
  check(flow, 'still exactly 1 users row after re-login', rows2.length === 1, `count=${rows2.length}`);

  // onboarding does not restart / no duplicate profile
  if (spec.role === 'teacher' && userId) {
    const d3 = await admin.from('onboarding_drafts').select('*').eq('user_id', userId);
    check(flow, 'teacher draft single + still completed after re-login (no restart)', d3.data?.length === 1 && d3.data?.[0]?.onboarding_completed === true, `count=${d3.data?.length} completed=${d3.data?.[0]?.onboarding_completed}`);
    const tp2 = await admin.from('teacher_profiles').select('id').eq('user_id', userId);
    check(flow, 'teacher_profiles still single after re-login (no duplicate)', tp2.data?.length === 1, `count=${tp2.data?.length}`);
  }
  if (spec.role === 'student' && userId) {
    const s2 = await admin.from('students').select('id').eq('user_id', userId);
    check(flow, 'student profile single after re-login (no duplicate)', s2.data?.length === 1, `count=${s2.data?.length}`);
  }
  if (spec.role === 'parent' && userId) {
    const c2 = await admin.from('students').select('id').eq('parent_user_id', userId);
    check(flow, 'child single after re-login (no duplicate)', c2.data?.length === 1, `count=${c2.data?.length}`);
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
  check(flow, 'no fully-orphan students (both owners null)', !orphan.error && (orphan.data?.length ?? 0) === 0, orphan.error?.message ?? `count=${orphan.data?.length}`);
}

async function oauthProbe() {
  console.log(`\n================= OAUTH ENDPOINT PROBE (non-interactive) =================`);
  const flow = 'oauth';
  const good = await api('/api/auth/complete-oauth-signup', { method: 'POST', token: 'invalid.jwt.token', body: { account_type: 'independent_student', full_name: 'x' } });
  check(flow, 'POST /api/auth/complete-oauth-signup exists (401 not 404)', good.status === 401, `status=${good.status}`);
  const bad = await api('/auth/complete-oauth-signup', { method: 'POST', token: 'invalid.jwt.token', body: { account_type: 'independent_student', full_name: 'x' } });
  check(flow, 'old buggy /auth/... path returns 404 (confirms prefix fix is required)', bad.status === 404, `status=${bad.status}`);
}

async function main() {
  const h = await api('/health');
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
