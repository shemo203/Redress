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
- Moderation operations: docs/60_MODERATION_RUNBOOK.md

## Repo layout (keep updated)
- app/: Expo Router screens
- src/features/: feature modules (feed, upload, grading, profile, reports, social)
- src/lib/: shared utilities (supabase client, validation, analytics)
- supabase/: migrations + RLS policies (if using Supabase CLI migrations)

## Current app routes / screens
- `app/(auth)/*`: sign-in and auth flow
- `app/(public)/terms.tsx`: in-app Terms of Use page linked from onboarding
- `app/(public)/privacy.tsx`: in-app Privacy Notice page linked from onboarding
- `app/(app)/index.tsx`: authenticated feed / published media stream
- `app/(app)/top-list.tsx`: authenticated Top List leaderboard for best-rated fits, with Today / This Week / All Time filters, podium, ranked list, and personal best-fit card
- `app/(app)/upload.tsx`: premium single-screen creator flow with large media preview, minimal caption card, item sheet, save draft, and sticky publish CTA
- `app/(app)/draft/[postId].tsx`: matching draft editor for tag cleanup and final publish
- `app/(app)/published.tsx`: dev-friendly published posts listing
- `app/(app)/account.tsx`: reference-style account profile with top search, overflow menu for secondary actions, avatar editing, and snapshot-based media grid that opens selected posts in the feed
- `app/(app)/moderation/reports.tsx`: admin-only reports review queue with filters and review/resolve actions
- `app/(app)/comments/[postId].tsx`: published-post comments screen with refresh and composer
- `app/(app)/profile/[profileId].tsx`: public profile view that mirrors the premium account layout, with top search/back controls, follow/unfollow, and snapshot-based media grid that opens selected posts in the feed
- `app/(app)/search.tsx`: username search for profiles
- `app/(app)/dev-seed.tsx`: dev-only seeding instructions

## MVP invariants (must hold)
- One grade per user per post
- Post requires >= 1 tag
- URLs are safe (http/https only)
- Auth required
