-- Migration 014: Parent dashboard — lesson confirmation and homework task tracking.

-- ── lesson_confirmations ──────────────────────────────────────────────────────
-- One row per lesson. Created by the teacher when marking a lesson complete;
-- the parent approves or rejects to close the billing cycle.

create table public.lesson_confirmations (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null,
  teacher_user_id uuid not null,
  parent_user_id uuid not null,
  student_id uuid not null,

  status text not null default 'pending',

  teacher_marked_completed_at timestamptz,
  parent_reviewed_at timestamptz,

  amount numeric(10,2),
  teacher_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lesson_confirmations_lesson_id_fk
    foreign key (lesson_id) references public.lessons(id) on delete cascade,
  constraint lesson_confirmations_teacher_user_id_fk
    foreign key (teacher_user_id) references public.users(id) on delete restrict,
  constraint lesson_confirmations_parent_user_id_fk
    foreign key (parent_user_id) references public.users(id) on delete restrict,
  constraint lesson_confirmations_student_id_fk
    foreign key (student_id) references public.students(id) on delete restrict,
  constraint lesson_confirmations_status_check
    check (status in ('pending', 'approved', 'rejected')),
  -- One confirmation row per lesson.
  constraint lesson_confirmations_lesson_id_unique unique (lesson_id)
);

create index idx_lesson_confirmations_parent
  on public.lesson_confirmations (parent_user_id);

create index idx_lesson_confirmations_student
  on public.lesson_confirmations (student_id);

create index idx_lesson_confirmations_status
  on public.lesson_confirmations (status);

create trigger set_lesson_confirmations_updated_at
before update on public.lesson_confirmations
for each row execute function public.set_updated_at();

-- ── homework_tasks ────────────────────────────────────────────────────────────
-- Structured tasks created by a teacher as part of a lesson note.
-- Parents and students can track completion status.

create table public.homework_tasks (
  id uuid primary key default gen_random_uuid(),

  lesson_note_id uuid not null,
  student_id uuid not null,
  title text not null,
  description text,
  status text not null default 'open',
  due_date timestamptz,
  created_by_teacher_id uuid not null,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint homework_tasks_lesson_note_id_fk
    foreign key (lesson_note_id) references public.lesson_notes(id) on delete cascade,
  constraint homework_tasks_student_id_fk
    foreign key (student_id) references public.students(id) on delete restrict,
  constraint homework_tasks_created_by_teacher_id_fk
    foreign key (created_by_teacher_id) references public.users(id) on delete restrict,
  constraint homework_tasks_status_check
    check (status in ('open', 'in_progress', 'completed')),
  constraint homework_tasks_title_not_blank
    check (length(trim(title)) > 0)
);

create index idx_homework_tasks_student
  on public.homework_tasks (student_id);

create index idx_homework_tasks_status
  on public.homework_tasks (status);

create index idx_homework_tasks_lesson_note
  on public.homework_tasks (lesson_note_id);

create trigger set_homework_tasks_updated_at
before update on public.homework_tasks
for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.lesson_confirmations enable row level security;
alter table public.homework_tasks enable row level security;

-- lesson_confirmations: parent reads own, teacher reads/writes own
create policy lesson_confirmations_select_parent
on public.lesson_confirmations for select to authenticated
using (parent_user_id = auth.uid());

create policy lesson_confirmations_select_teacher
on public.lesson_confirmations for select to authenticated
using (teacher_user_id = auth.uid());

create policy lesson_confirmations_insert_teacher
on public.lesson_confirmations for insert to authenticated
with check (teacher_user_id = auth.uid());

create policy lesson_confirmations_update_parent
on public.lesson_confirmations for update to authenticated
using (parent_user_id = auth.uid())
with check (parent_user_id = auth.uid());

create policy lesson_confirmations_update_teacher
on public.lesson_confirmations for update to authenticated
using (teacher_user_id = auth.uid())
with check (teacher_user_id = auth.uid());

-- homework_tasks: parent reads/updates tasks for their children, teacher manages own tasks
create policy homework_tasks_select_parent
on public.homework_tasks for select to authenticated
using (
  exists (
    select 1 from public.students
    where students.id = homework_tasks.student_id
      and students.parent_user_id = auth.uid()
  )
);

create policy homework_tasks_select_teacher
on public.homework_tasks for select to authenticated
using (created_by_teacher_id = auth.uid());

create policy homework_tasks_insert_teacher
on public.homework_tasks for insert to authenticated
with check (created_by_teacher_id = auth.uid());

create policy homework_tasks_update_parent
on public.homework_tasks for update to authenticated
using (
  exists (
    select 1 from public.students
    where students.id = homework_tasks.student_id
      and students.parent_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.students
    where students.id = homework_tasks.student_id
      and students.parent_user_id = auth.uid()
  )
);

create policy homework_tasks_update_teacher
on public.homework_tasks for update to authenticated
using (created_by_teacher_id = auth.uid())
with check (created_by_teacher_id = auth.uid());
