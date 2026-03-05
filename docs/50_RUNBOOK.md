# Runbook

## Requirements
- Node 20+ and npm
- Expo Go, iOS Simulator, or Android Emulator
- A Supabase project for development

## Local Setup
1. Install dependencies:
   `npm install`
2. Create a local env file from the example:
   `cp .env.example .env`
3. Set both values in `.env`:
   - `EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`
4. Start the Expo dev server:
   `npm run start`

## Supabase Migrations (Q2)
1. Install Supabase CLI (one-time): `brew install supabase/tap/supabase`
2. From project root, link/login as needed:
   - `supabase login`
   - `supabase link --project-ref <your-project-ref>`
3. Apply migrations to linked project:
   - `supabase db push`

Migration added in Q2:
- `supabase/migrations/20260305000100_q2_core_schema.sql`

If you are using Supabase SQL Editor instead of CLI:
1. Open the migration file.
2. Copy all SQL from `supabase/migrations/20260305000100_q2_core_schema.sql`.
3. Paste and run it in the SQL Editor.

## Boot Check
- The app should open to a placeholder screen.
- The screen should show `Hello / Logged out`.
- The screen should show `Supabase configured: yes` when both env vars are set.
- If either env var is missing, the screen should show `Supabase configured: no`.

## Notes
- Only `EXPO_PUBLIC_*` variables are exposed to the client bundle.
- Keep real secrets out of git. Commit `.env.example`, not `.env`.
- Q1 delivered the placeholder app shell; Q2 adds the first DB migrations and RLS policies.
