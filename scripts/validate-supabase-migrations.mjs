import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = new URL('../supabase/migrations/', import.meta.url);

const expectedFiles = [
  '20260514181242_001_enums_and_common.sql',
  '20260514181326_002_core_users_students_teachers.sql',
  '20260514181418_003_matching_booking_lessons.sql',
  '20260514181520_004_crm_chat_notifications.sql',
  '20260514181622_005_rls_policies.sql',
  '20260514182555_006_auth_user_link.sql',
  '20260514183726_007_security_hardening.sql',
  '20260522000100_008_teacher_scheduling_preferences.sql',
  '20260522000200_009_availability_exceptions.sql',
];

const migrationFiles = {
  enums: '20260514181242_001_enums_and_common.sql',
  rls: '20260514181622_005_rls_policies.sql',
  authLink: '20260514182555_006_auth_user_link.sql',
  securityHardening: '20260514183726_007_security_hardening.sql',
  schedulingPreferences: '20260522000100_008_teacher_scheduling_preferences.sql',
  availabilityExceptions: '20260522000200_009_availability_exceptions.sql',
};

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

  if (!sqlByFile[migrationFiles.rls].includes(`alter table public.${table} enable row level security;`)) {
    fail(`missing RLS enablement for ${table}`);
  }
}

for (const [enumName, values] of Object.entries(expectedEnums)) {
  const enumPattern = new RegExp(`create type public\\.${enumName} as enum \\(([\\s\\S]*?)\\);`);
  const match = sqlByFile[migrationFiles.enums].match(enumPattern);

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

if (!sqlByFile[migrationFiles.authLink].includes('supabase_auth_user_id uuid not null')) {
  fail('missing required Supabase Auth user link column');
}

if (!sqlByFile[migrationFiles.authLink].includes('references auth.users(id) on delete cascade')) {
  fail('missing required Supabase Auth FK reference');
}

if (!sqlByFile[migrationFiles.securityHardening].includes('set search_path = public')) {
  fail('missing required function search_path hardening');
}

if (!sqlByFile[migrationFiles.availabilityExceptions].includes('create table public.availability_exceptions')) {
  fail('missing table availability_exceptions');
}

for (const column of [
  'default_lesson_duration_minutes',
  'default_break_duration_minutes',
  'slot_alignment',
]) {
  if (!sqlByFile[migrationFiles.schedulingPreferences].includes(`add column ${column}`)) {
    fail(`missing teacher_profiles scheduling column ${column}`);
  }
}

for (const constraint of [
  'teacher_profiles_lesson_duration_check',
  'teacher_profiles_break_duration_check',
  'teacher_profiles_slot_alignment_check',
]) {
  if (!sqlByFile[migrationFiles.schedulingPreferences].includes(`constraint ${constraint}`)) {
    fail(`missing teacher scheduling constraint ${constraint}`);
  }
}

for (const index of [
  'availability_exceptions_teacher_id_idx',
  'availability_exceptions_starts_at_idx',
  'availability_exceptions_ends_at_idx',
  'availability_exceptions_teacher_range_idx',
]) {
  if (!sqlByFile[migrationFiles.availabilityExceptions].includes(`create index ${index}`)) {
    fail(`missing availability exception index ${index}`);
  }
}

const rlsWithoutSubjectLookup = sqlByFile[migrationFiles.rls].replace(
  /create policy subjects_select_authenticated[\s\S]*?using \(true\);/,
  '',
);

if (/using\s*\(\s*true\s*\)/i.test(rlsWithoutSubjectLookup)) {
  fail('unexpected unrestricted RLS policy detected outside authenticated subject lookup');
}

if (/to\s+anon/i.test(sqlByFile[migrationFiles.rls])) {
  fail('anon RLS policy detected');
}

console.log('Supabase migration validation passed.');
