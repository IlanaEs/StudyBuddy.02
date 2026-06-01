-- StudyBuddy.02 DB Schema v1
-- 009_matching_engine_indexes.sql
-- Adds composite indexes required for matching engine candidate filtering.
-- No schema changes. No table alterations. No field renames.
--
-- teacher_profiles_is_active_idx (single-column) is intentionally left in place.
-- It will be removed in a later cleanup migration once this index is confirmed healthy.

create index concurrently if not exists teacher_profiles_active_verified_idx
  on public.teacher_profiles(is_active, is_verified)
  where is_active = true;

create index concurrently if not exists teacher_subjects_subject_level_idx
  on public.teacher_subjects(subject_id, level);
