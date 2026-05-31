import {
  assertLocalOrDevelopmentOnly,
  createSupabaseAdminClient,
  findAuthUserByEmail,
  must,
  readBackendEnv,
} from './seed-utils.mjs';

const scriptName = 'db:bootstrap:admin';
const adminEmail = 'i26082001@gmail.com';
const adminFullName = 'StudyBuddy Admin';

const env = readBackendEnv();
const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);
assertLocalOrDevelopmentOnly({ scriptName, env, supabaseUrl });

const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
if (!password) {
  throw new Error(`${scriptName}: ADMIN_BOOTSTRAP_PASSWORD is required and must not be hardcoded.`);
}

const existingAuthUser = await findAuthUserByEmail(supabase, adminEmail);
let authUser;

if (existingAuthUser) {
  const { data, error } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
    user_metadata: { full_name: adminFullName },
  });
  if (error) throw new Error(`auth update admin failed: ${error.message}`);
  authUser = data.user;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
    user_metadata: { full_name: adminFullName },
  });
  if (error) throw new Error(`auth create admin failed: ${error.message}`);
  authUser = data.user;
}

const [appUser] = await must(
  'admin user upsert',
  supabase
    .from('users')
    .upsert({
      supabase_auth_user_id: authUser.id,
      email: adminEmail,
      role: 'admin',
      full_name: adminFullName,
      status: 'active',
    }, { onConflict: 'email' })
    .select('id,email,role,status')
    .limit(1),
);

console.log(JSON.stringify({
  bootstrapped: true,
  target: supabaseUrl,
  authUserId: authUser.id,
  appUser,
}, null, 2));
