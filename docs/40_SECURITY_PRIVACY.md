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

## Abuse controls
- One grade per user per post (unique + RLS)
- Rate limiting (MVP: client throttling + server checks where feasible)
- Reporting for posts/profiles/links

## GDPR basics (MVP)
- Privacy policy + ToS links in onboarding
- Ability to delete account (at least support request flow)
- Data deletion: soft delete content or delete on request
- Minimal data collection; log only necessary analytics