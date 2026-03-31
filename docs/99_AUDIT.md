# Project Audit

Date: 2026-03-31

Scope:
- Re-read [docs/10_PRODUCT.md](/Users/sherwan/Desktop/Redress/docs/10_PRODUCT.md) and [docs/11_PRD_FULL.md](/Users/sherwan/Desktop/Redress/docs/11_PRD_FULL.md)
- Cross-check current Expo app, Supabase migrations, and current docs
- No product changes in this pass; audit only

## Sanity Summary
- Core MVP loop is mostly present:
  - auth gate
  - upload draft
  - tagging
  - atomic publish
  - vertical feed
  - 1 to 10 grading
  - reveal items
  - outbound click logging
  - reporting
- The biggest gaps are not the core loop itself. They are:
  - release readiness / friend-sharing workflow
  - privacy/legal readiness
  - feed ranking and analytics instrumentation
  - moderation depth beyond report submission

## PRD Coverage Matrix

| PRD MVP requirement | Status | Where it lives |
| --- | --- | --- |
| Auth required before app access | Partial | Route gating is enforced in `app/(auth)/_layout.tsx` and `app/(app)/_layout.tsx`, but RLS still allows `anon` reads on published posts/tags/grades |
| Email/password sign-up and sign-in | Done | `app/(auth)/sign-up.tsx`, `app/(auth)/sign-in.tsx` |
| Google sign-in / login | Partial | `app/(auth)/sign-in.tsx`, `src/constants/auth.ts`; depends on provider/env config, not verifiable from repo alone |
| 13+ checkbox and Terms/Privacy acceptance on sign-up | Done | `app/(auth)/sign-up.tsx` |
| Email verification preferred for abuse reduction | Partial | Supported by Supabase if enabled, but not enforced or surfaced as a product step in code/docs |
| Upload video from device | Done | `app/(app)/upload.tsx`, storage bucket migration `supabase/migrations/20260306000100_q4_storage_videos_bucket.sql` |
| Optional in-app recording | Not started | No recording flow found in `app/` or `src/` |
| Basic trim/crop support | Not started | No trim/crop flow found in `app/` or `src/` |
| Caption field on upload | Done | `app/(app)/upload.tsx` |
| Creator must add at least one tag before publishing | Done | `app/(app)/draft/[postId].tsx`, `public.publish_post()` in `supabase/migrations/20260305000100_q2_core_schema.sql` |
| Publish flow is atomic | Done | `public.publish_post()` RPC in `supabase/migrations/20260305000100_q2_core_schema.sql` |
| Tag includes name + category + optional brand | Done | `app/(app)/draft/[postId].tsx`, `public.clothing_tags` schema |
| Tag outbound URL support | Done | `app/(app)/draft/[postId].tsx`, `src/utils/urlValidation.ts`, `supabase/migrations/20260331000200_q5_optional_tag_urls.sql`, `docs/11_PRD_FULL.md` |
| Full-screen vertical feed | Done | `app/(app)/index.tsx` |
| Autoplay active video / pause inactive | Done | `app/(app)/index.tsx`, `expo-video` usage |
| Swipe up/down feed navigation | Done | `app/(app)/index.tsx` with paging `FlatList` |
| Show username, caption, visible average grade | Done | `app/(app)/index.tsx` |
| Grade CTA visible in feed | Done | `app/(app)/index.tsx` |
| Reveal Items CTA visible in feed | Done | `app/(app)/index.tsx` |
| Share and report options on video screen | Partial | Report exists in `app/(app)/index.tsx`; no share action found |
| Engagement-based feed ranking | Not started | Feed query is recency-based in `app/(app)/index.tsx` (`order("created_at", { ascending: false })`) |
| Reveal Items sheet lists tagged items | Done | `app/(app)/index.tsx` |
| Tapping a tagged item opens external page | Done | `app/(app)/index.tsx`, `expo-web-browser` |
| 1 to 10 grading only | Done | `app/(app)/index.tsx`, `public.grades` check in `supabase/migrations/20260305000100_q2_core_schema.sql` |
| One grade per user per outfit | Done | `public.grades unique(user_id, post_id)`, `grades_insert_own_user` policy, duplicate handling in `app/(app)/index.tsx` |
| Average grade displayed rounded to one decimal | Done | `app/(app)/index.tsx` |
| No likes in MVP | Done | No like model or UI found; feed interaction is grading only |
| No grade edit/delete flow in MVP | Done | No update/delete policies on `grades`; no UI for editing grades |
| Anti-bot / rate-limiting around grading and posting | Partial | Short client cooldown for grading in `app/(app)/index.tsx`; no server-side rate limiting found |
| Profile page exists | Done | `app/(app)/account.tsx` |
| Profile shows posted outfit videos | Partial | `app/(app)/account.tsx` shows recent fits, but not a dedicated full profile/content browser |
| Profile photo and bio | Partial | Schema supports `avatar_url` and `bio` in `public.profiles`; current UI shows monogram and summary copy, not avatar/bio editing/display |
| Follower/following counts if included in MVP | Not started | No social graph tables or UI found |
| Report video | Done | `app/(app)/index.tsx`, `src/features/reports/*`, `public.reports` |
| Report profile | Done | `app/(app)/index.tsx`, `src/features/reports/*`, `public.reports` |
| Report link | Done | `app/(app)/index.tsx`, `src/features/reports/*`, `public.reports` |
| Fixed report reasons from PRD | Done | `src/features/reports/index.ts`, `supabase/migrations/20260331000100_q10_reports_constraints_and_read_policy.sql` |
| Basic moderation controls from day one | Partial | Reporting exists, but no admin review flow, moderation actions, or suspension tooling found |
| Validate outbound links before publish | Done | `src/utils/urlValidation.ts`, `app/(app)/draft/[postId].tsx`, DB checks in `supabase/migrations/20260305000100_q2_core_schema.sql` and `20260331000200_q5_optional_tag_urls.sql` |
| Block non-http/https / unsafe schemes | Done | `src/utils/urlValidation.ts`, `public.is_http_url()` |
| Domain allow/block logic for unsafe domains | Partial | Mentioned in docs; no active domain blocklist enforcement found in tag save path |
| Outbound clicks logged | Done | `src/features/analytics/index.ts`, `app/(app)/index.tsx`, `public.outbound_clicks` |
| GDPR-ready privacy foundations | Partial | Sign-up consent gate exists, but Terms/Privacy URLs are placeholders and delete/export/retention workflows are not implemented |
| KPI measurement support for MVP | Partial | `docs/70_KPI_QUERIES.md` and `docs/71_KPI_DEFINITIONS.md` exist, but several KPIs still require view/impression instrumentation |
| Launch readiness for public MVP | Partial | Core loop mostly works, but legal URLs, EAS/TestFlight setup, and external QA workflow are not fully wired in repo |

## Top 10 Risks

| Risk | Why it matters | Concrete mitigation |
| --- | --- | --- |
| 1. Backend still allows anonymous content reads | Product/docs say auth is required, but RLS allows `anon` reads for published posts, tags, and grades | Remove `anon` from those `SELECT` policies if auth-only access is the real product rule |
| 2. Terms and Privacy URLs still point to placeholders | Sharing externally without real legal pages is a trust and compliance risk | Replace `https://example.com/*` in `src/constants/auth.ts` with live pages before any friend beta |
| 3. Release distribution is not configured | There is no `eas.json`, so there is no reproducible iOS/TestFlight build path in repo yet | Add EAS config, set iOS bundle identifier, create preview and production profiles, and document one canonical release flow |
| 4. Feed ranking is recency-only, not engagement-based | The core discovery surface may feel low-quality and won’t validate the PRD ranking thesis | Add instrumentation first, then ship a simple ranking pass using recency + grades + negative report signal |
| 5. Analytics denominators are missing | You can count clicks and grades, but you cannot compute true impression-based CTR or viewer conversion today | Add `post_impressions` and `tag_reveals` tables before trying to tune feed/ranking from KPIs |
| 6. No real moderation ops path after a report is filed | Reports can be submitted, but there is no in-repo admin workflow to review or act on them | Add a lightweight moderator runbook or internal admin screen backed by service-role queries |
| 7. Abuse prevention is mostly client-side | Client cooldown is easy to bypass; posting/reporting/grading can still be spammed at the backend level | Add server-side rate limiting or an edge-function gateway for grade/report/post writes, and prefer verified email for dev/prod |
| 8. Video performance/cost risk | Upload accepts large files, with no duration/orientation/transcoding enforcement; this can hurt UX and storage cost fast | Add client validation for duration/orientation, then introduce transcoding/compression before broader testing |
| 9. Public storage bucket exposes all uploaded videos | Public URLs are simple for MVP, but they widen scraping/privacy exposure | Decide explicitly whether public video delivery is acceptable for MVP; if not, move to signed URLs or a gated delivery pattern |
| 10. GDPR basics are incomplete | The PRD promises deletion/export/retention foundations, but the repo does not yet ship those workflows | Add at least an account deletion request path, data export/delete runbook, and explicit retention notes before external testing |

## Data Integrity Checks

### One grade per user per post
- Confirmed in DB:
  - `public.grades` has `unique (user_id, post_id)` in [supabase/migrations/20260305000100_q2_core_schema.sql](/Users/sherwan/Desktop/Redress/supabase/migrations/20260305000100_q2_core_schema.sql)
  - `value` is constrained to `1..10`
- Confirmed in app:
  - Feed grading UI blocks repeat grading and maps duplicate DB failures to `Already graded` in [app/(app)/index.tsx](/Users/sherwan/Desktop/Redress/app/(app)/index.tsx)
- Audit result: `Confirmed`

### Cannot publish without >= 1 tag
- Confirmed in DB:
  - `public.publish_post(post_id)` only updates draft -> published when a matching `clothing_tags` row exists in [supabase/migrations/20260305000100_q2_core_schema.sql](/Users/sherwan/Desktop/Redress/supabase/migrations/20260305000100_q2_core_schema.sql)
- Confirmed in app:
  - Draft screen shows a friendly error before calling the RPC when `tags.length === 0` in [app/(app)/draft/[postId].tsx](/Users/sherwan/Desktop/Redress/app/(app)/draft/[postId].tsx)
- Audit result: `Confirmed`

### URL scheme safety
- Confirmed in DB:
  - `public.is_http_url()` is used for `video_posts.video_url`, `outbound_clicks.url`, and `clothing_tags.url` when present
  - latest tag migration makes tag URLs nullable but still requires `http/https` when present in [supabase/migrations/20260331000200_q5_optional_tag_urls.sql](/Users/sherwan/Desktop/Redress/supabase/migrations/20260331000200_q5_optional_tag_urls.sql)
- Confirmed in app:
  - client validator rejects `javascript:`, `data:`, `file:`, `blob:` and malformed URLs in [src/utils/urlValidation.ts](/Users/sherwan/Desktop/Redress/src/utils/urlValidation.ts)
  - draft tag save path reuses that validator in [app/(app)/draft/[postId].tsx](/Users/sherwan/Desktop/Redress/app/(app)/draft/[postId].tsx)
  - Reveal Items open path reuses that validator in [app/(app)/index.tsx](/Users/sherwan/Desktop/Redress/app/(app)/index.tsx)
- Gap:
  - no active domain blocklist enforcement found in the tag save path
- Audit result: `Confirmed for scheme safety, Partial for domain-based safety`

### Report flow exists
- Confirmed in DB:
  - `public.reports` exists with target types and report reasons
  - Q10 migration constrains reasons and adds own-report debug reads in [supabase/migrations/20260331000100_q10_reports_constraints_and_read_policy.sql](/Users/sherwan/Desktop/Redress/supabase/migrations/20260331000100_q10_reports_constraints_and_read_policy.sql)
- Confirmed in app:
  - report composer UI in [src/features/reports/ReportComposer.tsx](/Users/sherwan/Desktop/Redress/src/features/reports/ReportComposer.tsx)
  - post/profile/link report entry points in [app/(app)/index.tsx](/Users/sherwan/Desktop/Redress/app/(app)/index.tsx)
  - dev-only report debug list in [app/(app)/account.tsx](/Users/sherwan/Desktop/Redress/app/(app)/account.tsx)
- Audit result: `Confirmed`

## RLS Review

| Table | SELECT | INSERT | UPDATE | DELETE | Notes / gaps |
| --- | --- | --- | --- | --- | --- |
| `profiles` | Authenticated users can read all profiles | Authenticated users can insert only own row (`id = auth.uid()`) | Authenticated users can update only own row | No delete policy | Reasonable for social discovery. No explicit self-delete path in app |
| `video_posts` | Public can read published posts; authenticated users can also read own posts | Authenticated users can insert only own drafts | Authenticated users can update only own drafts | Authenticated users can delete only own drafts | Good protection around publish integrity; published content is immutable from normal client writes |
| `clothing_tags` | Public can read tags for published posts; authenticated users can also read own tags | Authenticated users can insert only own tags on own draft posts | Authenticated users can update only own tags on own draft posts | Authenticated users can delete only own tags on own draft posts | Good ownership model. Final behavior depends on the optional-URL migration being applied |
| `grades` | Public/authenticated can read grades for published posts | Authenticated users can insert only own grades for published posts | No update policy | No delete policy | Strong integrity. Potential exposure gap: raw grade rows are readable even though UI hides distribution |
| `reports` | Authenticated users can read only their own reports | Authenticated users can insert only own reports | No update policy | No delete policy | Safe for normal clients. Admin review path is not exposed in-app and depends on dashboard/service-role access |
| `outbound_clicks` | No read policy | Authenticated users can insert only own clicks for published posts | No update policy | No delete policy | Privacy-friendly for client apps. Analytics reads require service-role or SQL editor access |

### Unsafe or noteworthy gaps
- `video_posts`, `clothing_tags`, and `grades` allow `anon` `SELECT` for published data, which conflicts with the product rule that the app should require auth and not support anonymous browsing.
- `grades` raw rows are readable for published posts. That is not inherently unsafe, but it exposes more data than the product UI currently surfaces.
- `reports.target_id` is UUID-shaped text, not a strict foreign key to multiple target tables. This is acceptable for MVP flexibility, but it is weaker than table-level referential integrity.
- Storage is public for videos. This is not an RLS table issue, but it is still a security/privacy decision that should be treated explicitly.
- There is no server-side rate-limit layer on top of RLS policies for grades, reports, or outbound clicks.

## Shipping Checklist

Goal:
- Share the app with a friend on iPhone using a repeatable Expo/EAS flow, not just Expo Go on your own device

### 1. Lock the backend and env
1. Ensure all migrations are applied:
   - `supabase db push`
2. Verify `.env` values locally:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED`
   - `EXPO_PUBLIC_GOOGLE_AUTH_REDIRECT_URL`
3. Decide whether the product is truly auth-only:
   - if yes, remove `anon` read access from published posts, tags, and grades before sharing externally
4. Replace placeholder legal URLs in [src/constants/auth.ts](/Users/sherwan/Desktop/Redress/src/constants/auth.ts)
5. Decide whether `EXPO_PUBLIC_REQUIRE_TAG_URLS` should stay `true` or `false` for the friend build

### 2. Configure EAS for the first time
1. Install and log in:
   - `npm install -g eas-cli`
   - `eas login`
2. Configure the project:
   - `npx eas build:configure`
3. Add an `eas.json` with at least:
   - a `preview` profile for internal testing
   - a `production` profile for TestFlight
4. Add iOS identifiers in `app.json` / app config:
   - bundle identifier
   - display name/version/build number strategy

### 3. Prepare Apple-side distribution
1. Connect to the correct Apple Developer account in EAS
2. Let EAS manage certificates/profiles unless you have a reason not to
3. For TestFlight:
   - ensure App Store Connect app record exists
   - confirm privacy metadata and app description basics are ready

### 4. Build and distribute
Fastest internal friend test:
1. Run:
   - `npx eas build --platform ios --profile preview`
2. Share the generated internal build link with the friend

TestFlight path:
1. Run:
   - `npx eas build --platform ios --profile production`
2. Submit:
   - `npx eas submit --platform ios --latest`
3. Add the friend in App Store Connect TestFlight internal/external testers

### 5. Seed / content prep before sharing
1. Create a few dev accounts in Supabase Auth
2. Run [supabase/seed.sql](/Users/sherwan/Desktop/Redress/supabase/seed.sql) from Supabase SQL Editor as documented in [docs/50_RUNBOOK.md](/Users/sherwan/Desktop/Redress/docs/50_RUNBOOK.md)
3. Confirm the feed is not empty

### 6. Friend QA checklist
Verify on-device:
1. Sign up and sign in works
2. Terms/Privacy links open to real pages
3. Upload a video and create a draft
4. Add at least one tag and publish
5. Published post appears in feed
6. Active video autoplays and inactive video pauses
7. Reveal Items opens quickly
8. Safe links open; empty-link tags are non-clickable if that flag is off
9. Grading works once and shows `Already graded` on repeat
10. Average score updates correctly
11. Reporting works for post, profile, and link
12. Sign out and password reset still work

### 7. Minimum go / no-go before sharing
- `npx tsc --noEmit` passes
- Expo app boots locally
- Supabase migrations are applied
- legal URLs are not placeholders
- one seeded or real published post exists
- one complete manual smoke test passes on a physical iPhone

## Docs / Implementation Inconsistencies

Actionable TODOs, capped to the highest-signal items:

1. Product/docs say auth is required and anonymous browsing is out of scope, but RLS still allows `anon` reads on published posts, tags, and grades.
2. PRD says feed ranking should be engagement-based. Current feed query is recency-only in [app/(app)/index.tsx](/Users/sherwan/Desktop/Redress/app/(app)/index.tsx).
3. PRD mentions share/report options on the video screen. Current implementation has report only; no share action found.
4. PRD includes optional in-app recording. No recording flow exists.
5. PRD includes basic trim/crop support. No trim/crop flow exists.
6. PRD recommends 15 to 60 second video limits. Upload only enforces max file size, not duration.
7. PRD says profile should include profile photo and bio. Schema supports them, but the current Account UI does not display or edit them.
8. Product/legal docs expect real Terms and Privacy pages, but [src/constants/auth.ts](/Users/sherwan/Desktop/Redress/src/constants/auth.ts) still uses placeholder URLs.
9. PRD expects GDPR basics like export/delete/retention. No user-facing deletion/export workflow or runbook is present.
10. PRD expects link allow/block logic for unsafe domains. Current implementation enforces scheme safety but no active domain blocklist.
11. PRD expects reported content to be reviewable by admins. Current repo supports report submission but not admin review tooling or moderation actions.
12. KPI docs correctly mark some metrics as unavailable, but the PRD still frames them as launch KPIs; add impression/reveal instrumentation or explicitly mark those KPIs as phase-2 measurement.
13. Release distribution is implied by launch-readiness criteria, but the repo has no `eas.json` or documented TestFlight build profile.

## Highest-Leverage Next Slice

Build a `launch hardening` slice.

Why this is the highest leverage:
- The core MVP loop already exists well enough to learn from real users.
- The biggest blocker is no longer feature breadth. It is trust and launch safety:
  - auth-only is promised but not enforced at the RLS layer
  - legal URLs are placeholders
  - external distribution is not configured
- Fixing those items gets the project from “local prototype” to “safe friend beta.”

Scope of that slice:
- remove `anon` read access from published posts, tags, and grades if auth-only remains the product rule
- replace placeholder Terms/Privacy URLs
- add `eas.json` and iOS build profiles
- write a short external QA / friend-beta runbook
- produce a TestFlight or internal iOS build
