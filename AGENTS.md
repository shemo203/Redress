
# AGENTS.md — Redress (Expo + Supabase)

## Read first
docs/10_PRODUCT.md
docs/11_PRD_FULL.md (optional but good early)
docs/30_DATA_MODEL.md
docs/40_SECURITY_PRIVACY.md

## Non-negotiable MVP rules
- Auth required (no anonymous browsing).
- A post must have >= 1 clothing tag to publish.
- One grade per user per post (enforced DB-side).
- Grade values are integers 1..10.
- URLs must be http/https only; reject javascript:, data:, file:, blob:, etc.
- Log outbound link clicks.
- Reports exist day-one (video/profile/link).

## Engineering rules
- Database schema changes must be migrations.
- Every table with user data must have RLS enabled + policies documented.
- Any “integrity rule” must be enforced server-side (DB constraints + RLS), not only in UI.
- After implementing a feature: run the app + run basic checks, fix errors.

## Output style
- Prefer small, testable commits.
- If you change behavior, update docs in the same commit.
- If uncertain, write a plan to docs/ first, then build.

## Quick commands
- `npm run start` (Expo)
- `supabase start` / `supabase db reset` (local dev if used)

## Documentation Map
- Product: `docs/10_PRODUCT.md`
- Architecture: `docs/20_ARCHITECTURE.md`
- Data model: `docs/30_DATA_MODEL.md`
- Security and privacy: `docs/40_SECURITY_PRIVACY.md`
- Runbook: `docs/50_RUNBOOK.md`
- ADRs: `docs/adr/`

## Proposed Code Layout
- `app/`: Expo Router route groups and navigation shells.
- `src/features/`: feature modules with screens, services, hooks, and types per domain.
- `src/lib/`: Supabase client and shared integrations.
- `src/ui/`: shared UI primitives.
- `src/hooks/`: app-wide hooks.
- `src/constants/`: shared constants.
- `src/types/`: shared TypeScript types.
- `src/utils/`: pure helpers.
