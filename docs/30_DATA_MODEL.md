# Data Model (Supabase Postgres)

## Q2 Status
Q2 is implemented in migration:
- `supabase/migrations/20260305000100_q2_core_schema.sql`

Later behavior changes:
- `supabase/migrations/20260405000100_q8_set_grade_rpc.sql`
- `supabase/migrations/20260405000200_q8_grades_update_policy.sql`
- `supabase/migrations/20260420000100_social_follows_comments.sql`
- `supabase/migrations/20260423000200_privacy_requests.sql`
- `supabase/migrations/20260423000300_reports_review_workflow.sql`
- `supabase/migrations/20260423000400_launch_analytics_events.sql`

## Core Tables

### profiles
- `id uuid` primary key, references `auth.users(id)` on delete cascade
- `username text` unique, length 3..30
- `avatar_url text` nullable, must be `http/https` if present
- `bio text` nullable
- `created_at timestamptz` default `now()`
- `updated_at timestamptz` default `now()`

### video_posts
- `id uuid` primary key, default `gen_random_uuid()`
- `creator_id uuid` references `auth.users(id)` on delete cascade
- `caption text` default `''`
- `video_url text` required, `http/https` only
- `status text` required, constrained to `'draft' | 'published'`
- `published_at timestamptz` nullable only for drafts
- `created_at timestamptz` default `now()`
- `updated_at timestamptz` default `now()`
- status consistency check:
  - draft => `published_at is null`
  - published => `published_at is not null`

### clothing_tags
- `id uuid` primary key, default `gen_random_uuid()`
- `post_id uuid` references `video_posts(id)` on delete cascade
- `creator_id uuid` references `auth.users(id)` on delete cascade
- `name text` required, non-empty (trimmed)
- `category text` required, default `'other'`
- `brand text` nullable
- `url text` nullable, `http/https` only when present
- `created_at timestamptz` default `now()`
- `updated_at timestamptz` default `now()`

### grades
- `id uuid` primary key, default `gen_random_uuid()`
- `post_id uuid` references `video_posts(id)` on delete cascade
- `user_id uuid` references `auth.users(id)` on delete cascade
- `value integer` required, constrained `1..10`
- `created_at timestamptz` default `now()`
- unique constraint: `unique(user_id, post_id)` (one active grade row per user/post)

### follows
- `follower_id uuid` references `profiles(id)` on delete cascade
- `followee_id uuid` references `profiles(id)` on delete cascade
- `created_at timestamptz` default `now()`
- unique constraint: `unique(follower_id, followee_id)`
- integrity check: `follower_id <> followee_id` (self-follow blocked)

### comments
- `id uuid` primary key, default `gen_random_uuid()`
- `post_id uuid` references `video_posts(id)` on delete cascade
- `user_id uuid` references `profiles(id)` on delete cascade
- `text text` required, trimmed length constrained to `1..500`
- `created_at timestamptz` default `now()`

### reports
- `id uuid` primary key, default `gen_random_uuid()`
- `reporter_id uuid` references `auth.users(id)` on delete cascade
- `target_type text` constrained to `'post' | 'profile' | 'link'`
- `target_id text` required, UUID text for the reported entity id
- `reason text` required, constrained to:
  - `offensive content`
  - `sexual/explicit content`
  - `harassment`
  - `spam`
  - `broken/malicious link`
- `details text` nullable
- `details` max length `500`
- `review_status text` constrained to `'open' | 'reviewed' | 'resolved'`, default `'open'`
- `reviewed_at timestamptz` nullable
- `reviewed_by uuid` nullable, references `auth.users(id)` on delete set null
- `created_at timestamptz` default `now()`
- target id usage:
  - `post` => `video_posts.id`
  - `profile` => `profiles.id`
  - `link` => `clothing_tags.id` (link URL can be included in `details`)

### outbound_clicks
- `id uuid` primary key, default `gen_random_uuid()`
- `post_id uuid` references `video_posts(id)` on delete cascade
- `tag_id uuid` nullable, references `clothing_tags(id)` on delete set null
- `user_id uuid` references `auth.users(id)` on delete cascade
- `url text` required, `http/https` only
- `created_at timestamptz` default `now()`

### privacy_requests
- `id uuid` primary key, default `gen_random_uuid()`
- `requester_id uuid` references `auth.users(id)` on delete cascade
- `request_type text` constrained to `'account_deletion' | 'data_export'`
- `status text` constrained to `'requested' | 'fulfilled' | 'declined'`, default `'requested'`
- `details text` nullable, trimmed length max `500`
- `created_at timestamptz` default `now()`

### moderation_admins
- `user_id uuid` primary key, references `auth.users(id)` on delete cascade
- `created_at timestamptz` default `now()`
- purpose:
  - DB-backed allowlist for moderation RPCs
  - no direct client read/write access

### app_opens
- `id uuid` primary key, default `gen_random_uuid()`
- `user_id uuid` references `auth.users(id)` on delete cascade
- `session_id text` required, non-empty
- `created_at timestamptz` default `now()`
- unique constraint: `unique(user_id, session_id)` to keep one open event per user per app start/session

### post_impressions
- `id uuid` primary key, default `gen_random_uuid()`
- `post_id uuid` references `video_posts(id)` on delete cascade
- `user_id uuid` references `auth.users(id)` on delete cascade
- `session_id text` required, non-empty
- `created_at timestamptz` default `now()`
- unique constraint: `unique(post_id, user_id, session_id)` to keep one impression per user/post/session

### tag_reveals
- `id uuid` primary key, default `gen_random_uuid()`
- `post_id uuid` references `video_posts(id)` on delete cascade
- `user_id uuid` references `auth.users(id)` on delete cascade
- `session_id text` required, non-empty
- `created_at timestamptz` default `now()`
- unique constraint: `unique(post_id, user_id, session_id)` to keep one reveal-open event per user/post/session

## Integrity Rules Enforced In DB
1. One grade per user per post:
   - `grades unique(user_id, post_id)`
   - updates reuse the same row through RPC `public.set_grade(post_id uuid, grade_value integer)`
2. Grade value is integer 1..10:
   - `grades.value check (value between 1 and 10)`
3. Post status is constrained:
   - `video_posts.status check (status in ('draft', 'published'))`
4. Publish requires at least one clothing tag:
   - enforced by RPC `public.publish_post(post_id uuid)` before status flip
5. URL safety (MVP rule):
   - helper `public.is_http_url(text)` used by checks on `video_posts.video_url`, `clothing_tags.url`, and `outbound_clicks.url`
6. Follow graph integrity:
   - `follows unique(follower_id, followee_id)`
   - `follows check (follower_id <> followee_id)`
7. Comment length guard:
   - `comments.text check (char_length(trim(text)) between 1 and 500)`
8. Privacy request shape:
   - `privacy_requests.request_type check (request_type in ('account_deletion', 'data_export'))`
   - `privacy_requests.status check (status in ('requested', 'fulfilled', 'declined'))`
   - `privacy_requests.details` max trimmed length `500`
9. Report moderation state:
   - `reports.review_status check (review_status in ('open', 'reviewed', 'resolved'))`
10. Launch analytics session guards:
   - `app_opens unique(user_id, session_id)`
   - `post_impressions unique(post_id, user_id, session_id)`
   - `tag_reveals unique(post_id, user_id, session_id)`

## RLS Summary
RLS is enabled on:
- `profiles`
- `video_posts`
- `clothing_tags`
- `grades`
- `follows`
- `comments`
- `reports`
- `outbound_clicks`
- `privacy_requests`
- `moderation_admins`
- `app_opens`
- `post_impressions`
- `tag_reveals`

### Authenticated read only
- `profiles`: `authenticated` can `select` profile rows
- `video_posts`: `authenticated` can `select` published rows; creators can also `select` their own drafts
- `clothing_tags`: `authenticated` can `select` tags where the related post is published; creators can also `select` tags on their own drafts
- `grades`: `authenticated` can `select` grades only for published posts
- `comments`: `authenticated` can `select` comments only when the related post is published
- `follows`: `authenticated` can `select` only their own outgoing follow rows directly; counts are exposed through RPC
- `reports`: `authenticated` can `select` only their own reports
- `outbound_clicks`: no client read policy
- `privacy_requests`: `authenticated` can `select` only their own privacy requests
- `moderation_admins`: no direct client read policy; accessed only through security-definer moderation RPCs
- `app_opens`: no client read policy
- `post_impressions`: no client read policy
- `tag_reveals`: no client read policy

### Anonymous access
- `anon` has no direct read access to app data tables used by the feed, reveal items, grades, or comments.
- This enforces the MVP rule that browsing requires authentication.
- Moderator/admin access stays minimal by relying on Supabase dashboard/service-role access outside the client RLS path.

### Authenticated writes
- `grades`: direct insert allowed only when `user_id = auth.uid()` and post is published; authenticated users can also update their own grade on published posts, and the primary client edit flow uses `public.set_grade()`
- `video_posts`: creators can create/update/delete only their own drafts (direct publish via normal `update` is blocked)
- `clothing_tags`: creators can insert/update/delete their own tags only on their own draft posts
- `follows`: authenticated users can insert/delete only where `follower_id = auth.uid()`; direct row reads are limited to the current user's outgoing follows
- `comments`: authenticated users can insert comments only as themselves on published posts; users can delete only their own comments
- `reports`: insert only when `reporter_id = auth.uid()`; authenticated users can `select` only their own reports for debug/verification
- `outbound_clicks`: insert only when `user_id = auth.uid()` and post is published; no read policy
- `privacy_requests`: insert only when `requester_id = auth.uid()` and the request uses an allowed type; no client update/delete policy
- `profiles`: insert/update only for own row (`id = auth.uid()`)
- `reports`: moderation status changes are not available through direct table updates; they go through admin-only RPCs
- `app_opens`: insert only when `user_id = auth.uid()` and session id is present
- `post_impressions`: insert only when `user_id = auth.uid()`, session id is present, and post is published
- `tag_reveals`: insert only when `user_id = auth.uid()`, session id is present, and post is published

## RPC: publish_post(post_id uuid)
`public.publish_post(post_id uuid)`:
- requires authentication
- requires caller to own the post
- requires post currently be `draft`
- requires at least one tag in `clothing_tags`
- updates `status='published'`, sets `published_at`, and returns updated row
- is the only supported publish path (RLS update policy keeps client updates in draft-only state)
- runs as `security definer`; execute granted to `authenticated` only

## RPC: set_grade(post_id uuid, grade_value integer)
`public.set_grade(post_id uuid, grade_value integer)`:
- requires authentication
- requires the target post to exist and be published
- requires `grade_value` be an integer `1..10`
- inserts a new grade row for the caller when none exists
- updates the caller's existing grade row when one already exists
- preserves the one-row-per-user/post integrity rule through `unique(user_id, post_id)`
- runs as `security definer`; execute granted to `authenticated` only

## RPC: get_follow_counts(target_profile_id uuid)
`public.get_follow_counts(target_profile_id uuid)`:
- returns two integers:
  - `followers_count`
  - `following_count`
- is used as the simplest safe count-read path for follows in MVP/dev verification
- does not expose follow rows broadly
- runs as `security definer`; execute granted to `authenticated` only

## RPC: list_reports_for_review(filter_reason text, filter_target_type text)
`public.list_reports_for_review(filter_reason text, filter_target_type text)`:
- returns the latest reports for moderation review
- supports optional filters by:
  - `reason`
  - `target_type`
- joins reporter usernames from `profiles` when available
- requires the caller to be in `moderation_admins`
- runs as `security definer`; execute granted to `authenticated` only

## RPC: set_report_review_status(target_report_id uuid, next_review_status text)
`public.set_report_review_status(target_report_id uuid, next_review_status text)`:
- updates `reports.review_status`
- stamps `reviewed_at = now()`
- stamps `reviewed_by = auth.uid()`
- currently supports:
  - `reviewed`
  - `resolved`
- requires the caller to be in `moderation_admins`
- runs as `security definer`; execute granted to `authenticated` only
