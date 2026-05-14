-- StudyBuddy.02 DB Schema v1
-- 001_enums_and_common.sql
-- Common extensions, helpers, and approved enum definitions only.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type public.user_role as enum (
  'teacher',
  'student',
  'parent',
  'admin'
);

create type public.user_status as enum (
  'active',
  'inactive',
  'blocked'
);

create type public.location_type as enum (
  'online',
  'frontal',
  'both'
);

create type public.intake_status as enum (
  'open',
  'matched',
  'closed'
);

create type public.booking_status as enum (
  'pending',
  'approved',
  'rejected',
  'expired',
  'cancelled'
);

create type public.lesson_status as enum (
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

create type public.student_source as enum (
  'matched',
  'external'
);

create type public.teacher_student_status as enum (
  'active',
  'inactive',
  'archived'
);

create type public.conversation_status as enum (
  'active',
  'archived'
);

create type public.message_type as enum (
  'text',
  'file',
  'system'
);

create type public.subscription_plan as enum (
  'matchmaker',
  'professional',
  'business'
);

create type public.subscription_status as enum (
  'active',
  'trial',
  'cancelled',
  'expired'
);

create type public.notification_type as enum (
  'booking_request',
  'booking_approved',
  'lesson_reminder',
  'new_message'
);

create type public.notification_channel as enum (
  'email',
  'push',
  'sms'
);

create type public.notification_status as enum (
  'pending',
  'sent',
  'failed'
);
