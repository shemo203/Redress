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
4. Optional auth envs:
   - `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=false` (set `true` to show Google sign-in button)
   - `EXPO_PUBLIC_GOOGLE_AUTH_REDIRECT_URL=redress://`
   - `EXPO_PUBLIC_DEV_SEED=false` (set `true` to show the dev-only seed instructions screen in Account)
5. Start the Expo dev server:
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
- `supabase/migrations/20260306000100_q4_storage_videos_bucket.sql`

If you are using Supabase SQL Editor instead of CLI:
1. Open the migration file.
2. Copy all SQL from `supabase/migrations/20260305000100_q2_core_schema.sql`.
3. Paste and run it in the SQL Editor.

## Auth Setup (Q3)
### Email/Password
1. In Supabase Dashboard: `Authentication` -> `Providers` -> `Email`.
2. Enable Email provider.
3. Choose whether email confirmation is required.

### Google (optional for Q3)
1. In Supabase Dashboard: `Authentication` -> `Providers` -> `Google`, then enable Google.
2. Configure Google OAuth client credentials in Supabase.
3. Add redirect URLs:
   - App scheme URL: `redress://`
   - Expo dev URL if needed during local testing (from Expo output)
4. In `.env`, set:
   - `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true`
   - `EXPO_PUBLIC_GOOGLE_AUTH_REDIRECT_URL=redress://`

Google is optional in Q3 completion; email/password auth is required.

## Storage Setup (Q4)
Q4 upload uses a public Supabase Storage bucket named `videos`.

### Via migration (recommended)
1. Ensure the Q4 migration is present:
   - `supabase/migrations/20260306000100_q4_storage_videos_bucket.sql`
2. Apply migrations:
   - `supabase db push`

This migration:
- creates bucket `videos` as public
- allows public read from `videos`
- allows authenticated users to insert/update/delete only within their own top-level folder prefix (`auth.uid()/...`)

### Via Supabase Dashboard (manual fallback)
1. Storage -> Create bucket -> name `videos`.
2. Mark bucket as `Public bucket`.
3. Add object policies equivalent to migration:
   - Public `SELECT` for bucket `videos`
   - Authenticated `INSERT/UPDATE/DELETE` limited to objects whose first folder matches `auth.uid()`

Upload path used by app:
- `userId/postId/timestamp.ext`

## Development Seeding
Use this when you want a fuller local/dev dataset for the feed and Reveal Items flows.

Important constraints:
- `supabase/seed.sql` does not create or modify `auth.users`.
- Because `profiles.id` references `auth.users(id)`, the seed script can only upsert profiles for users that already exist.
- For the full dataset, create about 10 dev accounts first. If fewer exist, the script will seed as many as it can from the available users.

### Apply seeds in Supabase SQL Editor
1. In the Supabase Dashboard, open `SQL Editor`.
2. Create a new query.
3. Open `supabase/seed.sql` from this repo.
4. Copy the entire file and paste it into SQL Editor.
5. Run the query.
6. Reload the app.

The script will:
- upsert seeded profile content for up to 10 existing auth users
- recreate 20 deterministic published `video_posts`
- recreate 50 deterministic `clothing_tags`

### Optional in-app dev helper
If you want a reminder screen inside the app, set:
- `EXPO_PUBLIC_DEV_SEED=true`

Then open `Account` and use the dev-only `Seed database instructions` link.

## Boot Check
- Signed-out users should be redirected to sign-in.
- Sign-up should require both checkboxes: `I'm 13+` and `Terms & Privacy`.
- After login, the app should route to authenticated screens.
- Account screen should show user id, email, username, and support sign-out.
- Sign-out should return to auth screens.
- Upload screen should allow selecting a video, uploading to Storage, creating a `video_posts` draft row, and playing preview from stored URL.

## Notes
- Only `EXPO_PUBLIC_*` variables are exposed to the client bundle.
- Keep real secrets out of git. Commit `.env.example`, not `.env`.
- Q1 delivered the placeholder app shell; Q2 added DB migrations and RLS; Q3 added auth gate + profile upsert flow; Q4 added video upload + draft creation.
