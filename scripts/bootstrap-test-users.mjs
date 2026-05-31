import {
  assertLocalOrDevelopmentOnly,
  createSupabaseAdminClient,
  findAuthUserByEmail,
  must,
  readBackendEnv,
} from './seed-utils.mjs';

const scriptName = 'db:bootstrap:test-users';

const testUsers = [
  {
    email: 'i26082001@gmail.com',
    role: 'admin',
    fullName: 'StudyBuddy Admin',
    passwordEnv: 'ADMIN_BOOTSTRAP_PASSWORD',
  },
  {
    email: 'ilanaestrin01@gmail.com',
    role: 'teacher',
    fullName: 'Ilana Test Teacher',
    passwordEnv: 'TEACHER_BOOTSTRAP_PASSWORD',
  },
  {
    email: 'studyy.buddyln@gmail.com',
    role: 'parent',
    fullName: 'StudyBuddy Test Parent',
    passwordEnv: 'PARENT_BOOTSTRAP_PASSWORD',
  },
];

function passwordFor(user) {
  const shared = process.env.TEST_USERS_BOOTSTRAP_PASSWORD;
  const specific = process.env[user.passwordEnv];
  const password = specific ?? shared;

  if (!password) {
    throw new Error(
      `${scriptName}: ${user.passwordEnv} or TEST_USERS_BOOTSTRAP_PASSWORD is required and must not be hardcoded.`,
    );
  }

  return password;
}

async function ensureAuthUser(supabase, user) {
  const existing = await findAuthUserByEmail(supabase, user.email);
  const payload = {
    password: passwordFor(user),
    email_confirm: true,
    app_metadata: { role: user.role },
    user_metadata: { full_name: user.fullName },
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, payload);
    if (error) throw new Error(`auth update ${user.email} failed: ${error.message}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    ...payload,
  });
  if (error) throw new Error(`auth create ${user.email} failed: ${error.message}`);
  return data.user;
}

async function ensureAppUser(supabase, authUser, user) {
  const [appUser] = await must(
    `app user upsert ${user.email}`,
    supabase
      .from('users')
      .upsert({
        id: authUser.id,
        supabase_auth_user_id: authUser.id,
        email: user.email,
        role: user.role,
        full_name: user.fullName,
        status: 'active',
      }, { onConflict: 'email' })
      .select('id,email,role,status')
      .limit(1),
  );

  return appUser;
}

async function ensureTeacherBootstrap(supabase, userId) {
  await must(
    'teacher onboarding draft upsert',
    supabase
      .from('onboarding_drafts')
      .upsert({
        user_id: userId,
        onboarding_step: 1,
        onboarding_completed: false,
        full_name: 'Ilana Test Teacher',
        hourly_rate: 120,
        professional_status: 'test_teacher',
      }, { onConflict: 'user_id' }),
  );

  const { data: existingProfile, error: lookupError } = await supabase
    .from('teacher_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (lookupError) throw new Error(`teacher profile lookup failed: ${lookupError.message}`);

  if (existingProfile?.id) {
    await must(
      'teacher profile update',
      supabase
        .from('teacher_profiles')
        .update({
          hourly_rate: 120,
          location_type: 'online',
          is_active: false,
          is_verified: false,
          onboarding_completed: false,
          onboarding_step: 1,
          professional_status: 'test_teacher',
        })
        .eq('id', existingProfile.id),
    );
    return existingProfile.id;
  }

  const [profile] = await must(
    'teacher profile insert',
    supabase
      .from('teacher_profiles')
      .insert({
        user_id: userId,
        hourly_rate: 120,
        location_type: 'online',
        is_active: false,
        is_verified: false,
        onboarding_completed: false,
        onboarding_step: 1,
        professional_status: 'test_teacher',
      })
      .select('id')
      .limit(1),
  );

  return profile.id;
}

async function ensureParentChild(supabase, parentUserId) {
  const { data: existingChildren, error: lookupError } = await supabase
    .from('students')
    .select('id')
    .eq('parent_user_id', parentUserId)
    .eq('full_name', 'StudyBuddy Test Child')
    .limit(1);
  if (lookupError) throw new Error(`parent child lookup failed: ${lookupError.message}`);

  if (existingChildren?.[0]?.id) {
    return existingChildren[0].id;
  }

  const [student] = await must(
    'parent child insert',
    supabase
      .from('students')
      .insert({
        parent_user_id: parentUserId,
        full_name: 'StudyBuddy Test Child',
        grade_level: 'כיתה ז',
      })
      .select('id')
      .limit(1),
  );

  return student.id;
}

const env = readBackendEnv();
const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);
assertLocalOrDevelopmentOnly({ scriptName, env, supabaseUrl });

const results = [];

for (const user of testUsers) {
  const authUser = await ensureAuthUser(supabase, user);
  const appUser = await ensureAppUser(supabase, authUser, user);
  const extra = {};

  if (user.role === 'teacher') {
    extra.teacherProfileId = await ensureTeacherBootstrap(supabase, appUser.id);
    extra.onboardingRequired = true;
  }

  if (user.role === 'parent') {
    extra.childStudentId = await ensureParentChild(supabase, appUser.id);
  }

  results.push({
    email: user.email,
    role: user.role,
    authUserId: authUser.id,
    appUserId: appUser.id,
    ...extra,
  });
}

console.log(JSON.stringify({
  bootstrapped: true,
  target: supabaseUrl,
  users: results,
}, null, 2));
