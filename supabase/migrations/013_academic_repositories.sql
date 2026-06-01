-- Migration 013: Controlled academic repositories for teacher onboarding.

create table public.academic_institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_institutions_name_not_blank check (length(trim(name)) > 0)
);

create unique index academic_institutions_name_unique_idx
  on public.academic_institutions (lower(name));

create table public.academic_fields (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_fields_name_not_blank check (length(trim(name)) > 0)
);

create unique index academic_fields_name_unique_idx
  on public.academic_fields (lower(name));

create table public.academic_repository_requests (
  id uuid primary key default gen_random_uuid(),
  repository_type text not null,
  requested_name text not null,
  requested_by_user_id uuid not null,
  status text not null default 'pending',
  reviewed_by_admin_user_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint academic_repository_requests_type_check
    check (repository_type in ('institution', 'field')),
  constraint academic_repository_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint academic_repository_requests_name_not_blank
    check (length(trim(requested_name)) > 0),
  constraint academic_repository_requests_requested_by_fk
    foreign key (requested_by_user_id) references public.users(id) on delete cascade,
  constraint academic_repository_requests_reviewed_by_fk
    foreign key (reviewed_by_admin_user_id) references public.users(id) on delete set null
);

create index academic_institutions_active_name_idx
  on public.academic_institutions (is_active, name);

create index academic_fields_active_name_idx
  on public.academic_fields (is_active, name);

create index academic_repository_requests_user_status_idx
  on public.academic_repository_requests (requested_by_user_id, status);

create trigger set_academic_institutions_updated_at
before update on public.academic_institutions
for each row execute function public.set_updated_at();

create trigger set_academic_fields_updated_at
before update on public.academic_fields
for each row execute function public.set_updated_at();

alter table public.academic_institutions enable row level security;
alter table public.academic_fields enable row level security;
alter table public.academic_repository_requests enable row level security;

insert into public.academic_institutions (name, category) values
  ('אוניברסיטת בן-גוריון בנגב', 'אוניברסיטה'),
  ('אוניברסיטת בר-אילן', 'אוניברסיטה'),
  ('אוניברסיטת חיפה', 'אוניברסיטה'),
  ('האוניברסיטה העברית בירושלים', 'אוניברסיטה'),
  ('אוניברסיטת תל אביב', 'אוניברסיטה'),
  ('הטכניון - מכון טכנולוגי לישראל', 'אוניברסיטה'),
  ('מכון ויצמן למדע', 'אוניברסיטה'),
  ('אוניברסיטת אריאל בשומרון', 'אוניברסיטה'),
  ('האוניברסיטה הפתוחה', 'אוניברסיטה'),
  ('אוניברסיטת רייכמן', 'אוניברסיטה'),
  ('המסלול האקדמי המכללה למינהל', 'מכללה'),
  ('המכללה האקדמית תל אביב-יפו', 'מכללה'),
  ('HIT מכון טכנולוגי חולון', 'מכללה'),
  ('המכללה האקדמית ספיר', 'מכללה'),
  ('המכללה האקדמית תל-חי', 'מכללה'),
  ('המרכז האקדמי רופין', 'מכללה'),
  ('הקריה האקדמית אונו', 'מכללה'),
  ('אפקה - המכללה האקדמית להנדסה בתל אביב', 'מכללה'),
  ('שנקר - הנדסה. עיצוב. אמנות', 'מכללה'),
  ('עזריאלי - המכללה האקדמית להנדסה ירושלים', 'מכללה'),
  ('בצלאל - אקדמיה לאמנות ועיצוב ירושלים', 'מכללה'),
  ('האקדמיה למוסיקה ולמחול בירושלים', 'מכללה'),
  ('מכללת סמינר הקיבוצים', 'מכללה'),
  ('המכללה האקדמית בית ברל', 'מכללה'),
  ('מכללת אורנים', 'מכללה')
on conflict (lower(name)) do nothing;

insert into public.academic_fields (name, category) values
  ('מדעי המחשב', 'מדעים והנדסה'),
  ('הנדסת תוכנה', 'מדעים והנדסה'),
  ('מתמטיקה', 'מדעים והנדסה'),
  ('פיזיקה', 'מדעים והנדסה'),
  ('כימיה', 'מדעים והנדסה'),
  ('מדעי המידע / Data Science', 'מדעים והנדסה'),
  ('הנדסת חשמל ואלקטרוניקה', 'מדעים והנדסה'),
  ('הנדסת תעשייה וניהול', 'מדעים והנדסה'),
  ('ביולוגיה / מדעי החיים', 'מדעים והנדסה'),
  ('פסיכולוגיה', 'חברה ורוח'),
  ('כלכלה', 'חברה ורוח'),
  ('מנהל עסקים / ניהול', 'חברה ורוח'),
  ('חשבונאות', 'חברה ורוח'),
  ('משפטים', 'חברה ורוח'),
  ('תקשורת', 'חברה ורוח'),
  ('מוזיקה / קומפוזיציה / ביצוע', 'אמנות'),
  ('אמנות פלסטית / ציור ופיסול', 'אמנות'),
  ('עיצוב גרפי / תקשורת חזותית', 'אמנות'),
  ('אדריכלות / עיצוב פנים', 'אמנות'),
  ('קולנוע וטלוויזיה', 'אמנות'),
  ('חינוך מיוחד / הוראה מתקנת', 'חינוך'),
  ('הוראת אנגלית', 'חינוך'),
  ('חינוך לגיל הרך / יסודי / על-יסודי', 'חינוך')
on conflict (lower(name)) do nothing;
