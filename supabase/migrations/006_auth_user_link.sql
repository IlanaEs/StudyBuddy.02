-- StudyBuddy.02 Auth Foundation
-- 006_auth_user_link.sql
-- Links local application users to Supabase Auth users without adding product profile logic.

alter table public.users
add column supabase_auth_user_id uuid not null;

alter table public.users
add constraint users_supabase_auth_user_id_unique unique (supabase_auth_user_id);

alter table public.users
add constraint users_supabase_auth_user_id_fk
foreign key (supabase_auth_user_id) references auth.users(id) on delete cascade;

create index users_supabase_auth_user_id_idx on public.users(supabase_auth_user_id);
