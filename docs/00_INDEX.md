# Docs Index

## What this project is
Redress is a fashion short-form video app (TikTok-like feed) with:
- mandatory outfit item tags
- 1–10 grading instead of likes
- outbound link opening + click logging
- basic reporting/moderation

## Source of truth
- Product rules: docs/10_PRODUCT.md
- Full Detailed PRD: docs/11_PRD_FULL.md
- Architecture: docs/20_ARCHITECTURE.md
- Data model + integrity invariants: docs/30_DATA_MODEL.md
- Security/privacy/link safety: docs/40_SECURITY_PRIVACY.md
- How to run/deploy: docs/50_RUNBOOK.md

## Repo layout (keep updated)
- app/: Expo Router screens
- src/features/: feature modules (feed, upload, grading, profile, reports)
- src/lib/: shared utilities (supabase client, validation, analytics)
- supabase/: migrations + RLS policies (if using Supabase CLI migrations)

## MVP invariants (must hold)
- One grade per user per post
- Post requires >= 1 tag
- URLs are safe (http/https only)
- Auth required
