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

## GDPR basics (MVP)
- Privacy policy + ToS links in onboarding
- Ability to delete account (at least support request flow)
- Data deletion: soft delete content or delete on request
- Minimal data collection; log only necessary analytics
