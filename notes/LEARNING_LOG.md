## Q6 — Publish Flow + Published Posts

### What changed
- Added a Publish CTA on the Draft Post screen that calls Supabase RPC `publish_post(post_id)`.
- Added friendly publish error handling and success state updates (`status = published`) with a `View in feed` link.
- Added a minimal Published Posts screen that queries `video_posts` with `status='published'`.

### Why we did it
- Publishing must be atomic and enforce the DB invariant: draft needs at least one tag.
- Q6 requires a user-visible publish flow and a way to confirm published posts are queryable.

### Key files touched
- `app/(app)/draft/[postId].tsx` — Publish button, RPC call, error mapping, published-state UI.
- `app/(app)/published.tsx` — Minimal published posts query/list screen for Q6 verification.
- `docs/10_PRODUCT.md` — Added explicit publish rule (`publish_post` + atomic behavior).

### Important concepts involved (explain simply)
- RPC-based atomic publish: instead of updating `status` directly from UI, call `publish_post` so DB checks owner + tag count and flips status in one safe transaction.
- Error mapping: backend exceptions (like `post_requires_at_least_one_tag`) are translated into friendly user messages.
- Published-only query: feed-like list reads only `status='published'`, matching current RLS/public-read model.

### How to verify (step-by-step)
1. Open a draft post with zero tags.
2. Tap `Publish` and verify you get a clear “add at least one tag” message.
3. Add one or more tags.
4. Tap `Publish` again and verify button shows loading then success.
5. Confirm draft UI updates to `Published` state and `View in feed` link appears.
6. Open `Published posts` screen and confirm the post is listed.
7. Reload Published posts and confirm it still appears.

### Risks / follow-ups
- RPC error text matching is string-based; backend message changes would require UI mapping updates.
- Published list currently shows text metadata only (no thumbnail/video preview).
- Draft screen still shows tag form after publish (guarded from editing, but UX can be refined).
- No retry/backoff logic for transient network failures yet.

### If I need to debug this later: where to look first
Start in `app/(app)/draft/[postId].tsx` (`publishDraft` function and error mapping), then verify RPC behavior in `supabase/migrations/20260305000100_q2_core_schema.sql` (`publish_post`), then confirm published query logic in `app/(app)/published.tsx`.

## Q7 — Vertical Feed + Reveal Items

### What changed
- Replaced authenticated home with a TikTok-style vertical feed for published posts.
- Added limit/offset pagination (`range`) and active-item autoplay/pause behavior.
- Added reveal-items modal for current post tags with safe-link opening via in-app browser.

### Why we did it
- Q7 requires one-post-per-swipe feed UX and revealable shopping items per video.
- Feed must only use published posts and avoid mounting all players at once.

### Key files touched
- `app/(app)/index.tsx` — Main feed screen (query, paging, autoplay, reveal items, safe link open).
- `docs/20_ARCHITECTURE.md` — Feed query + client pagination/windowing strategy.

### Important concepts involved (explain simply)
- Paging: fetch feed in chunks (limit/offset) instead of all at once.
- Active autoplay: only the visible card plays; others are paused.
- Windowed rendering: only current and nearby videos mount players to keep performance smooth.
- Reveal items safety: links run through shared URL validator before opening.

### How to verify (step-by-step)
1. Open app while signed in and land on feed (main app index).
2. Confirm published posts load newest-first and one post fills each screen.
3. Swipe up/down and verify only the active item plays.
4. Tap `Reveal items` and verify tags shown for the active post.
5. Tap a safe tag URL and confirm it opens in in-app browser.
6. Try an unsafe URL tag (if present in test data) and confirm it is blocked/disabled.
7. Scroll near end and confirm more published posts load via pagination.

### Risks / follow-ups
- Offset pagination can shift if new rows are inserted during scrolling.
- Creator username fetch is a second query (could be optimized with server-side view later).
- Bottom sheet is modal-based (not a full gesture bottom-sheet library yet).
- Average grade is placeholder (`—`) until grading aggregation is wired in Q8.

### If I need to debug this later: where to look first
Start in `app/(app)/index.tsx` for query/paging/autoplay/reveal logic, then check URL safety in `src/utils/urlValidation.ts`, then validate feed strategy notes in `docs/20_ARCHITECTURE.md`.

## Q8 — Grades (1..10, One-Time) + Average Display

### What changed
- Replaced feed placeholder grade text with real per-post average and per-user grade state.
- Added 1..10 grading controls on each published feed card with submit-on-tap behavior.
- Added duplicate-grade handling (`Already graded`), client cooldown, and immediate average refresh after submit.

### Why we did it
- Q8 requires replacing likes with numeric grades while enforcing one grade per user/post.
- The UI now mirrors DB constraints so users get clear feedback without creating duplicate rows.

### Key files touched
- `app/(app)/index.tsx` — Feed grading UI, grade submit logic, duplicate/cooldown handling, average/user-grade fetch.
- `docs/10_PRODUCT.md` — Added grading UX rules: one grade only, no edit/delete, rounded average.

### Important concepts involved (explain simply)
- Unique constraint safety: DB enforces `one grade per user per post`; UI treats unique-violation as a normal `Already graded` outcome.
- Average query pattern: fetch grades for current feed post IDs, compute average/count in client, round with one decimal.
- Lock-after-grade: once user grade exists, grade buttons become non-interactive for that post.
- Client throttling: short cooldown (2.5s) blocks rapid repeat taps and shows a wait message.

### How to verify (step-by-step)
1. Open a published post in feed while signed in.
2. Tap one grade (for example `8`) and verify success message appears.
3. Check Supabase `grades` table and verify one row exists with correct `post_id`, `user_id`, `value`.
4. Tap another grade on the same post and verify UI shows `Already graded` and no new row is created.
5. Confirm average on the post updates and displays one decimal (for example `8.0`, `9.2`).
6. Rapid-tap grade buttons and confirm cooldown message (`Please wait...`) appears.

### Risks / follow-ups
- Average is currently client-aggregated from fetched rows; an RPC/view could reduce payload at larger scale.
- Duplicate detection relies on Postgres unique error semantics; keep message mapping aligned with backend errors.
- Feed-level grade fetch runs after post loads; temporary placeholders (`—`) can appear briefly.
- No grade-edit flow by design (MVP rule).

### If I need to debug this later: where to look first
Start in `app/(app)/index.tsx`: `submitGrade` for insert/error handling, `refreshGradeStats` for average/user-grade state, then validate DB constraints/policies in `supabase/migrations/20260305000100_q2_core_schema.sql`.

## Q9 — Outbound Click Logging

### What changed
- Added best-effort outbound click logging when a user taps a clothing tag link from the Reveal Items UI.
- Reused the shared URL validator so only safe `http/https` links are logged and opened.
- Added a short per-tag debounce window to avoid spamming `outbound_clicks` on repeated taps.
- Added a dev-only Account screen debug panel that shows recent session-local outbound click insert attempts for the current user.

### Why we did it
- Q9 measures commerce intent by recording which tagged product links users actually tap.
- The logging path must not block the user from opening the retailer URL if logging fails.

### Key files touched
- `app/(app)/index.tsx` — Reveal Items tap path now validates, debounces, logs best-effort, then opens the browser.
- `src/features/analytics/index.ts` — Helper functions for outbound click debounce, insert, and dev debug entries.
- `app/(app)/account.tsx` — Dev-only recent outbound click panel for verification during local testing.
- `docs/40_SECURITY_PRIVACY.md` — Documented outbound click logging fields and behavior.

### Important concepts involved (explain simply)
- Best-effort analytics: analytics writes should never block core user action. Here, the important action is opening the link.
- Shared validation: the same URL safety rules are reused for both browser open and click logging, so we do not log unsafe URLs.
- Debounce/throttle: repeated taps on the same tag inside a short time window are treated as one log-worthy click.
- RLS-aware debug strategy: the DB currently allows inserts to `outbound_clicks` but not client reads, so the dev debug panel shows local session entries instead of querying the table directly.

### How to verify (step-by-step)
1. Sign in and open a published post with at least one clothing tag.
2. Tap `Reveal items`.
3. Tap a safe tag link and confirm the browser opens.
4. Check Supabase `outbound_clicks` and confirm a row exists with `post_id`, `tag_id`, your `user_id`, and the validated URL.
5. Tap the same tag repeatedly within about 1.5 seconds and confirm the browser still opens, but the DB gets at most one new row during that debounce window.
6. In development, open `Account` and review the recent outbound click debug entries for the current session.
7. To simulate failure, disconnect the network and tap again: confirm the link-open path still runs as far as device connectivity allows, and check the dev console for the insert error log.

### Risks / follow-ups
- The dev debug list is session-local, not a DB query, because current RLS intentionally blocks client reads on `outbound_clicks`.
- Debounce is client-side only; if stronger guarantees are needed later, dedupe or rate limiting should also exist server-side.
- Logging currently happens around link-open time; if a retailer browser fails to launch on-device, the click insert may still have been attempted.

### If I need to debug this later: where to look first
Start in `app/(app)/index.tsx` (`openTagLink`), then check `src/features/analytics/index.ts` for debounce + insert behavior, then confirm RLS expectations in `docs/30_DATA_MODEL.md` and the `outbound_clicks` table policies in the Q2 migration.

## Q10 — Reporting (Post / Profile / Link)

### What changed
- Added report entry points for:
  - `Report post` on feed items
  - `Report profile` from the creator header in feed
  - `Report link` on each tagged item in the Reveal Items sheet
- Added a reusable report composer bottom sheet with fixed reasons, optional details, loading state, and submit handling.
- Added a reports feature helper for validation, link-report detail formatting, inserts, and fetching the current user’s last 20 reports.
- Added a migration that tightens report constraints and allows authenticated users to read only their own reports for the dev debug view.
- Added a dev-only `My Reports` section on the Account screen for quick verification.

### Why we did it
- Reporting is a day-one MVP safety requirement.
- The UX needed to stay simple: one reason, optional details, clear success/failure, and no hidden backend assumptions.

### Key files touched
- `app/(app)/index.tsx` — feed report entry points, report modal wiring, per-link reporting.
- `app/(app)/account.tsx` — dev-only `My Reports` debug list.
- `src/features/reports/index.ts` — reasons list, helpers, insert/query functions, blocklist stub constant.
- `src/features/reports/ReportComposer.tsx` — reusable report bottom sheet UI.
- `supabase/migrations/20260331000100_q10_reports_constraints_and_read_policy.sql` — report constraints + own-report read policy.
- `docs/30_DATA_MODEL.md` and `docs/40_SECURITY_PRIVACY.md` — schema/policy/security reporting docs.

### Important concepts involved (explain simply)
- RLS for reporting: users can always insert their own reports, and for debugging they can read only their own reports, not everyone else’s.
- Fixed reasons: product wants a controlled list so moderation data is consistent instead of free-form.
- Link report identification: the report stores `clothing_tags.id` as `target_id`; the actual URL is copied into `details` because `reports` has no dedicated URL column.
- Validation split:
  - client enforces reason required + details max length + loading state
  - DB enforces allowed reasons, UUID-shaped target ids, and details length

### How to verify (step-by-step)
1. Open a published post in feed.
2. Submit `Report post` and confirm a row appears in `reports` with:
   - `target_type = 'post'`
   - `target_id = video_posts.id`
3. Submit `Report profile` from the creator header and confirm:
   - `target_type = 'profile'`
   - `target_id = creator profile/user id`
4. Open `Reveal items`, submit `Report link`, and confirm:
   - `target_type = 'link'`
   - `target_id = clothing_tags.id`
   - `details` contains the link URL
5. Open Account in development and confirm `My Reports` shows the latest submitted reports.
6. Try submitting without a reason and confirm submit stays disabled.
7. Try a network failure and confirm the UI shows a friendly error while dev console logs the raw issue.

### Risks / follow-ups
- Reporting currently exists only on feed-based surfaces; if a dedicated post detail screen is added later, it should reuse the same report composer.
- `target_id` is validated as UUID text, not a strict foreign key to multiple possible target tables.
- The blocklist domain mechanism is still just a stub/config placeholder, not active moderation logic.

### If I need to debug this later: where to look first
Start in `app/(app)/index.tsx` for the entry points and modal state, then `src/features/reports/index.ts` for insert/query logic, then the Q10 migration for constraints and report read policy.

## Q11 — KPI Measurement Pack

### What changed
- Added a copy/paste-ready KPI query pack in `docs/70_KPI_QUERIES.md`.
- Added a plain-English metric definition guide in `docs/71_KPI_DEFINITIONS.md`.
- Marked unsupported KPIs clearly when the current schema lacks the necessary event instrumentation.

### Why we did it
- Q11 is about measurement support, not new product behavior.
- The goal is to let you answer core MVP questions directly in Supabase SQL Editor without adding a full analytics stack yet.

### Key files touched
- `docs/70_KPI_QUERIES.md` — runnable SQL for acquisition, publishing, grading, commerce intent proxies, and trust/safety.
- `docs/71_KPI_DEFINITIONS.md` — plain-English explanations and caveats for each KPI.

### Important concepts involved (explain simply)
- Schema-first analytics: before adding new events, use the tables you already trust (`profiles`, `video_posts`, `clothing_tags`, `grades`, `outbound_clicks`, `reports`).
- Denominator discipline: some metrics need both a numerator and denominator. If we only have clicks but not views, we should not pretend we have true CTR.
- Approximation vs instrumentation:
  - some metrics are valid today with current tables
  - some are only proxies today
  - some require a new event table later

### How to verify (step-by-step)
1. Open Supabase SQL Editor.
2. Paste and run each query from `docs/70_KPI_QUERIES.md`.
3. Confirm each query references the current schema correctly:
   - users from `profiles`
   - published content from `video_posts`
   - tags from `clothing_tags`
   - grading from `grades`
   - commerce clicks from `outbound_clicks`
   - safety data from `reports`
4. For the non-instrumented KPIs, confirm the docs clearly say they are not computable yet and describe the minimal extra event table needed.

### Risks / follow-ups
- `profiles` is used as the main user-count source; if profile upsert ever fails, acquisition counts will understate true auth signups.
- True view-based conversion metrics still need event instrumentation, especially:
  - reveal-sheet opens
  - post impressions/views
- SQL metrics can drift if schema names or column meanings change and docs are not updated in the same commit.

### If I need to debug this later: where to look first
Start with `docs/30_DATA_MODEL.md` to confirm table/column names, then compare each query in `docs/70_KPI_QUERIES.md` against the Q2/Q10 schema and policies before assuming the query is wrong.

## Social Phase 1 + 2 — Follows, Comments, and Dev Hooks

### What changed
- Added a social migration for `follows` and `comments`, including constraints, indices, RLS, and a `get_follow_counts` RPC.
- Added social client helpers for profile lookup, user post lookup, follow/unfollow, follow counts, comment listing, and comment creation.
- Added a dev-only `Social Debug` section in Account so follows/comments can be verified before building the full UI.

### Why we did it
- Comments, following, profile viewing, and user search need backend structure before the real screens are built.
- Shipping schema + helpers first keeps the next UI phase smaller and reduces the chance of redesigning DB contracts later.
- RLS rules need to be settled early so future UI code only depends on allowed reads/writes.

### Key files touched
- `docs/plan-social.md` — phased implementation plan.
- `supabase/migrations/20260420000100_social_follows_comments.sql` — follows/comments schema, indices, RLS, and follow counts RPC.
- `src/features/social/index.ts` — social helper functions and shared types.
- `app/(app)/account.tsx` — dev-only Social Debug section.
- `docs/30_DATA_MODEL.md` — schema + RLS summary.
- `docs/40_SECURITY_PRIVACY.md` — security/privacy notes for follows/comments.
- `docs/50_RUNBOOK.md` — quick verification workflow.

### Important concepts involved (explain simply)
- Follow graph integrity: the database blocks duplicate follows and self-following, so the app cannot create invalid relationships even if the UI misbehaves.
- Published-post comment visibility: comments are readable only when the related post is published.
- Auth-bound writes: comment/follow inserts use `auth.uid()` as the source of truth, so users can only write rows as themselves.
- Count RPC: follow counts are returned from a small server-side function instead of exposing all follow rows broadly.

### How to verify (step-by-step)
1. Run `supabase db push`.
2. Sign in and open `Account`.
3. In `Dev: social debug`, load a target username or profile id.
4. Tap `Follow` and verify counts update.
5. Check Supabase and confirm a row exists in `public.follows`.
6. Enter a published post id, load comments, then add a test comment.
7. Confirm the comment appears in the app and in `public.comments`.
8. Try a mismatched user id in client/dev code and confirm RLS blocks the write.

### Risks / follow-ups
- Replies are not included yet.
- Search UI is not built in this slice; debug lookup supports username or id only.
- Direct follow-row reads are intentionally narrow, so future followers/following lists may need an extra safe query path.
- Full comment/profile/follow UI still belongs to the next phase.

### If I need to debug this later: where to look first
Start with `supabase/migrations/20260420000100_social_follows_comments.sql` for constraints and RLS, then `src/features/social/index.ts` for helper behavior, then `app/(app)/account.tsx` for the dev verification flow.

## Social Phase 3 — Profiles, Follow, and Search UI

### What changed
- Added a public profile route at `app/(app)/profile/[profileId].tsx`.
- Added a search route at `app/(app)/search.tsx` with debounced username lookup.
- Wired creator username taps in the feed to open the correct profile.
- Added Account screen entry points to your own public profile and the search screen.
- Added a shared `ProfileAvatar` UI helper and a partial username search helper in `src/features/social/index.ts`.

### Why we did it
- Phase 3 is about making the social data from Phase 1 and Phase 2 actually usable in the product.
- Users need a simple path to discover people, inspect profiles, and follow/unfollow without weakening RLS or introducing a big UI refactor.

### Key files touched
- `app/(app)/profile/[profileId].tsx` — public profile UI, follow/unfollow state, follower/following counts, published posts list.
- `app/(app)/search.tsx` — debounced profile search UI.
- `app/(app)/index.tsx` — feed username entry points into profile routes.
- `app/(app)/account.tsx` — links to your own profile and to search.
- `src/features/social/index.ts` — added `searchProfilesByUsername`.
- `src/ui/ProfileAvatar.tsx` and `src/ui/index.ts` — shared avatar rendering.
- `docs/00_INDEX.md` — updated route and screen map.

### Important concepts involved (explain simply)
- Public profile route: instead of special-casing “my profile” and “their profile” in different screens, one route loads a profile by id and changes behavior depending on whether it matches `auth.uid()`.
- Optimistic UI: follow/unfollow updates the count immediately so the app feels fast, then reconciles with the database so the numbers stay truthful.
- Debounced search: the search query waits briefly before running so we do not spam Supabase on every keystroke.
- Case-insensitive partial match: using `ilike '%query%'` lets searches find usernames even when casing differs or the user types only part of the handle.

### How to verify (step-by-step)
1. Open `Account` and tap `View public profile`.
2. Confirm your own profile loads with avatar/username/bio/counts and a list of published posts.
3. Tap `Search people`, type part of another username, and confirm matching results appear.
4. Tap a search result and confirm the correct public profile opens.
5. Tap `Follow`, confirm the button state changes and follower count updates.
6. Tap `Unfollow`, confirm the count drops and the button switches back.
7. Open the feed and tap a creator username from a post header or caption block.
8. Confirm that exact creator’s profile opens.

### Risks / follow-ups
- Profile posts currently render as lightweight cards, not playable inline video previews.
- Search is username-only for now; display-name or richer ranking can come later if the product needs it.
- Follow counts reconcile against the DB after mutation, but if network quality is poor you can briefly see optimistic numbers before rollback.
- Comments UI is intentionally not included in this phase and should stay separate for Phase 4.

### If I need to debug this later: where to look first
Start in `app/(app)/profile/[profileId].tsx` for load/follow state, then `src/features/social/index.ts` for Supabase queries, then `app/(app)/search.tsx` for debounce and route navigation. If feed-to-profile navigation feels wrong, check `app/(app)/index.tsx` and verify the tapped `creator_id` is the one being pushed into the route.

## Social Phase 4 — Comments UI On Posts

### What changed
- Added a dedicated comments route at `app/(app)/comments/[postId].tsx`.
- Added a comments entry point from each feed post.
- Added comment loading, pull-to-refresh, empty/error states, and a composer with submit cooldown.
- Added a post-level comment count helper for feed cards.
- Added a published-post guard so comments do not work for drafts/unpublished posts.

### Why we did it
- Phase 4 turns the existing comments table and helper layer into an actual user-facing social loop.
- The goal was a minimal, stable MVP flow: open comments, read them, add one, and recover cleanly from network or RLS failures.

### Key files touched
- `app/(app)/comments/[postId].tsx` — comments screen UI, refresh, optimistic submit, published-post guard.
- `app/(app)/index.tsx` — feed comments button and route navigation.
- `src/features/social/index.ts` — comment count helper, post lookup helper, and friendlier comment error handling.
- `docs/00_INDEX.md` — added the comments route.
- `docs/10_PRODUCT.md` — documented comment MVP rules.

### Important concepts involved (explain simply)
- Published-post gate: comments are only shown or accepted when the target post is published, matching the RLS policy instead of trusting only the client.
- Optimistic UI with reconciliation: the new comment appears immediately, then the screen reloads from Supabase so the final list matches the database.
- Submit cooldown: a short client-side delay prevents rapid accidental double posts.
- Friendly failure mapping: raw RLS/network/check-constraint failures are translated into simple user-facing messages.

### How to verify (step-by-step)
1. Open the feed and tap `Comments` on a published post.
2. Confirm existing comments load and show username, time, and text.
3. Pull to refresh and confirm the list reloads cleanly.
4. Enter a valid comment and tap `Post`.
5. Confirm the comment appears immediately and still exists after refresh.
6. Check Supabase `comments` and confirm the new row exists with the right `post_id`, `user_id`, and `text`.
7. Try submitting whitespace only and confirm the app blocks it.
8. Open a draft/unpublished post comments route manually and confirm comments are unavailable.

### Risks / follow-ups
- Comment count on the feed is best-effort and refreshes when the feed loads/regains focus, not in real time.
- There is no delete/edit/reply flow yet.
- The composer is a full-width bottom dock and may need keyboard polish later on smaller devices.

### If I need to debug this later: where to look first
Start in `app/(app)/comments/[postId].tsx` for UI state and submit flow, then `src/features/social/index.ts` for post/comment queries and error mapping, then `app/(app)/index.tsx` for the feed entry point and comment count refresh.

## Legal Pages — Terms and Privacy

### What changed
- Replaced placeholder Terms/Privacy URLs with real in-app pages.
- Added public routes for `Terms of Use` and `Privacy Notice`.
- Switched sign-up onboarding links to internal Expo Router links instead of external placeholder URLs.

### Why we did it
- The app had `example.com` placeholders, which blocked a realistic onboarding/legal flow.
- In-app pages are more reliable in Expo and keep users inside the app while signing up.
- The copy now reflects MVP testing in Sweden/EU context and mentions GDPR-style rights and expectations.

### Key files touched
- `app/(public)/terms.tsx` — Terms of Use page.
- `app/(public)/privacy.tsx` — Privacy Notice page.
- `src/features/legal/LegalDocumentScreen.tsx` — shared legal page layout.
- `src/constants/auth.ts` — route constants for Terms/Privacy.
- `app/(auth)/sign-up.tsx` — onboarding links now route internally.
- `docs/40_SECURITY_PRIVACY.md` and `docs/50_RUNBOOK.md` — updated legal-page location and verification notes.

### Important concepts involved (explain simply)
- Route-based legal pages: using app routes like `/terms` and `/privacy` avoids unreliable placeholder web links.
- Public route group: the legal pages live outside the authenticated app shell so users can open them before account creation.
- MVP legal copy: this is a real user-facing page now, but it still needs final controller/contact details and legal review before public launch.

### How to verify (step-by-step)
1. Open `Create account`.
2. Tap `Terms of Use` and confirm the page opens in-app.
3. Go back and tap `Privacy Notice`.
4. Confirm both pages load while signed out.
5. Read the Privacy page and confirm it references Sweden/EU GDPR context, Supabase processing, and IMY complaint rights.

### Risks / follow-ups
- The pages are suitable for MVP/internal testing, not final public-launch legal text.
- Before launch, add final controller name, contact details, retention specifics, and any international transfer details.
- If you later host legal pages on a website, update `src/constants/auth.ts` and keep the runbook/docs aligned.

### If I need to debug this later: where to look first
Start in `app/(auth)/sign-up.tsx` for the onboarding links, then `src/constants/auth.ts` for the configured routes, then `app/(public)/terms.tsx`, `app/(public)/privacy.tsx`, and `src/features/legal/LegalDocumentScreen.tsx` for the page content and layout.

## Auth Session Persistence

### What changed
- Enabled real Supabase auth session persistence for the Expo client.
- Added a small Account screen debug field that shows `Session loaded: yes/no`.

### Why we did it
- The app had `persistSession: false`, which meant sessions were intentionally discarded on close/reopen.
- MVP auth should behave like a real app: users stay signed in until they sign out or the session expires.

### Key files touched
- `src/lib/supabaseClient.ts` — enabled persistent auth and wired storage.
- `src/features/auth/AuthProvider.tsx` — exposed `sessionLoaded` in auth context.
- `app/(app)/account.tsx` — displays the session-loaded debug value.
- `docs/50_RUNBOOK.md` — added expected reopen behavior and a quick verification checklist.

### Important concepts involved (explain simply)
- `persistSession`: tells Supabase not to throw away auth state after app restart.
- Storage adapter: on React Native, Supabase needs a real local storage backend to save the session token between app launches.
- Hydration vs sign-in: `sessionLoaded=yes` means the app found or currently has a session, not just that the UI finished loading.

### How to verify (step-by-step)
1. Sign in.
2. Open `Account` and confirm `Session loaded` says `yes`.
3. Fully close the app.
4. Reopen it.
5. Confirm you are still logged in and the Account screen still shows `Session loaded: yes`.

### Risks / follow-ups
- Native persistence depends on the storage package being installed correctly in the app.
- If you later change auth storage again, re-test close/reopen behavior on a real device, not only in hot reload.

### If I need to debug this later: where to look first
Start in `src/lib/supabaseClient.ts` for auth persistence/storage config, then `src/features/auth/AuthProvider.tsx` for session hydration, then `app/(app)/account.tsx` for the debug indicator.

## RLS: No Anonymous Browsing

### What changed
- Added a migration that removes anonymous read access from published feed tables.
- Published `video_posts`, `clothing_tags`, `grades`, and `comments` now require an authenticated Supabase session even when the content itself is public inside the app experience.
- Updated the data model and runbook docs to match the real access rules.

### Why we did it
- The product rule says authentication is required and anonymous browsing is not allowed.
- The older RLS policies still let the `anon` role read published content directly, which meant the database rules were looser than the product rules.

### Key files touched
- `supabase/migrations/20260423000100_rls_require_auth_for_feed_reads.sql` — replaces the published-read policies with authenticated-only versions.
- `docs/30_DATA_MODEL.md` — final access rules per table.
- `docs/50_RUNBOOK.md` — quick verification steps for the no-anonymous-browsing rule.

### Important concepts involved (explain simply)
- `anon` role: this is what the client uses before a real user session exists.
- RLS policy roles: `to authenticated` means the query only works when Supabase sees a logged-in user.
- Defense in depth: the app already redirects signed-out users away from the feed, but RLS is the server-side rule that actually prevents direct reads.

### How to verify (step-by-step)
1. Apply the new migration.
2. Sign out of the app.
3. Confirm the app redirects to the auth flow instead of showing the feed.
4. In Supabase, inspect `pg_policies` for `video_posts`, `clothing_tags`, `grades`, and `comments`.
5. Confirm the published-read policies only list `authenticated`.

### Risks / follow-ups
- Existing signed-in flows should keep working, but this change will block any future signed-out preview experience unless you add a separate safe policy or server-side API for it.
- Moderator/admin access is still handled through Supabase dashboard/service-role access rather than a new client role in this slice.

### If I need to debug this later: where to look first
Start in `supabase/migrations/20260423000100_rls_require_auth_for_feed_reads.sql`, then compare the current `pg_policies` output in Supabase, then check `app/(app)/_layout.tsx` if the signed-out route guard looks wrong.

## GDPR MVP Privacy Requests

### What changed
- Added MVP privacy-request actions in Account for `Request account deletion` and `Request data export`.
- Added a dedicated `privacy_requests` table with RLS instead of overloading reports.
- Added a confirmation step and a recent-request list so users can see what they submitted.

### Why we did it
- MVP still needs a credible GDPR-style support path even if deletion/export is handled manually.
- A dedicated table keeps privacy operations separate from safety reports and makes future admin handling cleaner.

### Key files touched
- `supabase/migrations/20260423000200_privacy_requests.sql` — new table, constraints, index, and RLS policies.
- `src/features/privacy/index.ts` — helper functions for submit/read.
- `app/(app)/account.tsx` — privacy request UI, confirmation flow, and recent requests.
- `docs/30_DATA_MODEL.md` and `docs/40_SECURITY_PRIVACY.md` — schema and privacy behavior docs.

### Important concepts involved (explain simply)
- Manual support-request flow: the app records the request now, and the actual deletion/export can be handled outside the client.
- RLS ownership rule: users can only create and read their own privacy requests.
- Separate domain table: privacy/compliance requests are different from abuse reports, so they should not share the same table just because both are “requests.”

### How to verify (step-by-step)
1. Apply the new migration.
2. Sign in and open `Account`.
3. In the privacy section, choose `Request account deletion` or `Request data export`.
4. Confirm the request.
5. Confirm the success message appears and the request shows up under `Recent requests`.
6. Check Supabase and confirm a row exists in `privacy_requests` for your user id.

### Risks / follow-ups
- This is a logging/request flow, not an automated deletion or export pipeline.
- Before launch, define who fulfills these requests, what SLA applies, and how fulfilled/declined states are updated.

### If I need to debug this later: where to look first
Start in `src/features/privacy/index.ts` for insert/read helpers, then `app/(app)/account.tsx` for the UI state, then `supabase/migrations/20260423000200_privacy_requests.sql` for the RLS and check constraints.

## Minimal Moderation Workflow

### What changed
- Added an admin-only `Reports Review` screen for the latest reports.
- Added report review state fields so reports can be marked `reviewed` or `resolved`.
- Added admin-checked RPCs instead of weakening report RLS for every authenticated user.

### Why we did it
- MVP moderation needed a real triage loop without opening report access to normal users.
- Security-definer RPCs let us keep the existing user-facing report permissions tight while still supporting a moderator workflow.

### Key files touched
- `supabase/migrations/20260423000300_reports_review_workflow.sql` — moderation allowlist table, report review fields, and admin-only RPCs.
- `app/(app)/moderation/reports.tsx` — the in-app moderation queue.
- `src/features/reports/index.ts` and `src/features/reports/constants.ts` — moderation fetch/update helpers and status types.
- `app/(app)/account.tsx` — admin-only entry point.
- `docs/60_MODERATION_RUNBOOK.md` — manual review and takedown steps.

### Important concepts involved (explain simply)
- Client gate vs DB gate: the app uses `EXPO_PUBLIC_ADMIN_USER_IDS` to show the screen, but the database still independently checks `moderation_admins` before returning or updating moderation data.
- Security-definer RPC: a database function can perform privileged reads/updates safely when it includes its own authorization check.
- Manual ops workflow: the queue tracks review state, but post removal, link cleanup, or user suspension is still a manual operational step in MVP.

### How to verify (step-by-step)
1. Apply the migration.
2. Add an admin user id to both `.env` and `moderation_admins`.
3. Submit reports from a normal account.
4. Sign in as the admin and open `Reports Review`.
5. Filter by reason or target type.
6. Mark one report `reviewed` and one `resolved`.
7. Confirm `reports.review_status`, `reviewed_at`, and `reviewed_by` update in Supabase.

### Risks / follow-ups
- The allowlist must stay in sync between client env and DB config.
- This is not a full moderation console yet: there is no appeals flow, assignee system, or automated suspension pipeline.

### If I need to debug this later: where to look first
Start in `supabase/migrations/20260423000300_reports_review_workflow.sql` for the authorization model, then `src/features/reports/index.ts` for the RPC calls, then `app/(app)/moderation/reports.tsx` for the UI state and filters.

## Launch Analytics Instrumentation

### What changed
- Added explicit analytics event tables for `app_opens`, `post_impressions`, and `tag_reveals`.
- Wired best-effort logging for:
  - app open when the authenticated app shell starts
  - post impression when a feed post becomes the active visible post
  - tag reveal when the Reveal Items sheet opens
- Updated KPI SQL so retention and funnel metrics use real event data instead of “not instrumented yet” placeholders.

### Why we did it
- Launch readiness needs a minimal event layer so retention and funnel questions can be answered from Supabase directly.
- Separate event tables keep this simple and explicit without building a more general event bus first.

### Key files touched
- `supabase/migrations/20260423000400_launch_analytics_events.sql` — analytics tables, indexes, and RLS.
- `src/features/analytics/index.ts` — best-effort event logging helpers and session-scoped dedupe.
- `app/(app)/_layout.tsx` — app-open logging hook.
- `app/(app)/index.tsx` — post-impression and tag-reveal logging hooks.
- `docs/70_KPI_QUERIES.md` — D1/D3 retention and funnel SQL.

### Important concepts involved (explain simply)
- Best-effort writes: analytics inserts should never block the UI, so failures are tolerated and mainly logged in development.
- Session-scoped dedupe: the app records one app open per user per app session, and one impression/reveal per user/post per app session, which keeps the MVP metrics less noisy.
- Event tables vs business tables: KPIs like retention and CTR need event data, not just content tables like posts or clicks.

### How to verify (step-by-step)
1. Apply the new migration.
2. Sign in and open the app.
3. Scroll the feed so at least one post becomes active.
4. Open Reveal Items on a post.
5. In Supabase, confirm rows appear in:
   - `app_opens`
   - `post_impressions`
   - `tag_reveals`
6. Run the updated SQL in `docs/70_KPI_QUERIES.md`.

### Risks / follow-ups
- There is still no `post_watch` event, so watch-time/completion KPIs remain out of scope for now.
- Because this is best-effort logging, brief network issues can undercount events.

### If I need to debug this later: where to look first
Start in `src/features/analytics/index.ts` for the insert/dedupe logic, then `app/(app)/_layout.tsx` and `app/(app)/index.tsx` for the trigger points, then `docs/70_KPI_QUERIES.md` to confirm the SQL still matches the schema.
