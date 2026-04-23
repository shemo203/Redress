# Security & Privacy (MVP)

## Authentication
- Supabase Auth (email+password + Google)
- Auth is required to use the app

## Link safety (mandatory)
Reject creator-entered URLs that are:
- not http/https
- contain javascript:, data:, file:, blob:
- are obviously malformed
Optionally: maintain a blocked-domain list.

### Implemented URL validation rules (Q5 tag CRUD)
For `clothing_tags.url`, the client validation now enforces:
- Trim whitespace before validation and save.
- URL requirement is controlled by `EXPO_PUBLIC_REQUIRE_TAG_URLS` and defaults to `true`.
- If the flag is `false`, an empty URL is allowed and the tag is treated as non-clickable in Reveal Items.
- Reject if the trimmed value starts with any blocked scheme:
  - `javascript:`
  - `data:`
  - `file:`
  - `blob:`
- Parse with URL parser; reject malformed values.
- Accept only `http://` or `https://` protocol when a URL is present.
- Save the trimmed normalized value only after all checks pass.

## Abuse controls
- One active grade row per user per post (unique + RPC-backed upsert)
- Rate limiting (MVP: client throttling + server checks where feasible)
- Reporting for posts/profiles/links
- Self-follow is blocked at the database layer
- Comments are length-limited and tied to published posts

## Grading integrity
- Grades are limited to integers `1..10`.
- The app now uses a save/update grading flow instead of one-time-only submission.
- `public.set_grade(post_id, grade_value)` enforces:
  - authenticated user required
  - target post must exist and be published
  - one stored grade row per user/post
  - later rating changes update the existing row instead of inserting duplicates

## Reporting (Q10)
- Users can report:
  - a post
  - a profile
  - a link
- Fixed report reasons:
  - `offensive content`
  - `sexual/explicit content`
  - `harassment`
  - `spam`
  - `broken/malicious link`
- Stored report fields:
  - `reporter_id`
  - `target_type`
  - `target_id`
  - `reason`
  - `details`
  - `created_at`
- Target identification:
  - post reports store `video_posts.id`
  - profile reports store `profiles.id`
  - link reports store `clothing_tags.id`
  - link URL is included in `details` because there is no dedicated URL column on `reports`
- Client validation:
  - reason is required
  - details are trimmed
  - details are capped at `500` characters
  - submit is disabled while a report is already in flight
- In development, raw insert/read errors are logged to console for debugging.

### Minimal moderation review workflow
- Reports can be reviewed in an admin-only in-app queue.
- Access is gated in two layers for MVP:
  - client-side allowlist via `EXPO_PUBLIC_ADMIN_USER_IDS`
  - DB-backed allowlist via `moderation_admins` for moderation RPCs
- Moderators can:
  - filter by report `reason`
  - filter by `target_type`
  - mark a report as `reviewed`
  - mark a report as `resolved`
- Review metadata stored on `reports`:
  - `review_status`
  - `reviewed_at`
  - `reviewed_by`
- Actual content takedown/suspension remains a manual operational step documented in the moderation runbook.

## Outbound click logging (Q9)
- When a user taps a clothing tag link in the Reveal Items UI, the app attempts to insert a row into `outbound_clicks`.
- Stored fields:
  - `post_id`
  - `tag_id`
  - `user_id`
  - `url` (the validated final `http/https` URL)
  - `created_at` (DB timestamp)
- The same client URL validation is reused before open/log:
  - only `http://` and `https://`
  - reject unsafe schemes like `javascript:`, `data:`, `file:`, `blob:`
- Logging is best-effort:
  - if insert fails, the link still opens
  - in development, the client logs the insert failure to console for debugging
- Client-side debounce prevents repeated taps on the same tag from spamming inserts within a short window.

## Launch analytics instrumentation
- The MVP now stores a small set of product-readiness events:
  - `app_opens`
  - `post_impressions`
  - `tag_reveals`
- These events are best-effort:
  - inserts should never block the UI
  - in development, raw logging failures can be printed to console for debugging
- Stored fields:
  - `user_id`
  - `session_id`
  - `created_at`
  - plus `post_id` for post-level events
- Event semantics:
  - `app_open`: once per app start/session per signed-in user
  - `post_impression`: once per visible post per user per app session
  - `tag_reveal`: once per post per user per app session when the Reveal Items sheet opens
- Access rules:
  - authenticated users can insert only their own analytics rows
  - there is no client read policy on these tables
- The MVP still does not use ad-tech tracking or third-party advertising identifiers.

## Social foundation (Phase 1/2)
- New user-data tables:
  - `follows`
  - `comments`
- `follows` protections:
  - authenticated users can only create/delete follow rows where `follower_id = auth.uid()`
  - self-follow is blocked by DB check
  - follow counts are exposed through a small count RPC instead of broad public row reads
- `comments` protections:
  - comments can be read only for published posts
  - authenticated users can insert comments only as themselves
  - users can delete only their own comments
  - comment text is capped at `500` characters in the DB

## GDPR basics (MVP)
- Privacy policy + ToS links in onboarding
- Ability to delete account (at least support request flow)
- Data deletion: soft delete content or delete on request
- Minimal data collection; log only necessary analytics

### MVP privacy request flows
- The Account screen supports two manual privacy/support requests:
  - `Request account deletion`
  - `Request data export`
- The MVP app does not complete these instantly inside the client.
- Submitting either option stores a row in `privacy_requests` so the request can be reviewed and fulfilled manually.
- Stored fields:
  - `requester_id`
  - `request_type` (`account_deletion` or `data_export`)
  - `status` (`requested`, `fulfilled`, or `declined`)
  - `details` (optional note, max `500` chars)
  - `created_at`
- Client access rules:
  - authenticated users can insert only their own requests
  - authenticated users can read only their own requests
  - there is no client-side update/delete flow for privacy requests in MVP
- The Account UI explains that this is a manual support-request flow and asks for confirmation before submitting.

## In-app legal pages
- Terms page route: `app/(public)/terms.tsx` (`/terms`)
- Privacy page route: `app/(public)/privacy.tsx` (`/privacy`)
- Shared renderer: `src/features/legal/LegalDocumentScreen.tsx`
- Onboarding links are configured in `src/constants/auth.ts`:
  - `TERMS_URL = "/terms"`
  - `PRIVACY_URL = "/privacy"`
- The current Privacy Notice is written for MVP/internal testing in Sweden/EU context:
  - identifies Redress as the MVP controller
  - lists account, content/activity, and technical data categories
  - explains core purposes and GDPR-style legal bases
  - names Supabase as the auth/database/storage processor
  - mentions user GDPR rights and includes clickable IMY complaint/right-to-information links
- Before public launch, replace the MVP testing contact language with final controller identity, privacy/support contact details, processor list, retention periods, and transfer safeguards.
