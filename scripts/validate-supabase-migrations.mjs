import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = new URL('../supabase/migrations/', import.meta.url);

const expectedFiles = [
  '001_enums_and_common.sql',
  '002_core_users_students_teachers.sql',
  '003_matching_booking_lessons.sql',
  '004_crm_chat_notifications.sql',
  '005_rls_policies.sql',
  '006_auth_user_link.sql',
  '007_security_hardening.sql',
];

const expectedTables = [
  'users',
  'students',
  'teacher_profiles',
  'subjects',
  'teacher_subjects',
  'availability_slots',
  'student_intakes',
  'match_results',
  'booking_requests',
  'lessons',
  'teacher_students',
  'lesson_notes',
  'conversations',
  'messages',
  'lesson_files',
  'reviews',
  'teacher_subscriptions',
  'notifications',
  'system_settings',
  'admin_actions',
];

const expectedEnums = {
  user_role: ['teacher', 'student', 'parent', 'admin'],
  user_status: ['active', 'inactive', 'blocked'],
  location_type: ['online', 'frontal', 'both'],
  intake_status: ['open', 'matched', 'closed'],
  booking_status: ['pending', 'approved', 'rejected', 'expired', 'cancelled'],
  lesson_status: ['scheduled', 'completed', 'cancelled', 'no_show'],
  student_source: ['matched', 'external'],
  teacher_student_status: ['active', 'inactive', 'archived'],
  conversation_status: ['active', 'archived'],
  message_type: ['text', 'file', 'system'],
  subscription_plan: ['matchmaker', 'professional', 'business'],
  subscription_status: ['active', 'trial', 'cancelled', 'expired'],
  notification_type: ['booking_request', 'booking_approved', 'lesson_reminder', 'new_message'],
  notification_channel: ['email', 'push', 'sms'],
  notification_status: ['pending', 'sent', 'failed'],
};

function fail(message) {
  console.error(`Migration validation failed: ${message}`);
  process.exit(1);
}

const actualFiles = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  fail(`migration order mismatch: ${actualFiles.join(', ')}`);
}

const sqlByFile = Object.fromEntries(
  expectedFiles.map((file) => [file, readFileSync(join(migrationsDir.pathname, file), 'utf8')]),
);

const allSql = Object.values(sqlByFile).join('\n');

for (const table of expectedTables) {
  if (!allSql.includes(`create table public.${table}`)) {
    fail(`missing table ${table}`);
  }

  if (!sqlByFile['005_rls_policies.sql'].includes(`alter table public.${table} enable row level security;`)) {
    fail(`missing RLS enablement for ${table}`);
  }
}

for (const [enumName, values] of Object.entries(expectedEnums)) {
  const enumPattern = new RegExp(`create type public\\.${enumName} as enum \\(([\\s\\S]*?)\\);`);
  const match = sqlByFile['001_enums_and_common.sql'].match(enumPattern);

  if (!match) {
    fail(`missing enum ${enumName}`);
  }

  const actualValues = [...match[1].matchAll(/'([^']+)'/g)].map((valueMatch) => valueMatch[1]);

  if (JSON.stringify(actualValues) !== JSON.stringify(values)) {
    fail(`enum ${enumName} mismatch: ${actualValues.join(', ')}`);
  }
}

for (const table of ['teacher_students', 'teacher_subjects', 'match_results', 'booking_requests', 'lessons']) {
  if (!allSql.includes(table)) {
    fail(`expected lifecycle or relationship table reference missing: ${table}`);
  }
}

if (!sqlByFile['006_auth_user_link.sql'].includes('supabase_auth_user_id uuid not null')) {
  fail('missing required Supabase Auth user link column');
}

if (!sqlByFile['006_auth_user_link.sql'].includes('references auth.users(id) on delete cascade')) {
  fail('missing required Supabase Auth FK reference');
}

if (!sqlByFile['007_security_hardening.sql'].includes('set search_path = public')) {
  fail('missing required function search_path hardening');
}

const rlsWithoutSubjectLookup = sqlByFile['005_rls_policies.sql'].replace(
  /create policy subjects_select_authenticated[\s\S]*?using \(true\);/,
  '',
);

if (/using\s*\(\s*true\s*\)/i.test(rlsWithoutSubjectLookup)) {
  fail('unexpected unrestricted RLS policy detected outside authenticated subject lookup');
}

if (/to\s+anon/i.test(sqlByFile['005_rls_policies.sql'])) {
  fail('anon RLS policy detected');
}

console.log('Supabase migration validation passed.');
