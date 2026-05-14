-- StudyBuddy.02 DB Schema v1
-- 004_crm_chat_notifications.sql
-- CRM continuity, notes, chat metadata, reviews, subscriptions, notifications, and admin metadata.

create table public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid not null,
  source public.student_source not null,
  status public.teacher_student_status not null default 'active',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_students_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete cascade,
  constraint teacher_students_student_id_fk foreign key (student_id) references public.students(id) on delete restrict,
  constraint teacher_students_teacher_student_unique unique (teacher_id, student_id)
);

create table public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  teacher_id uuid not null,
  student_id uuid not null,
  private_note text,
  shared_summary text,
  homework text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_notes_lesson_id_fk foreign key (lesson_id) references public.lessons(id) on delete cascade,
  constraint lesson_notes_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete restrict,
  constraint lesson_notes_student_id_fk foreign key (student_id) references public.students(id) on delete restrict,
  constraint lesson_notes_lesson_id_unique unique (lesson_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid not null,
  parent_user_id uuid,
  lesson_id uuid,
  status public.conversation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete restrict,
  constraint conversations_student_id_fk foreign key (student_id) references public.students(id) on delete restrict,
  constraint conversations_parent_user_id_fk foreign key (parent_user_id) references public.users(id) on delete restrict,
  constraint conversations_lesson_id_fk foreign key (lesson_id) references public.lessons(id) on delete set null
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_user_id uuid not null,
  content text,
  message_type public.message_type not null default 'text',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_conversation_id_fk foreign key (conversation_id) references public.conversations(id) on delete cascade,
  constraint messages_sender_user_id_fk foreign key (sender_user_id) references public.users(id) on delete restrict,
  constraint messages_content_required_check check (message_type <> 'text' or content is not null)
);

create table public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  uploaded_by_user_id uuid not null,
  student_id uuid,
  lesson_id uuid,
  message_id uuid,
  file_url text not null,
  file_name varchar(255),
  file_type varchar(100),
  file_size_bytes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_files_uploaded_by_user_id_fk foreign key (uploaded_by_user_id) references public.users(id) on delete restrict,
  constraint lesson_files_student_id_fk foreign key (student_id) references public.students(id) on delete restrict,
  constraint lesson_files_lesson_id_fk foreign key (lesson_id) references public.lessons(id) on delete set null,
  constraint lesson_files_message_id_fk foreign key (message_id) references public.messages(id) on delete set null,
  constraint lesson_files_file_size_bytes_check check (file_size_bytes is null or file_size_bytes >= 0),
  constraint lesson_files_context_check check (student_id is not null or lesson_id is not null or message_id is not null)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  student_id uuid not null,
  teacher_id uuid not null,
  rating smallint not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_lesson_id_fk foreign key (lesson_id) references public.lessons(id) on delete restrict,
  constraint reviews_student_id_fk foreign key (student_id) references public.students(id) on delete restrict,
  constraint reviews_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete restrict,
  constraint reviews_rating_check check (rating between 1 and 5),
  constraint reviews_lesson_student_unique unique (lesson_id, student_id)
);

create table public.teacher_subscriptions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  plan public.subscription_plan not null,
  status public.subscription_status not null,
  monthly_price numeric(10,2) not null,
  commission_percentage numeric(5,2) not null,
  student_limit integer,
  started_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_subscriptions_teacher_id_fk foreign key (teacher_id) references public.teacher_profiles(id) on delete cascade,
  constraint teacher_subscriptions_monthly_price_check check (monthly_price >= 0),
  constraint teacher_subscriptions_commission_percentage_check check (commission_percentage >= 0),
  constraint teacher_subscriptions_student_limit_check check (student_limit is null or student_limit >= 0),
  constraint teacher_subscriptions_dates_check check (expires_at is null or expires_at >= started_at)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type public.notification_type not null,
  channel public.notification_channel not null default 'email',
  title varchar(255) not null,
  body text,
  related_entity_type varchar(100),
  related_entity_id uuid,
  status public.notification_status not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_user_id_fk foreign key (user_id) references public.users(id) on delete cascade,
  constraint notifications_sent_status_check check (
    (status = 'sent' and sent_at is not null)
    or (status <> 'sent')
  )
);

create table public.system_settings (
  key varchar(100) primary key,
  value jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action_type varchar(100) not null,
  target_entity_type varchar(100) not null,
  target_entity_id uuid not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_actions_admin_user_id_fk foreign key (admin_user_id) references public.users(id) on delete restrict
);

create index teacher_students_teacher_id_idx on public.teacher_students(teacher_id);
create index teacher_students_student_id_idx on public.teacher_students(student_id);
create index teacher_students_status_idx on public.teacher_students(status);
create index lesson_notes_lesson_id_idx on public.lesson_notes(lesson_id);
create index lesson_notes_teacher_id_idx on public.lesson_notes(teacher_id);
create index lesson_notes_student_id_idx on public.lesson_notes(student_id);
create index conversations_teacher_id_idx on public.conversations(teacher_id);
create index conversations_student_id_idx on public.conversations(student_id);
create index conversations_parent_user_id_idx on public.conversations(parent_user_id);
create index conversations_lesson_id_idx on public.conversations(lesson_id);
create index conversations_status_idx on public.conversations(status);
create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_sender_user_id_idx on public.messages(sender_user_id);
create index messages_created_at_idx on public.messages(created_at);
create index lesson_files_uploaded_by_user_id_idx on public.lesson_files(uploaded_by_user_id);
create index lesson_files_student_id_idx on public.lesson_files(student_id);
create index lesson_files_lesson_id_idx on public.lesson_files(lesson_id);
create index lesson_files_message_id_idx on public.lesson_files(message_id);
create index reviews_lesson_id_idx on public.reviews(lesson_id);
create index reviews_student_id_idx on public.reviews(student_id);
create index reviews_teacher_id_idx on public.reviews(teacher_id);
create index teacher_subscriptions_teacher_id_idx on public.teacher_subscriptions(teacher_id);
create index teacher_subscriptions_status_idx on public.teacher_subscriptions(status);
create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_status_idx on public.notifications(status);
create index notifications_user_status_idx on public.notifications(user_id, status);
create index admin_actions_admin_user_id_idx on public.admin_actions(admin_user_id);
create index admin_actions_target_idx on public.admin_actions(target_entity_type, target_entity_id);

create trigger set_teacher_students_updated_at
before update on public.teacher_students
for each row execute function public.set_updated_at();

create trigger set_lesson_notes_updated_at
before update on public.lesson_notes
for each row execute function public.set_updated_at();

create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create trigger set_lesson_files_updated_at
before update on public.lesson_files
for each row execute function public.set_updated_at();

create trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create trigger set_teacher_subscriptions_updated_at
before update on public.teacher_subscriptions
for each row execute function public.set_updated_at();

create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create trigger set_system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

create trigger set_admin_actions_updated_at
before update on public.admin_actions
for each row execute function public.set_updated_at();
