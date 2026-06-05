-- StudyBuddy.02 DB Schema
-- 019_lesson_files_booking_request.sql
-- Attachments upload at BOOKING time (before a lesson exists): link lesson_files
-- to a booking_request, then carry to the lesson on approval. Reuses lesson_files
-- (Sacred Naming) — no parallel table. The private storage object path is stored
-- in the existing lesson_files.file_url column (never a public URL).

alter table public.lesson_files
  add column if not exists booking_request_id uuid;

alter table public.lesson_files
  drop constraint if exists lesson_files_booking_request_id_fk;
alter table public.lesson_files
  add constraint lesson_files_booking_request_id_fk
  foreign key (booking_request_id) references public.booking_requests(id) on delete set null;

create index if not exists lesson_files_booking_request_id_idx
  on public.lesson_files(booking_request_id);

comment on column public.lesson_files.booking_request_id is
  'Booking the file was attached to at booking time (before a lesson exists). On approval lesson_id is set; access is scoped to the uploader and the booking/lesson teacher.';
comment on column public.lesson_files.file_url is
  'PRIVATE storage object path in the lesson-attachments bucket (NOT a public URL). Access only via short-lived signed URLs minted after an owner/teacher check.';

-- Recreate the select policy to also allow the teacher on the booking_request,
-- so booking-stage files (no lesson yet) are visible to that teacher. RLS stays
-- a defense-in-depth backstop; the API enforces the same access via the service role.
drop policy if exists lesson_files_select_related on public.lesson_files;
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
    from public.booking_requests
    where booking_requests.id = lesson_files.booking_request_id
      and exists (
        select 1
        from public.teacher_profiles
        where teacher_profiles.id = booking_requests.teacher_id
          and teacher_profiles.user_id = auth.uid()
      )
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
