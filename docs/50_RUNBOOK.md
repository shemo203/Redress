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

## Boot Check
- The app should open to a placeholder screen.
- The screen should show `Hello / Logged out`.
- The screen should show `Supabase configured: yes` when both env vars are set.
- If either env var is missing, the screen should show `Supabase configured: no`.

## Notes
- Only `EXPO_PUBLIC_*` variables are exposed to the client bundle.
- Keep real secrets out of git. Commit `.env.example`, not `.env`.
- Q1 does not include auth, schema changes, or product flows beyond the placeholder boot screen.
