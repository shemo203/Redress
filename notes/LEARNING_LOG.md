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
