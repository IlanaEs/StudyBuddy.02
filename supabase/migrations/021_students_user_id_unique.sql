-- StudyBuddy.02 DB Schema
-- 021_students_user_id_unique.sql
-- Root fix for duplicate student profiles: a signup race could insert TWO
-- students rows for the same auth user (observed twice). Enforce exactly one
-- independent-student profile per user_id at the DB level.
--
-- PARTIAL index on purpose: parent-managed children have user_id NULL (one
-- parent may have several children), so the uniqueness constraint must apply
-- only to non-null user_id. Independent students own their row via user_id.
--
-- PREREQUISITE: any existing duplicate (two rows sharing a non-null user_id)
-- must be consolidated/removed BEFORE this runs — the index creation fails while
-- a duplicate exists.

create unique index if not exists students_user_id_unique
  on public.students (user_id)
  where user_id is not null;
