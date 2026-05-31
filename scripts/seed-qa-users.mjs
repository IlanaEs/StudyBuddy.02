// Seed deterministic QA users (auto-confirmed, no email) for local development.
//
//   npm run qa:seed-users
//
// Creates 3 students, 3 parents, 3 teachers and 1 admin with stable emails and a
// shared password so onboarding/signup/login flows can be exercised without
// relying on Supabase email delivery. Credentials are documented in
// docs/QA_USERS.md. Demo-guarded: refuses to run against production.

import {
  assertDemoSeedAllowed,
  classifyEnvironment,
  createSupabaseAdminClient,
  findAuthUserByEmail,
  hasColumn,
  must,
  parseSeedArgs,
  readBackendEnv,
} from './seed-utils.mjs';

const SEED_TYPE = 'qa_users';
export const QA_PASSWORD = 'QaPass123!';

// Deterministic roster — emails and full names are stable across runs.
export const QA_USERS = [
  { email: 'qa.student.a@studybuddy.local', role: 'student', fullName: 'QA Student A' },
  { email: 'qa.student.b@studybuddy.local', role: 'student', fullName: 'QA Student B' },
  { email: 'qa.student.c@studybuddy.local', role: 'student', fullName: 'QA Student C' },
  { email: 'qa.parent.a@studybuddy.local', role: 'parent', fullName: 'QA Parent A' },
  { email: 'qa.parent.b@studybuddy.local', role: 'parent', fullName: 'QA Parent B' },
  { email: 'qa.parent.c@studybuddy.local', role: 'parent', fullName: 'QA Parent C' },
  { email: 'qa.teacher.a@studybuddy.local', role: 'teacher', fullName: 'QA Teacher A' },
  { email: 'qa.teacher.b@studybuddy.local', role: 'teacher', fullName: 'QA Teacher B' },
  { email: 'qa.teacher.c@studybuddy.local', role: 'teacher', fullName: 'QA Teacher C' },
  { email: 'qa.admin@studybuddy.local', role: 'admin', fullName: 'QA Admin' },
];

async function ensureAuthUser(supabase, user) {
  const appMetadata = { role: user.role, is_demo: true, seed_type: SEED_TYPE };
  const userMetadata = { full_name: user.fullName, dev_seed: true, dev_seed_type: SEED_TYPE };

  const existing = await findAuthUserByEmail(supabase, user.email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: QA_PASSWORD,
      email_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });
    if (error) throw new Error(`auth update ${user.email} failed: ${error.message}`);
    return { id: data.user.id, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: QA_PASSWORD,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });
  if (error) throw new Error(`auth create ${user.email} failed: ${error.message}`);
  return { id: data.user.id, created: true };
}

export async function seedQaUsers({ supabase }) {
  const usersHasIsDemo = await hasColumn(supabase, 'users', 'is_demo');
  const results = [];

  for (const user of QA_USERS) {
    const auth = await ensureAuthUser(supabase, user);

    const payload = {
      id: auth.id,
      supabase_auth_user_id: auth.id,
      email: user.email,
      role: user.role,
      full_name: user.fullName,
      status: 'active',
      ...(usersHasIsDemo ? { is_demo: true } : {}),
    };

    await must(
      `user upsert ${user.email}`,
      supabase.from('users').upsert(payload, { onConflict: 'email' }).select('id,email,role').limit(1),
    );

    results.push({ email: user.email, role: user.role, created: auth.created });
  }

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scriptName = 'qa:seed-users';
  const args = parseSeedArgs();
  const env = readBackendEnv();
  const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);
  const envInfo = classifyEnvironment(env, supabaseUrl, args);

  assertDemoSeedAllowed({
    scriptName,
    envInfo,
    supabaseUrl,
    // Allow local + hosted development/staging out of the box; production stays blocked.
    args: {
      ...args,
      allowRemoteDevSeed:
        args.allowRemoteDevSeed || envInfo.kind === 'development' || envInfo.kind === 'staging',
    },
  });

  const results = await seedQaUsers({ supabase });
  console.log(
    JSON.stringify(
      {
        seeded: true,
        type: SEED_TYPE,
        environment: envInfo.kind,
        password: QA_PASSWORD,
        users: results,
      },
      null,
      2,
    ),
  );
}
