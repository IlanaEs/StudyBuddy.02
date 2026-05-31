import { createClient } from '@supabase/supabase-js';
import {
  assertDemoSeedAllowed,
  classifyEnvironment,
  hasColumn,
  parseSeedArgs,
  readBackendEnv,
} from './seed-utils.mjs';

const backendBaseUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:4000';
const password = 'StudyBuddyQa123!';
const stamp = Date.now();

function requireValue(env, key) {
  const value = env[key] ?? process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
}

async function api(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

async function createAuthUser(admin, kind, role, fullName) {
  const email = `qa-final-${kind}-${stamp}@example.com`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, is_demo: true, seed_type: 'matching_e2e' },
    user_metadata: { full_name: fullName, dev_seed: true, dev_seed_type: 'matching_e2e' },
  });
  if (error) throw new Error(`createAuthUser ${kind} failed: ${error.message}`);
  return email;
}

async function fetchTable(supabaseUrl, serviceRoleKey, table, query) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  return response.json();
}

async function runFlow({ admin, supabaseUrl, serviceRoleKey, kind, role, profileBody }) {
  const fullName = role === 'parent' ? 'QA Final Parent' : 'QA Final Student';
  const email = await createAuthUser(admin, kind, role, fullName);
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const token = login.json?.data?.session?.access_token;
  const localUserId = login.json?.data?.user?.id;

  if (localUserId && await hasColumn(admin, 'users', 'is_demo')) {
    await admin.from('users').update({ is_demo: true }).eq('id', localUserId);
  }

  const profile = await api('/api/students', {
    method: 'POST',
    token,
    body: profileBody,
  });
  const studentId = profile.json?.data?.student_id;

  const intake = await api('/api/student-intakes', {
    method: 'POST',
    token,
    body: {
      student_id: studentId,
      subject_name: 'מתמטיקה',
      location_preference: 'online',
      preferred_days: [0, 1],
      preferred_time_ranges: [{ start: '17:00', end: '22:00' }],
      learning_goal: 'ongoing',
      budget_min: 80,
      budget_max: 160,
      learning_style: 'structured',
    },
  });
  const intakeId = intake.json?.data?.intake_id;

  const firstRun = await api(`/api/matching/${intakeId}/run`, {
    method: 'POST',
    token,
  });
  const secondRun = await api(`/api/matching/${intakeId}/run`, {
    method: 'POST',
    token,
  });

  const [studentRows, intakeRows, matchRows] = await Promise.all([
    fetchTable(
      supabaseUrl,
      serviceRoleKey,
      'students',
      `id=eq.${studentId}&select=id,user_id,parent_user_id,full_name`,
    ),
    fetchTable(
      supabaseUrl,
      serviceRoleKey,
      'student_intakes',
      `id=eq.${intakeId}&select=id,student_id,subject_id,status,preferred_days,preferred_time_ranges`,
    ),
    fetchTable(
      supabaseUrl,
      serviceRoleKey,
      'match_results',
      `intake_id=eq.${intakeId}&select=id,teacher_id,rank,match_score,reason,teacher_profiles(id,user_id,is_verified,is_active)&order=rank.asc`,
    ),
  ]);

  return {
    login: {
      status: login.status,
      role: login.json?.data?.user?.role,
      hasToken: !!token,
    },
    profile: {
      status: profile.status,
      data: profile.json?.data,
      error: profile.json?.error,
    },
    intake: {
      status: intake.status,
      data: intake.json?.data,
      error: intake.json?.error,
    },
    firstRun: {
      status: firstRun.status,
      matchCount: firstRun.json?.data?.matches?.length ?? 0,
      ranks: firstRun.json?.data?.matches?.map((match) => match.rank) ?? [],
      teacherNames: firstRun.json?.data?.matches?.map((match) => match.teacherFullName) ?? [],
      scores: firstRun.json?.data?.matches?.map((match) => match.matchScore) ?? [],
      fallback: firstRun.json?.data?.fallbackPhaseUsed,
      error: firstRun.json?.error,
    },
    secondRun: {
      status: secondRun.status,
      matchCount: secondRun.json?.data?.matches?.length ?? 0,
      ranks: secondRun.json?.data?.matches?.map((match) => match.rank) ?? [],
      error: secondRun.json?.error,
    },
    db: {
      studentRows,
      intakeRows,
      matchRows,
    },
  };
}

const env = readBackendEnv();
const supabaseUrl = requireValue(env, 'SUPABASE_URL');
const serviceRoleKey = requireValue(env, 'SUPABASE_SERVICE_ROLE_KEY');
const args = parseSeedArgs();
const envInfo = classifyEnvironment(env, supabaseUrl, args);
assertDemoSeedAllowed({
  scriptName: 'verify-matching-e2e',
  envInfo,
  supabaseUrl,
  args: { ...args, allowRemoteDevSeed: args.allowRemoteDevSeed || envInfo.kind === 'development' || envInfo.kind === 'staging' },
});
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const output = {
  backendBaseUrl,
  independentStudent: await runFlow({
    admin,
    supabaseUrl,
    serviceRoleKey,
    kind: 'student',
    role: 'student',
    profileBody: {
      account_type: 'independent_student',
      full_name: 'QA Final Student',
      grade_level: 'high',
    },
  }),
  parentForChild: await runFlow({
    admin,
    supabaseUrl,
    serviceRoleKey,
    kind: 'parent',
    role: 'parent',
    profileBody: {
      account_type: 'parent_for_child',
      full_name: 'QA Final Parent',
      child_name: 'QA Final Child',
      grade_level: 'middle',
    },
  }),
};

console.log(JSON.stringify(output, null, 2));
