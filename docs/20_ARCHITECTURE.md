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

## Feed Query Strategy (Q7)
- Main feed reads `video_posts` with `status='published'`, ordered by `created_at desc`.
- Client pagination uses simple limit/offset (`range(from, to)` in Supabase JS).
- Feed UI uses vertical paging (`FlatList` with one-post-per-screen behavior).
- Performance approach:
  - Keep list window small (`windowSize`, batch limits).
  - Mount video players only for active and nearby items (current ±1).
- Reveal items sheet reads tags already attached to each feed post row and opens only safe `http/https` links.
