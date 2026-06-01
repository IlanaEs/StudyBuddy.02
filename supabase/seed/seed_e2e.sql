-- StudyBuddy.02 — E2E Matching Flow Seed Data
-- Run AFTER seed_subjects.sql (requires מתמטיקה to exist in subjects).
-- Idempotent: uses ON CONFLICT for all tables.
--
-- Purpose: populate the minimum data set needed to run the full matching flow
-- locally:
--   POST /api/student-intakes  →  intake created
--   POST /api/matching/:id/run →  up to 3 curated matches returned
--
-- Prerequisites:
--   The Supabase Auth users corresponding to the IDs below must exist in
--   auth.users. Insert them via Supabase Studio or the management API before
--   running this file, then use those same UUIDs as supabase_auth_user_id.
--
-- Fixed seed UUIDs use the e2ea prefix (all valid hex, version 4 shape):
--   users:            e2ea0001-0000-4000-8000-00000000000N
--   students:         e2ea0002-0000-4000-8000-00000000000N
--   teacher_profiles: e2ea0003-0000-4000-8000-00000000000N

-- ── Auth users (insert before public.users due to FK) ─────────────────────────
-- Supabase local: insert minimal rows into auth.users so the FK is satisfied.
-- The encrypted_password uses bcrypt; value here is TestPassword123! hashed.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
select
  id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
  email, crypt('TestPassword123!', gen_salt('bf')), now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
from (values
  ('e2ea0001-0000-4000-8000-000000000001'::uuid, 'e2e-parent@studybuddy.local'),
  ('e2ea0001-0000-4000-8000-000000000002'::uuid, 'e2e-student@studybuddy.local'),
  ('e2ea0001-0000-4000-8000-000000000010'::uuid, 'e2e-teacher1@studybuddy.local'),
  ('e2ea0001-0000-4000-8000-000000000011'::uuid, 'e2e-teacher2@studybuddy.local'),
  ('e2ea0001-0000-4000-8000-000000000012'::uuid, 'e2e-teacher3@studybuddy.local')
) as t(id, email)
on conflict (id) do nothing;

-- ── Application users ─────────────────────────────────────────────────────────
insert into public.users (id, supabase_auth_user_id, email, role, full_name, status) values
  ('e2ea0001-0000-4000-8000-000000000001', 'e2ea0001-0000-4000-8000-000000000001', 'e2e-parent@studybuddy.local',   'parent',  'הורה E2E',          'active'),
  ('e2ea0001-0000-4000-8000-000000000002', 'e2ea0001-0000-4000-8000-000000000002', 'e2e-student@studybuddy.local',  'student', 'תלמיד E2E עצמאי',   'active'),
  ('e2ea0001-0000-4000-8000-000000000010', 'e2ea0001-0000-4000-8000-000000000010', 'e2e-teacher1@studybuddy.local', 'teacher', 'מורה E2E ראשון',     'active'),
  ('e2ea0001-0000-4000-8000-000000000011', 'e2ea0001-0000-4000-8000-000000000011', 'e2e-teacher2@studybuddy.local', 'teacher', 'מורה E2E שני',       'active'),
  ('e2ea0001-0000-4000-8000-000000000012', 'e2ea0001-0000-4000-8000-000000000012', 'e2e-teacher3@studybuddy.local', 'teacher', 'מורה E2E שלישי',     'active')
on conflict (email) do update set
  status   = excluded.status,
  full_name = excluded.full_name;

-- ── Students ──────────────────────────────────────────────────────────────────

-- Child student (managed by parent — no own login)
insert into public.students (id, parent_user_id, full_name) values
  ('e2ea0002-0000-4000-8000-000000000001', 'e2ea0001-0000-4000-8000-000000000001', 'ילד E2E של ההורה')
on conflict (id) do update set parent_user_id = excluded.parent_user_id;

-- Standalone student (has their own login)
insert into public.students (id, user_id, full_name) values
  ('e2ea0002-0000-4000-8000-000000000002', 'e2ea0001-0000-4000-8000-000000000002', 'תלמיד E2E עצמאי')
on conflict (id) do update set user_id = excluded.user_id;

-- ── Teacher profiles ──────────────────────────────────────────────────────────
insert into public.teacher_profiles (
  id, user_id, hourly_rate, location_type, city,
  rating_avg, rating_count,
  is_verified, is_active, onboarding_completed, last_active_at
) values
  ('e2ea0003-0000-4000-8000-000000000010', 'e2ea0001-0000-4000-8000-000000000010', 120, 'online', null, 4.5, 20, true, true, true, now()),
  ('e2ea0003-0000-4000-8000-000000000011', 'e2ea0001-0000-4000-8000-000000000011', 100, 'online', null, 4.2, 15, true, true, true, now()),
  ('e2ea0003-0000-4000-8000-000000000012', 'e2ea0001-0000-4000-8000-000000000012',  90, 'online', null, 4.0, 10, true, true, true, now())
on conflict (id) do update set
  is_active            = excluded.is_active,
  is_verified          = excluded.is_verified,
  onboarding_completed = excluded.onboarding_completed,
  last_active_at       = excluded.last_active_at;

-- ── Teacher subjects (מתמטיקה — must exist via seed_subjects.sql) ─────────────
insert into public.teacher_subjects (teacher_id, subject_id, level, years_experience)
select
  t.teacher_id,
  s.id as subject_id,
  t.level,
  t.years_experience
from (values
  ('e2ea0003-0000-4000-8000-000000000010'::uuid, 'high', 8),
  ('e2ea0003-0000-4000-8000-000000000011'::uuid, 'high', 5),
  ('e2ea0003-0000-4000-8000-000000000012'::uuid, null,   3)
) as t(teacher_id, level, years_experience)
cross join (select id from public.subjects where name = 'מתמטיקה' limit 1) as s
on conflict (teacher_id, subject_id, level) do update set
  years_experience = excluded.years_experience;

-- ── Availability slots (Monday–Friday 09:00–17:00) ────────────────────────────
-- Gives 480 min/day — well above the 30-min minimum.
-- Slot-level uniqueness is not enforced in the DB, so we delete+reinsert for idempotency.
delete from public.availability_slots
where teacher_id in (
  'e2ea0003-0000-4000-8000-000000000010',
  'e2ea0003-0000-4000-8000-000000000011',
  'e2ea0003-0000-4000-8000-000000000012'
);

insert into public.availability_slots (teacher_id, day_of_week, start_time, end_time, is_active)
select teacher_id, day_of_week, '09:00'::time, '17:00'::time, true
from (values
  ('e2ea0003-0000-4000-8000-000000000010'::uuid, 1),
  ('e2ea0003-0000-4000-8000-000000000010'::uuid, 2),
  ('e2ea0003-0000-4000-8000-000000000010'::uuid, 3),
  ('e2ea0003-0000-4000-8000-000000000010'::uuid, 4),
  ('e2ea0003-0000-4000-8000-000000000010'::uuid, 5),
  ('e2ea0003-0000-4000-8000-000000000011'::uuid, 1),
  ('e2ea0003-0000-4000-8000-000000000011'::uuid, 2),
  ('e2ea0003-0000-4000-8000-000000000011'::uuid, 3),
  ('e2ea0003-0000-4000-8000-000000000011'::uuid, 4),
  ('e2ea0003-0000-4000-8000-000000000011'::uuid, 5),
  ('e2ea0003-0000-4000-8000-000000000012'::uuid, 1),
  ('e2ea0003-0000-4000-8000-000000000012'::uuid, 2),
  ('e2ea0003-0000-4000-8000-000000000012'::uuid, 3),
  ('e2ea0003-0000-4000-8000-000000000012'::uuid, 4),
  ('e2ea0003-0000-4000-8000-000000000012'::uuid, 5)
) as t(teacher_id, day_of_week);
