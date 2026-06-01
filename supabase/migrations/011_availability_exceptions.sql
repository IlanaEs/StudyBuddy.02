-- StudyBuddy.02 DB Schema
-- 009_availability_exceptions.sql
-- Blocked dates / partial-day overrides that suppress generated lesson slots.
-- A full-day block uses is_all_day = true with starts_at / ends_at spanning
-- midnight-to-midnight UTC; partial blocks use any sub-day range.

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_exceptions_teacher_id_fk
    foreign key (teacher_id) references public.teacher_profiles(id) on delete cascade,
  constraint availability_exceptions_time_check
    check (ends_at > starts_at),
  constraint availability_exceptions_reason_length_check
    check (reason is null or char_length(reason) <= 500)
);

create index availability_exceptions_teacher_id_idx
  on public.availability_exceptions(teacher_id);

create index availability_exceptions_starts_at_idx
  on public.availability_exceptions(starts_at);

create index availability_exceptions_ends_at_idx
  on public.availability_exceptions(ends_at);

-- Composite index for the teacher + date-range overlap query used in slot generation.
create index availability_exceptions_teacher_range_idx
  on public.availability_exceptions(teacher_id, starts_at, ends_at);

create trigger set_availability_exceptions_updated_at
before update on public.availability_exceptions
for each row execute function public.set_updated_at();
