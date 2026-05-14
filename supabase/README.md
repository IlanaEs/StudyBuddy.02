# StudyBuddy.02 Supabase Foundation

Project ref: `ucptoyqlsysnxfjgqttq`

Dashboard:
https://supabase.com/dashboard/project/ucptoyqlsysnxfjgqttq/editor

## Environment

Do not hardcode secrets. Use environment variables:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` must only be used in trusted backend/server contexts.

## Migration Order

```text
001_enums_and_common.sql
002_core_users_students_teachers.sql
003_matching_booking_lessons.sql
004_crm_chat_notifications.sql
005_rls_policies.sql
006_auth_user_link.sql
007_security_hardening.sql
```

The migrations define the approved MVP schema only. No product flows, matching logic,
booking approval logic, payment providers, or database seed data are included.
