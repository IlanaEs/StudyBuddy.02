// Focused probe for the BRAND-NEW (no-role) Google account path + teacher
// calendar sync 500 regression. Unlike qa-auth-flow-e2e.mjs (which pre-sets
// app_metadata.role, exercising the returning path), this mints a user with NO
// role to reproduce the exact fresh-account state my fixes target:
//   valid Supabase session, no role, no local user → /me 403 (not 401/500)
//   → complete-oauth-signup 200 (un-gated, self-authenticating) → /me 200
//   → teacher calendar status/busy-slots/sync return clean non-500.
//
//   node scripts/qa-fresh-provision-probe.mjs
//
// Operates only on qaprobe.* @studybuddy.local accounts; cleans up before+after.

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

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = createClient(SUPABASE_URL, ANON_KEY ?? SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const results = [];
function check(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
  return !!cond;
}

const PASSWORD = 'QaProbe123!';
const SPECS = [
  { label: 'FRESH TEACHER', email: 'qaprobe.teacher@studybuddy.local', fullName: 'QA Probe Teacher', accountType: 'teacher', role: 'teacher' },
  { label: 'FRESH STUDENT', email: 'qaprobe.student@studybuddy.local', fullName: 'QA Probe Student', accountType: 'independent_student', role: 'student' },
];

async function apiCall(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { status: res.status, json };
}

async function cleanup(email) {
  // find auth user
  let authUser = null;
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    authUser = data.users.find((x) => (x.email ?? '').toLowerCase() === email.toLowerCase());
    if (authUser || data.users.length < 200) break;
  }
  const { data: rows } = await admin.from('users').select('id').eq('email', email);
  const ids = new Set((rows ?? []).map((r) => r.id));
  if (authUser) ids.add(authUser.id);
  for (const uid of ids) {
    const tp = await admin.from('teacher_profiles').select('id').eq('user_id', uid);
    if (tp.data) for (const p of tp.data) {
      await admin.from('availability_slots').delete().eq('teacher_id', p.id);
      await admin.from('teacher_subjects').delete().eq('teacher_id', p.id);
    }
    await admin.from('teacher_profiles').delete().eq('user_id', uid);
    await admin.from('students').delete().or(`user_id.eq.${uid},parent_user_id.eq.${uid}`);
    await admin.from('onboarding_drafts').delete().eq('user_id', uid);
    await admin.from('users').delete().eq('id', uid);
  }
  if (authUser) await admin.auth.admin.deleteUser(authUser.id).then(() => {}, () => {});
}

// Mint a session for a user with NO app_metadata.role — the genuinely-fresh state.
async function mintNoRoleSession(email, fullName) {
  const { error: createError } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    app_metadata: {},                       // <-- no role
    user_metadata: { full_name: fullName },
  });
  if (createError) throw new Error(`admin.createUser: ${createError.message}`);
  const { data: signIn, error } = await publicClient.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !signIn.session) throw new Error(`signInWithPassword: ${error?.message ?? 'no session'}`);
  return signIn.session.access_token;
}

async function runSpec(spec) {
  console.log(`\n================= ${spec.label} (no role yet) =================`);
  await cleanup(spec.email);
  const token = await mintNoRoleSession(spec.email, spec.fullName);
  check('valid Supabase session minted (no role)', !!token);

  // 1) /me on a valid-but-unprovisioned token → 403 (NOT 401, NOT 500)
  const me1 = await apiCall('/api/auth/me', { token });
  check('/me on fresh no-role token → 403 not-provisioned', me1.status === 403, `status=${me1.status} ${JSON.stringify(me1.json)?.slice(0,120)}`);
  check('/me fresh is NOT 401 (not a stale-session purge)', me1.status !== 401, `status=${me1.status}`);
  check('/me fresh is NOT 500', me1.status !== 500, `status=${me1.status}`);

  // 2) complete-oauth-signup with the SAME token → 200 (un-gated, provisions)
  const oc = await apiCall('/api/auth/complete-oauth-signup', { method: 'POST', token, body: { account_type: spec.accountType, full_name: spec.fullName } });
  check('complete-oauth-signup on no-role token → 200', oc.status === 200, `status=${oc.status} ${oc.status !== 200 ? JSON.stringify(oc.json)?.slice(0,140) : ''}`);
  check('provisioned role correct', oc.json?.data?.user?.role === spec.role, `role=${oc.json?.data?.user?.role}`);
  const userId = oc.json?.data?.user?.id;

  // 3) /me again → 200 (now provisioned)
  const me2 = await apiCall('/api/auth/me', { token });
  check('/me after provisioning → 200', me2.status === 200, `status=${me2.status}`);
  check('/me role matches after provisioning', me2.json?.data?.user?.role === spec.role, `role=${me2.json?.data?.user?.role}`);

  // 4) idempotent: calling complete-oauth-signup again with same track → 200 (returning user)
  const oc2 = await apiCall('/api/auth/complete-oauth-signup', { method: 'POST', token, body: { account_type: spec.accountType, full_name: spec.fullName } });
  check('complete-oauth-signup idempotent (returning) → 200', oc2.status === 200, `status=${oc2.status}`);

  // 5) Teacher calendar: the 500 regression path. No teacher_profiles row exists
  //    yet (created only at completion), so these formerly threw 500.
  if (spec.role === 'teacher') {
    const st = await apiCall('/api/teachers/me/calendar/status', { token });
    check('calendar/status (no profile row) → 200 not 500', st.status === 200, `status=${st.status}`);
    check('calendar/status reports not_connected', st.json?.data?.status === 'not_connected', `status=${st.json?.data?.status}`);

    const bs = await apiCall('/api/teachers/me/calendar/busy-slots', { token });
    check('calendar/busy-slots (no profile row) → 200 not 500', bs.status === 200, `status=${bs.status}`);

    // sync with a bogus provider token: Google rejects it → clean 401/403/502,
    // NEVER a 500. (A real success needs a real Google token from the browser.)
    const sync = await apiCall('/api/teachers/me/calendar/sync', { method: 'POST', token, headers: { 'X-Provider-Token': 'bogus-google-token' } });
    check('calendar/sync with bad token → clean non-500', sync.status !== 500, `status=${sync.status} ${JSON.stringify(sync.json)?.slice(0,120)}`);
    check('calendar/sync error is 401/403/502 (mapped, not 500)', [401, 403, 502].includes(sync.status), `status=${sync.status}`);
  }

  await cleanup(spec.email);
}

async function main() {
  const h = await apiCall('/health');
  check('backend /health reachable', h.status === 200, `status=${h.status}`);
  for (const spec of SPECS) {
    try { await runSpec(spec); } catch (e) { check(`${spec.label} completed without throwing`, false, e.message); }
  }
  const total = results.length, passed = results.filter((r) => r.pass).length;
  console.log(`\n================= SUMMARY =================`);
  for (const r of results.filter((r) => !r.pass)) console.log(`    FAIL: ${r.name}${r.detail ? ' (' + r.detail + ')' : ''}`);
  console.log(`\nTOTAL: ${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}
main().catch((e) => { console.error('FATAL', e); process.exit(2); });
