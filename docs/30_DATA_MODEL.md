# Data Model (Supabase Postgres)

## Q2 Status
Q2 is implemented in migration:
- `supabase/migrations/20260305000100_q2_core_schema.sql`

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
- unique constraint: `unique(user_id, post_id)` (grade once per user/post)

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

## Integrity Rules Enforced In DB
1. One grade per user per post:
   - `grades unique(user_id, post_id)`
2. Grade value is integer 1..10:
   - `grades.value check (value between 1 and 10)`
3. Post status is constrained:
   - `video_posts.status check (status in ('draft', 'published'))`
4. Publish requires at least one clothing tag:
   - enforced by RPC `public.publish_post(post_id uuid)` before status flip
5. URL safety (MVP rule):
   - helper `public.is_http_url(text)` used by checks on `video_posts.video_url`, `clothing_tags.url`, and `outbound_clicks.url`

## RLS Summary
RLS is enabled on:
- `profiles`
- `video_posts`
- `clothing_tags`
- `grades`
- `reports`
- `outbound_clicks`

### Public read
- `video_posts`: `anon/authenticated` can `select` only rows with `status='published'`
- `clothing_tags`: `anon/authenticated` can `select` tags where the related post is published
- `grades`: `anon/authenticated` can `select` grades only for published posts

### Authenticated writes
- `grades`: insert allowed only when `user_id = auth.uid()` and post is published
- `video_posts`: creators can create/update/delete only their own drafts (direct publish via normal `update` is blocked)
- `clothing_tags`: creators can insert/update/delete their own tags only on their own draft posts
- `reports`: insert only when `reporter_id = auth.uid()`; authenticated users can `select` only their own reports for debug/verification
- `outbound_clicks`: insert only when `user_id = auth.uid()` and post is published; no read policy
- `profiles`: authenticated read; insert/update only for own row (`id = auth.uid()`)

## RPC: publish_post(post_id uuid)
`public.publish_post(post_id uuid)`:
- requires authentication
- requires caller to own the post
- requires post currently be `draft`
- requires at least one tag in `clothing_tags`
- updates `status='published'`, sets `published_at`, and returns updated row
- is the only supported publish path (RLS update policy keeps client updates in draft-only state)
- runs as `security definer`; execute granted to `authenticated` only
