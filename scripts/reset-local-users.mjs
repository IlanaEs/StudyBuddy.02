import {
  assertLocalOrDevelopmentOnly,
  createSupabaseAdminClient,
  must,
  readBackendEnv,
} from './seed-utils.mjs';

const scriptName = 'db:reset:local-users';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const runtimeTablesInDeleteOrder = [
  'homework_tasks',
  'lesson_confirmations',
  'lesson_files',
  'messages',
  'conversations',
  'reviews',
  'teacher_students',
  'lesson_notes',
  'lessons',
  'booking_requests',
  'match_results',
  'student_intakes',
  'availability_exceptions',
  'availability_slots',
  'teacher_subjects',
  'teacher_subscriptions',
  'academic_repository_requests',
  'notifications',
  'admin_actions',
  'onboarding_drafts',
  'students',
  'teacher_profiles',
  'users',
];

async function deleteAllRows(supabase, table) {
  await must(`clear ${table}`, supabase.from(table).delete().neq('id', NIL_UUID));
}

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;
  const perPage = 100;

  while (page <= 100) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth listUsers failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) return users;
    page += 1;
  }

  throw new Error('auth listUsers exceeded 10,000 users; refusing to continue.');
}

async function deleteAuthUsers(supabase) {
  const users = await listAllAuthUsers(supabase);

  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`auth delete ${user.email ?? user.id} failed: ${error.message}`);
  }

  return users.length;
}

const env = readBackendEnv();
const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);
assertLocalOrDevelopmentOnly({ scriptName, env, supabaseUrl });

for (const table of runtimeTablesInDeleteOrder) {
  await deleteAllRows(supabase, table);
}

const deletedAuthUsers = await deleteAuthUsers(supabase);

console.log(JSON.stringify({
  reset: true,
  target: supabaseUrl,
  clearedTables: runtimeTablesInDeleteOrder,
  deletedAuthUsers,
}, null, 2));
