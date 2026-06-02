// End-to-end verification of the full StudyBuddy.02 product lifecycle against a
// live backend + Supabase. Walks: teacher signup -> onboarding complete -> weekly
// availability -> parent signup + child -> student intake -> matching -> booking
// request -> teacher approves (lesson created) -> teacher completes lesson (note +
// homework) -> parent dashboard reflects it -> parent approves confirmation ->
// parent updates a homework task.
//
// Requirements:
//   - backend running (default http://127.0.0.1:4000, override with BACKEND_URL)
//   - apps/backend/.env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEV_AUTH_BYPASS=true
//   - DATABASE_URL must REACH the DB (use the IPv4 pooler URL if your network lacks IPv6);
//     matching/booking/lessons use SQL transactions and will fail otherwise.
//   - migration 014_parent_dashboard.sql applied (creates lesson_confirmations + homework_tasks);
//     lesson-complete and the parent dashboard need it.
//   - demo teachers/subjects seeded helps matching find candidates: `npm run db:seed:demo`.
//
// Run: STUDYBUDDY_ENV=development node scripts/verify-lifecycle-e2e.mjs
// Exit code 0 = every step passed; 1 = a step failed (the log shows exactly which).

import { createClient } from '@supabase/supabase-js';
import {
  assertDemoSeedAllowed,
  classifyEnvironment,
  parseSeedArgs,
  readBackendEnv,
} from './seed-utils.mjs';

const backendBaseUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:4000';
const password = 'StudyBuddyLifecycle123!';
const stamp = Date.now();

function requireValue(env, key) {
  const value = env[key] ?? process.env[key];
  if (!value) throw new Error(`${key} is required (set it in apps/backend/.env)`);
  return value;
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${backendBaseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// ── Step runner: logs PASS/FAIL, halts on first failure ───────────────────────
let stepNo = 0;
const passed = [];
function ok(label, detail = '') {
  stepNo += 1;
  passed.push(label);
  console.log(`  ✓ ${String(stepNo).padStart(2)}. ${label}${detail ? ' — ' + detail : ''}`);
}
function fail(label, res, hint = '') {
  stepNo += 1;
  console.log(`  ✗ ${String(stepNo).padStart(2)}. ${label}`);
  console.log(`      status=${res?.status} body=${JSON.stringify(res?.json)?.slice(0, 300)}`);
  if (hint) console.log(`      hint: ${hint}`);
  console.log(`\n${passed.length} step(s) passed before this failure.`);
  process.exit(1);
}
function expect(label, res, wantStatus, pick, hint) {
  if (res.status !== wantStatus) fail(label, res, hint);
  const value = pick ? pick(res.json?.data) : undefined;
  ok(label, value !== undefined ? JSON.stringify(value).slice(0, 80) : '');
  return res.json?.data;
}

// Next calendar date (>= 7 days out) that falls on `dow` (0=Sun..6=Sat), at HH:00 UTC.
function nextDateForDow(dow, hour) {
  const base = new Date(stamp + 7 * 24 * 3600 * 1000);
  while (base.getUTCDay() !== dow) base.setUTCDate(base.getUTCDate() + 1);
  base.setUTCHours(hour, 0, 0, 0);
  return base;
}

// pubClient is set in main() after reading env
let _pubClient;
async function createUser(admin, role, fullName, tag) {
  const email = `lifecycle-${tag}-${stamp}@example.com`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, is_demo: true, seed_type: 'lifecycle_e2e' },
    user_metadata: { full_name: fullName, dev_seed: true, dev_seed_type: 'lifecycle_e2e' },
  });
  if (error) throw new Error(`create ${role} user failed: ${error.message}`);
  // Sign in via Supabase client directly (dev fixture — app login endpoint removed)
  const { data: session, error: sessionErr } = await _pubClient.auth.signInWithPassword({ email, password });
  const token = session?.session?.access_token;
  if (!token) throw new Error(`signIn ${role} failed: ${sessionErr?.message ?? 'no session'}`);
  // Call complete-oauth-signup to create the public.users row
  const accountType = role === 'parent' ? 'parent_for_child' : 'independent_student';
  const oauthRes = await api('/api/auth/complete-oauth-signup', { method: 'POST', token, body: { account_type: accountType, full_name: fullName } });
  if (oauthRes.status !== 200) throw new Error(`complete-oauth-signup ${role} failed: ${JSON.stringify(oauthRes.json)}`);
  return { email, token, userId: oauthRes.json.data.user.id };
}

async function main() {
  const env = readBackendEnv();
  const supabaseUrl = requireValue(env, 'SUPABASE_URL');
  const serviceRoleKey = requireValue(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const args = parseSeedArgs();
  const envInfo = classifyEnvironment(env, supabaseUrl, args);
  assertDemoSeedAllowed({
    scriptName: 'verify-lifecycle-e2e',
    envInfo,
    supabaseUrl,
    args: { ...args, allowRemoteDevSeed: args.allowRemoteDevSeed || envInfo.kind === 'development' || envInfo.kind === 'staging' },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const anonKey = env.SUPABASE_ANON_KEY ?? serviceRoleKey;
  _pubClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log(`\nStudyBuddy.02 lifecycle E2E  ->  ${backendBaseUrl}\n`);

  // 0. A unique subject so matching resolves to OUR teacher only (not the seeded
  //    demo teachers). Created with the service role; cleaned-style demo marker.
  const subjectName = `Lifecycle Subject ${stamp}`;
  const { error: subjErr } = await admin.from('subjects').insert({ name: subjectName, is_active: true });
  if (subjErr) throw new Error(`create unique subject failed: ${subjErr.message}`);
  ok('unique subject created', subjectName);

  // 1. Teacher: signup + complete onboarding (creates an active teacher_profile)
  const teacher = await createUser(admin, 'teacher', 'Lifecycle Teacher', 'teacher');
  ok('teacher signup + login', teacher.email);
  const onboard = await api('/api/teachers/me/onboarding/complete', {
    method: 'POST',
    token: teacher.token,
    body: {
      fullName: 'Lifecycle Teacher',
      hourlyRate: 120,
      // Non-academic status so onboarding does not require academic institution/field refs.
      // (The 4 academic statuses — student_instructor/certified_teacher/academic_assistant/
      //  excellent_courses — require academicInstitutionId + academicFieldId in the draft.)
      professionalStatus: 'private_tutor',
      legalTax: true,
      legalContractor: true,
      legalMinors: true,
      legalCommunity: true,
      // weeklyAvailability left empty so we create the slot explicitly below and
      // control its timing (so the later booking request aligns with it).
      draft: { selectedSubjects: [subjectName], teachingLevels: ['תיכון'], weeklyAvailability: [] },
    },
  });
  const teacherProfileId = expect('teacher onboarding complete', onboard, 200, (d) => ({ teacherProfileId: d?.teacherProfileId }))?.teacherProfileId;

  // Matching only considers verified+active teachers; onboarding leaves is_verified=false
  // (verification is an admin action). Mark our teacher verified so it is matchable.
  const { error: verErr } = await admin.from('teacher_profiles').update({ is_verified: true }).eq('id', teacherProfileId);
  if (verErr) throw new Error(`verify teacher_profile failed: ${verErr.message}`);
  ok('teacher profile marked verified (admin)', teacherProfileId);

  // 2. Teacher: weekly availability slot (Sunday 17:00-21:00)
  const slot = await api('/api/teacher-availability', {
    method: 'POST',
    token: teacher.token,
    body: { day_of_week: 0, start_time: '17:00', end_time: '21:00' },
  });
  if (slot.status !== 201 && slot.status !== 200) fail('teacher creates availability slot', slot);
  ok('teacher creates availability slot', 'Sunday 17:00-21:00');

  // 3. Parent: signup + child profile
  const parent = await createUser(admin, 'parent', 'Lifecycle Parent', 'parent');
  ok('parent signup + login', parent.email);
  const student = await api('/api/students', {
    method: 'POST',
    token: parent.token,
    body: { account_type: 'parent_for_child', child_name: 'Lifecycle Child', grade_level: 'high' },
  });
  const studentId = expect('parent creates child profile', student, 201, (d) => ({ student_id: d?.student_id }))?.student_id
    ?? expect('parent creates child profile (200)', student, 200, (d) => ({ student_id: d?.student_id }))?.student_id;

  // 4. Student intake
  const intake = await api('/api/student-intakes', {
    method: 'POST',
    token: parent.token,
    body: {
      student_id: studentId,
      subject_name: subjectName,
      location_preference: 'online',
      preferred_days: [0, 1],
      preferred_time_ranges: [{ start: '17:00', end: '21:00' }],
      goal: 'ongoing',
      budget_min: 80,
      budget_max: 200,
      learning_style: 'structured',
    },
  });
  const intakeId = expect('student intake created', intake, 201, (d) => ({ intake_id: d?.intake_id }))?.intake_id
    ?? intake.json?.data?.intake_id;
  if (!intakeId) fail('student intake created', intake);

  // 5. Matching (TRANSACTION — needs reachable DATABASE_URL)
  const match = await api(`/api/matching/${intakeId}/run`, { method: 'POST', token: parent.token });
  const matches = expect('matching run returns ranked matches (<=3)', match, 200, (d) => ({ count: d?.matches?.length }), 'needs DATABASE_URL reachable (use the IPv4 pooler URL)')?.matches;
  if (!matches?.length) fail('matching produced at least one match', match, 'run `npm run db:seed:demo` so verified teachers exist for the subject');
  // Use the match for OUR teacher (unique subject => should be the only/first match).
  const ourMatch = matches.find((m) => m.teacherId === teacherProfileId);
  if (!ourMatch) fail('our teacher is among the matches', match, 'expected the unique-subject teacher to match');
  const matchResultId = ourMatch.id;

  // 6. Booking request on the top match, aligned to the Sunday 17:00-18:00 slot
  const start = nextDateForDow(0, 17);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const booking = await api('/api/booking-requests', {
    method: 'POST',
    token: parent.token,
    body: {
      match_result_id: matchResultId,
      requested_start_at: start.toISOString(),
      requested_end_at: end.toISOString(),
      student_message: 'Lifecycle E2E booking',
    },
  });
  const bookingId = expect('parent creates booking request', booking, 201, (d) => ({ id: d?.booking_request?.id, status: d?.booking_request?.status }), 'booking uses a DB transaction (needs reachable DATABASE_URL)')?.id
    ?? booking.json?.data?.booking_request?.id;
  if (!bookingId) fail('parent creates booking request', booking);

  // 7. Teacher sees it in the inbox, then approves -> lesson created
  const inbox = await api('/api/booking-requests', { token: teacher.token });
  expect('teacher lists booking inbox', inbox, 200, (d) => ({ count: d?.booking_requests?.length }));
  const respond = await api(`/api/booking-requests/${bookingId}/respond`, {
    method: 'POST',
    token: teacher.token,
    body: { response: 'approve', teacher_response_message: 'See you Sunday' },
  });
  const lesson = expect('teacher approves -> lesson created', respond, 200, (d) => ({ lesson_id: d?.lesson?.id, status: d?.lesson?.status }), 'booking approval is transactional (needs reachable DATABASE_URL)')?.lesson;
  if (!lesson?.id) fail('approval produced a scheduled lesson', respond);
  const lessonId = lesson.id;

  // 8. Teacher completes the lesson with a note + homework (needs migration 014)
  const complete = await api(`/api/lessons/${lessonId}/complete`, {
    method: 'POST',
    token: teacher.token,
    body: { summary: 'Covered linear equations; solid progress.', homework_tasks: ['Exercises 1-5 p.47', 'Review notes'] },
  });
  const completed = expect('teacher completes lesson (note + homework)', complete, 200, (d) => ({ confirmation: d?.confirmation?.id, tasks: d?.tasks?.length }), 'needs migration 014 (lesson_confirmations + homework_tasks) AND reachable DATABASE_URL');
  const confirmationId = completed?.confirmation?.id;
  const taskId = completed?.tasks?.[0]?.id;

  // 9. Parent dashboard reflects the lesson/homework/confirmation
  const dash = await api(`/api/parents/me/dashboard?studentId=${studentId}`, { token: parent.token });
  expect('parent dashboard loads', dash, 200, (d) => ({ recent: d?.recent_lessons?.length, hasConfirmation: !!d?.pending_confirmation }), 'parent dashboard reads lesson_confirmations + homework_tasks (needs migration 014)');

  // 10. Parent approves the confirmation
  if (confirmationId) {
    const approve = await api(`/api/parents/me/lesson-confirmations/${confirmationId}/approve`, { method: 'POST', token: parent.token });
    expect('parent approves lesson confirmation', approve, 200, (d) => ({ status: d?.confirmation?.status }));
  } else {
    fail('parent approves lesson confirmation', complete, 'no confirmation id returned by lesson-complete (check migration 014)');
  }

  // 11. Parent updates a homework task
  if (taskId) {
    const hw = await api(`/api/parents/me/homework-tasks/${taskId}`, { method: 'PATCH', token: parent.token, body: { status: 'completed' } });
    expect('parent marks homework completed', hw, 200, (d) => ({ status: d?.task?.status }));
  } else {
    fail('parent marks homework completed', complete, 'no homework task id returned by lesson-complete');
  }

  console.log(`\n✅ LIFECYCLE PASSED — ${stepNo}/${stepNo} steps green.\n`);
}

main().catch((err) => {
  console.error('\nUnexpected error:', err.message);
  process.exit(1);
});
