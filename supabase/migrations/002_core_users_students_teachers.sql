-- StudyBuddy.02 DB Schema v1
-- 002_core_users_students_teachers.sql
-- Core identity, student, teacher, subject, and availability tables.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) not null,
  role public.user_role not null,
  full_name varchar(150) not null,
  phone varchar(30),
  profile_image_url text,
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_unique unique (email),
  constraint users_email_format_check check (position('@' in email) > 1)
);

comment on table public.users is 'Local application user profile aligned with Supabase Auth identity.';
comment on column public.users.id is 'Expected to match auth.uid() when records are created from Supabase Auth context.';

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  parent_user_id uuid,
  full_name varchar(150) not null,
  grade_level varchar(50),
  age_group varchar(50),
  learning_goals text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_user_id_fk foreign key (user_id) references public.users(id) on delete restrict,
  constraint students_parent_user_id_fk foreign key (parent_user_id) references public.users(id) on delete restrict,
  constraint students_owner_check check (user_id is not null or parent_user_id is not null)
);

create table public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bio text,
  hourly_rate numeric(10,2) not null,
  location_type public.location_type not null,
  city varchar(100),
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_profiles_user_id_fk foreign key (user_id) references public.users(id) on delete restrict,
  constraint teacher_profiles_user_id_unique unique (user_id),
  constraint teacher_profiles_hourly_rate_check check (hourly_rate >= 0),
  constraint teacher_profiles_rating_avg_check check (rating_avg >= 0 and rating_avg <= 5),
  constraint teacher_profiles_rating_count_check check (rating_count >= 0)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  category varchar(100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_name_unique unique (name)
);

create table public.teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  subject_id uuid not null,
  level varchar(100),
  years_experience integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_subjects_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete cascade,
  constraint teacher_subjects_subject_id_fk foreign key (subject_id) references public.subjects(id) on delete restrict,
  constraint teacher_subjects_years_experience_check check (years_experience is null or years_experience >= 0),
  constraint teacher_subjects_teacher_subject_level_unique unique (teacher_id, subject_id, level)
);

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_slots_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete cascade,
  constraint availability_slots_day_of_week_check check (day_of_week between 0 and 6),
  constraint availability_slots_time_check check (end_time > start_time)
);

create index users_role_idx on public.users(role);
create index users_status_idx on public.users(status);
create index students_user_id_idx on public.students(user_id);
create index students_parent_user_id_idx on public.students(parent_user_id);
create index teacher_profiles_user_id_idx on public.teacher_profiles(user_id);
create index teacher_profiles_is_active_idx on public.teacher_profiles(is_active);
create index teacher_profiles_location_type_idx on public.teacher_profiles(location_type);
create index teacher_subjects_teacher_id_idx on public.teacher_subjects(teacher_id);
create index teacher_subjects_subject_id_idx on public.teacher_subjects(subject_id);
create index availability_slots_teacher_id_idx on public.availability_slots(teacher_id);
create index availability_slots_lookup_idx on public.availability_slots(teacher_id, day_of_week, is_active);

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger set_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger set_teacher_profiles_updated_at
before update on public.teacher_profiles
for each row execute function public.set_updated_at();

create trigger set_subjects_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

create trigger set_teacher_subjects_updated_at
before update on public.teacher_subjects
for each row execute function public.set_updated_at();

create trigger set_availability_slots_updated_at
before update on public.availability_slots
for each row execute function public.set_updated_at();
