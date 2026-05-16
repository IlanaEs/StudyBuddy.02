-- StudyBuddy.02 DB Schema v1
-- 003_matching_booking_lessons.sql
-- Intake, matching result, booking request, and lesson lifecycle tables.

create table public.student_intakes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  created_by_user_id uuid not null,
  subject_id uuid not null,
  level varchar(100),
  goal text,
  location_preference public.location_type not null,
  city varchar(100),
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  preferred_days jsonb,
  preferred_time_ranges jsonb,
  learning_style varchar(100),
  urgency varchar(50),
  status public.intake_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_intakes_student_id_fk foreign key (student_id) references public.students(id) on delete restrict,
  constraint student_intakes_created_by_user_id_fk foreign key (created_by_user_id) references public.users(id) on delete restrict,
  constraint student_intakes_subject_id_fk foreign key (subject_id) references public.subjects(id) on delete restrict,
  constraint student_intakes_budget_min_check check (budget_min is null or budget_min >= 0),
  constraint student_intakes_budget_max_check check (budget_max is null or budget_max >= 0),
  constraint student_intakes_budget_range_check check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null,
  teacher_id uuid not null,
  rank smallint not null,
  match_score numeric(5,2) not null,
  reason text,
  was_selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_results_intake_id_fk foreign key (intake_id) references public.student_intakes(id) on delete cascade,
  constraint match_results_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete restrict,
  constraint match_results_rank_check check (rank between 1 and 3),
  constraint match_results_match_score_check check (match_score >= 0),
  constraint match_results_intake_rank_unique unique (intake_id, rank),
  constraint match_results_intake_teacher_unique unique (intake_id, teacher_id)
);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  teacher_id uuid not null,
  match_result_id uuid,
  requested_start_at timestamptz not null,
  requested_end_at timestamptz not null,
  status public.booking_status not null default 'pending',
  student_message text,
  teacher_response_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_requests_student_id_fk foreign key (student_id) references public.students(id) on delete restrict,
  constraint booking_requests_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete restrict,
  constraint booking_requests_match_result_id_fk foreign key (match_result_id) references public.match_results(id) on delete set null,
  constraint booking_requests_time_check check (requested_end_at > requested_start_at)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid,
  teacher_id uuid not null,
  student_id uuid not null,
  subject_id uuid,
  status public.lesson_status not null default 'scheduled',
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  duration_minutes integer not null default 60,
  location_type public.location_type not null,
  meeting_link text,
  cancellation_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_booking_request_id_fk foreign key (booking_request_id) references public.booking_requests(id) on delete set null,
  constraint lessons_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete restrict,
  constraint lessons_student_id_fk foreign key (student_id) references public.students(id) on delete restrict,
  constraint lessons_subject_id_fk foreign key (subject_id) references public.subjects(id) on delete restrict,
  constraint lessons_booking_request_id_unique unique (booking_request_id),
  constraint lessons_time_check check (scheduled_end_at > scheduled_start_at),
  constraint lessons_duration_minutes_check check (duration_minutes > 0),
  constraint lessons_completed_at_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed')
  )
);

create index student_intakes_student_id_idx on public.student_intakes(student_id);
create index student_intakes_created_by_user_id_idx on public.student_intakes(created_by_user_id);
create index student_intakes_subject_id_idx on public.student_intakes(subject_id);
create index student_intakes_status_idx on public.student_intakes(status);
create index student_intakes_matching_lookup_idx on public.student_intakes(subject_id, location_preference, status);
create index match_results_intake_id_idx on public.match_results(intake_id);
create index match_results_teacher_id_idx on public.match_results(teacher_id);
create index match_results_rank_idx on public.match_results(intake_id, rank);
create index booking_requests_student_id_idx on public.booking_requests(student_id);
create index booking_requests_teacher_id_idx on public.booking_requests(teacher_id);
create index booking_requests_match_result_id_idx on public.booking_requests(match_result_id);
create index booking_requests_status_idx on public.booking_requests(status);
create index booking_requests_teacher_status_idx on public.booking_requests(teacher_id, status);
create index lessons_booking_request_id_idx on public.lessons(booking_request_id);
create index lessons_teacher_id_idx on public.lessons(teacher_id);
create index lessons_student_id_idx on public.lessons(student_id);
create index lessons_status_idx on public.lessons(status);
create index lessons_scheduled_start_at_idx on public.lessons(scheduled_start_at);
create index lessons_teacher_schedule_idx on public.lessons(teacher_id, scheduled_start_at, status);
create index lessons_student_schedule_idx on public.lessons(student_id, scheduled_start_at, status);

create trigger set_student_intakes_updated_at
before update on public.student_intakes
for each row execute function public.set_updated_at();

create trigger set_match_results_updated_at
before update on public.match_results
for each row execute function public.set_updated_at();

create trigger set_booking_requests_updated_at
before update on public.booking_requests
for each row execute function public.set_updated_at();

create trigger set_lessons_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();
