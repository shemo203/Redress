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
- URL is required (empty string is rejected).
- Reject if the trimmed value starts with any blocked scheme:
  - `javascript:`
  - `data:`
  - `file:`
  - `blob:`
- Parse with URL parser; reject malformed values.
- Accept only `http://` or `https://` protocol.
- Save the trimmed normalized value only after all checks pass.

## Abuse controls
- One grade per user per post (unique + RLS)
- Rate limiting (MVP: client throttling + server checks where feasible)
- Reporting for posts/profiles/links

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

## GDPR basics (MVP)
- Privacy policy + ToS links in onboarding
- Ability to delete account (at least support request flow)
- Data deletion: soft delete content or delete on request
- Minimal data collection; log only necessary analytics
