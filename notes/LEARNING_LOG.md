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
