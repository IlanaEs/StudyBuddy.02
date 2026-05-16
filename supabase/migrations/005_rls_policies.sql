-- StudyBuddy.02 DB Schema v1
-- 005_rls_policies.sql
-- Safe starter RLS. These policies are intentionally narrow and do not expose public data.
-- TODO: Expand auth-context policies after backend ownership and role resolution are finalized.

alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.availability_slots enable row level security;
alter table public.student_intakes enable row level security;
alter table public.match_results enable row level security;
alter table public.booking_requests enable row level security;
alter table public.lessons enable row level security;
alter table public.teacher_students enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.lesson_files enable row level security;
alter table public.reviews enable row level security;
alter table public.teacher_subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.system_settings enable row level security;
alter table public.admin_actions enable row level security;

create policy users_select_own
on public.users
for select
to authenticated
using (id = auth.uid());

create policy users_update_own
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy students_select_own_or_parent
on public.students
for select
to authenticated
using (user_id = auth.uid() or parent_user_id = auth.uid());

create policy students_update_own_or_parent
on public.students
for update
to authenticated
using (user_id = auth.uid() or parent_user_id = auth.uid())
with check (user_id = auth.uid() or parent_user_id = auth.uid());

create policy teacher_profiles_select_own
on public.teacher_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy teacher_profiles_update_own
on public.teacher_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy subjects_select_authenticated
on public.subjects
for select
to authenticated
using (true);

create policy teacher_subjects_select_own_teacher
on public.teacher_subjects
for select
to authenticated
using (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = teacher_subjects.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy teacher_subjects_manage_own_teacher
on public.teacher_subjects
for all
to authenticated
using (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = teacher_subjects.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = teacher_subjects.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy availability_slots_select_own_teacher
on public.availability_slots
for select
to authenticated
using (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = availability_slots.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy availability_slots_manage_own_teacher
on public.availability_slots
for all
to authenticated
using (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = availability_slots.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = availability_slots.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy student_intakes_select_owner
on public.student_intakes
for select
to authenticated
using (
  created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.students
    where students.id = student_intakes.student_id
      and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
  )
);

create policy match_results_select_related
on public.match_results
for select
to authenticated
using (
  exists (
    select 1
    from public.student_intakes
    join public.students on students.id = student_intakes.student_id
    where student_intakes.id = match_results.intake_id
      and (
        student_intakes.created_by_user_id = auth.uid()
        or students.user_id = auth.uid()
        or students.parent_user_id = auth.uid()
      )
  )
  or exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = match_results.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy booking_requests_select_related
on public.booking_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.students
    where students.id = booking_requests.student_id
      and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
  )
  or exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = booking_requests.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy lessons_select_related
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.students
    where students.id = lessons.student_id
      and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
  )
  or exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = lessons.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy teacher_students_select_related
on public.teacher_students
for select
to authenticated
using (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = teacher_students.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.students
    where students.id = teacher_students.student_id
      and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
  )
);

create policy lesson_notes_select_related
on public.lesson_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = lesson_notes.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.students
    where students.id = lesson_notes.student_id
      and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
  )
);

create policy conversations_select_related
on public.conversations
for select
to authenticated
using (
  parent_user_id = auth.uid()
  or exists (
    select 1
    from public.students
    where students.id = conversations.student_id
      and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
  )
  or exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = conversations.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy messages_select_related_conversation
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and (
        conversations.parent_user_id = auth.uid()
        or exists (
          select 1
          from public.students
          where students.id = conversations.student_id
            and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
        )
        or exists (
          select 1
          from public.teacher_profiles
          where teacher_profiles.id = conversations.teacher_id
            and teacher_profiles.user_id = auth.uid()
        )
      )
  )
);

create policy lesson_files_select_related
on public.lesson_files
for select
to authenticated
using (
  uploaded_by_user_id = auth.uid()
  or exists (
    select 1
    from public.students
    where students.id = lesson_files.student_id
      and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
  )
  or exists (
    select 1
    from public.lessons
    where lessons.id = lesson_files.lesson_id
      and (
        exists (
          select 1
          from public.students
          where students.id = lessons.student_id
            and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
        )
        or exists (
          select 1
          from public.teacher_profiles
          where teacher_profiles.id = lessons.teacher_id
            and teacher_profiles.user_id = auth.uid()
        )
      )
  )
);

create policy reviews_select_related
on public.reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.students
    where students.id = reviews.student_id
      and (students.user_id = auth.uid() or students.parent_user_id = auth.uid())
  )
  or exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = reviews.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy teacher_subscriptions_select_own_teacher
on public.teacher_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.teacher_profiles
    where teacher_profiles.id = teacher_subscriptions.teacher_id
      and teacher_profiles.user_id = auth.uid()
  )
);

create policy notifications_select_own
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy notifications_update_own
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy system_settings_select_admin
on public.system_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

create policy admin_actions_select_admin
on public.admin_actions
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);

create policy admin_actions_insert_admin
on public.admin_actions
for insert
to authenticated
with check (
  admin_user_id = auth.uid()
  and exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);
