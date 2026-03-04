# Architecture

## Stack
- Client: Expo with Expo Router.
- Backend: Supabase.
- Scope: mobile-first app structure with feature modules.

## Proposed Layout
```text
app/
  (public)/
  (auth)/
  (app)/
src/
  features/
    analytics/
    auth/
    grades/
    links/
    posts/
    reports/
    tags/
  lib/
  ui/
  hooks/
  constants/
  types/
  utils/
```

## Boundaries
- `app/` owns routes, navigation grouping, and screen entry points.
- `src/features/*` owns domain logic for each product area.
- Shared code stays out of feature folders unless it is domain-specific.
- Supabase access should be centralized under `src/lib/` and used by features.

## MVP Feature Split
- `auth`: sign-in state and access gating.
- `posts`: create and read posts.
- `tags`: required tagging rules.
- `grades`: 1 to 10 grading and one-grade-per-user enforcement.
- `links`: link validation and outbound behavior.
- `analytics`: outbound click logging.
- `reports`: user reporting flows.
