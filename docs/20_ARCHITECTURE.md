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
- `src/ui/` owns reusable shell UI such as the shared bottom dock and brand mark used across authenticated screens.

## MVP Feature Split
- `auth`: sign-in state and access gating.
- `posts`: create and read posts.
- `tags`: required tagging rules.
- `grades`: 1 to 10 grading and one-grade-per-user enforcement.
- `links`: link validation and outbound behavior.
- `analytics`: outbound click logging.
- `reports`: user reporting flows.

## Feed Query Strategy
- Main feed now uses `public.rank_feed_posts(viewer_id, page_limit, exclude_post_ids)` instead of a plain `created_at desc` query.
- Feed ranking is personalized for the signed-in viewer and prioritizes **new-to-user** posts using `post_impressions` as the MVP `seen_posts` concept.
- Ranking logic (simple weighted MVP):
  - strong unseen bonus if the viewer has never logged a `post_impression` for that post
  - recency boost for newer published posts
  - watch quality boost from `post_watches`:
    - average `watch_ms`
    - `completed` rate (MVP strong-watch proxy from the client)
  - engagement boosts from:
    - grade count
    - `tag_reveals`
    - `outbound_clicks`
  - negative weight for post reports
- Fallback behavior:
  - while unseen posts exist, they appear first
  - if the viewer has effectively seen everything unique, the client requests a recycle batch of ranked recent/seen posts so the swipe experience remains effectively endless
- Pagination strategy:
  - the client requests the next ranked batch while excluding already-loaded post ids
  - this avoids offset bugs when ranking changes after a user sees more posts during the same session
- Feed UI uses vertical paging (`FlatList` with one-post-per-screen behavior).
- Authenticated app shell uses a floating three-circle dock:
  - center oversized Redress brand badge routes to feed
  - left circle routes to new post/upload
  - right circle routes to account/profile
- Feed presentation keeps the video dominant:
  - full-screen cards so adjacent posts do not peek underneath
  - centered beige creator card at the top
  - soft floating side actions for items, grading, and reporting
  - bottom caption card with expand/collapse behavior
  - grading opens from a slide-up sheet instead of always showing chips on-card
- Performance approach:
  - Keep list window small (`windowSize`, batch limits).
  - Mount video players only for active and nearby items (current ±1).
- Analytics tie-in:
  - `post_impressions` powers seen/unseen prioritization
  - `post_watches` captures best-effort visible dwell time for ranking
- Reveal items sheet reads tags already attached to each feed post row and opens only safe `http/https` links.
