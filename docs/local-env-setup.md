# Local Environment Setup

Copy each example file to a local environment file before running the app:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Fill in the missing Supabase values from the Supabase project dashboard:

- `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`: Project Settings > API > Project API keys > anon public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings > API > Project API keys > service_role key. Use this only on the backend.
- `DATABASE_URL`: Project Settings > Database > Connection string. Use the password for the project database user.

Never commit real secrets, local `.env` files, service role keys, or database passwords.
