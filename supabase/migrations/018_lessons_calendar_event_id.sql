-- StudyBuddy.02 DB Schema
-- 018_lessons_calendar_event_id.sql
-- Stores the Google Calendar event id created on booking approval, alongside the
-- existing lessons.meeting_link (Meet URL). Nullable: the event is best-effort
-- (only created when the approving teacher has a calendar-scoped Google token).
-- The id is retained for future update/cancel calendar sync (P1).

alter table public.lessons
  add column if not exists calendar_event_id text;

comment on column public.lessons.calendar_event_id is
  'Google Calendar event id from the teacher-calendar event created on approval. Null when no Meet/event was created. Paired with meeting_link.';
