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
   - `EXPO_PUBLIC_ADMIN_USER_IDS=` comma-separated auth user ids allowed to open the moderation screen
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

### Terms and Privacy pages
The onboarding Terms/Privacy links are in-app routes, not external placeholder URLs.

Files:
- Terms: `app/(public)/terms.tsx`
- Privacy: `app/(public)/privacy.tsx`
- Shared page UI: `src/features/legal/LegalDocumentScreen.tsx`
- Link constants: `src/constants/auth.ts`

Expected routes:
- `/terms`
- `/privacy`

Quick check:
1. Start the app.
2. Open `Create account`.
3. Tap `Terms of Use` and confirm the in-app Terms page opens.
4. Go back, tap `Privacy Notice`, and confirm the in-app Privacy page opens.
5. Confirm both pages are reachable while signed out.
6. On the Privacy page, confirm the IMY GDPR complaint link and rights link are visible and open correctly.
7. Before public launch, update the Privacy page with final controller/contact details and review the copy for GDPR/legal completeness.

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

## Social Verification (Phase 1 + Phase 2)
Use this after applying the social migration and running the app in development.

### Apply migration
1. Ensure the social migration exists:
   - `supabase/migrations/20260420000100_social_follows_comments.sql`
2. Apply migrations:
   - `supabase db push`

### Quick checks in the app
1. Sign in with a real dev account.
2. Open `Account`.
3. In development, use the `Dev: social debug` section.
4. Enter a target username or profile id and tap `Load profile`.
5. Tap `Follow`.
6. Confirm counts update in the debug panel.
7. Enter a published post id in the comments area.
8. Tap `Load comments`.
9. Add a test comment and confirm it appears after reload.

### Quick checks in Supabase
In `Table Editor` or `SQL Editor`, verify:
- `follows` contains the new follow row
- `comments` contains the new comment row

Useful SQL:
```sql
select * from public.follows order by created_at desc limit 20;
select * from public.comments order by created_at desc limit 20;
select * from public.get_follow_counts('<profile-uuid>'::uuid);
```

### RLS sanity checks
- App-side follow insert should fail if you try to follow as another user id.
- App-side comment insert should fail if `user_id` does not match `auth.uid()`.
- Comment reads should only work for published post ids.
- Follow counts should still work through `get_follow_counts(...)`.

## Boot Check
- Signed-out users should be redirected to sign-in.
- Signed-out users must not be able to fetch feed data through Supabase; published posts, tags, grades, and comments are authenticated-read only.
- Sign-up should require both checkboxes: `I'm 13+` and `Terms & Privacy`.
- After login, the app should route to authenticated screens.
- Closing and reopening the app should keep the current session when the Supabase auth token is still valid.
- Account screen should show user id, email, username, a `session loaded: yes/no` debug value, and support sign-out.
- Sign-out should return to auth screens.
- Upload screen should allow selecting a video, uploading to Storage, creating a `video_posts` draft row, and playing preview from stored URL.

### Session persistence check
1. Sign in with email/password.
2. Open `Account`.
3. Confirm `Session loaded` shows `yes`.
4. Fully close the app.
5. Reopen the app.
6. Confirm you are still signed in and routed back into the authenticated app.
7. Open `Account` again and confirm `Session loaded` still shows `yes`.

### No-anonymous-browsing check
1. Sign out fully.
2. Confirm the app routes to `/(auth)` instead of the feed.
3. Apply the latest migrations, including `supabase/migrations/20260423000100_rls_require_auth_for_feed_reads.sql`.
4. In Supabase SQL Editor, verify the feed tables no longer grant `anon` read access:
```sql
select policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('video_posts', 'clothing_tags', 'grades', 'comments')
order by tablename, policyname;
```
5. Confirm the published-read policies list only `authenticated`, not `anon`.

## Notes
- Only `EXPO_PUBLIC_*` variables are exposed to the client bundle.
- Keep real secrets out of git. Commit `.env.example`, not `.env`.
- Q1 delivered the placeholder app shell; Q2 added DB migrations and RLS; Q3 added auth gate + profile upsert flow; Q4 added video upload + draft creation.
