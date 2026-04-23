# Social Features Plan

Scope goal: add the minimum backend and dev hooks needed to support comments, follows, profile viewing, and user search later, without building the full social UI in the same slice.

## Phase 1 — Schema for follows
Acceptance criteria:
- A migration creates `public.follows` with:
  - `follower_id uuid`
  - `followee_id uuid`
  - `created_at timestamptz default now()`
- `unique(follower_id, followee_id)` exists.
- Self-follow is blocked with a DB check.
- Indexes exist for `followee_id` and `follower_id`.

## Phase 1 — Schema for comments
Acceptance criteria:
- A migration creates `public.comments` with:
  - `id uuid primary key default gen_random_uuid()`
  - `post_id uuid`
  - `user_id uuid`
  - `text text`
  - `created_at timestamptz default now()`
- `text` has a max-length DB check suitable for MVP.
- `post_id` references `video_posts(id)` and `user_id` references `auth.users(id)`.
- Index exists for `(post_id, created_at desc)`.

## Phase 1 — RLS for follows
Acceptance criteria:
- RLS is enabled on `public.follows`.
- Authenticated users can insert only rows where `follower_id = auth.uid()`.
- Authenticated users can delete only their own follow rows.
- Reading follow rows/counts is allowed in the simplest safe way chosen for MVP and documented.

## Phase 1 — RLS for comments
Acceptance criteria:
- RLS is enabled on `public.comments`.
- Read access allows comments only for published posts.
- Authenticated users can insert comments only as themselves (`user_id = auth.uid()`).
- Optional delete-own policy is added if included, and is documented.

## Phase 2 — Social helper APIs
Acceptance criteria:
- Client helpers exist for:
  - fetching a profile by id
  - fetching a user’s posts
  - follow mutation
  - unfollow mutation
  - follow counts
  - listing comments for a post
  - adding a comment
- Helper paths fit the existing feature/module structure.
- Helper return shapes are simple enough for future feed/profile/search UI reuse.

## Phase 2 — Dev verification UI
Acceptance criteria:
- A dev-only Social Debug section or screen exists.
- It shows the current user id and username.
- It allows entering a target username or profile id and testing follow/unfollow.
- It shows follow counts for the selected profile.
- It allows entering a post id, listing comments, and adding a comment.

## Documentation pass
Acceptance criteria:
- `docs/30_DATA_MODEL.md` includes new social tables, constraints, indices, and RLS summary.
- `docs/50_RUNBOOK.md` includes quick Supabase verification steps for follows/comments and RLS checks.
- The learning log has a teach-mode note for this slice.

## Verification pass
Acceptance criteria:
- Migrations apply cleanly.
- TypeScript passes.
- App initializes after the new client helpers/debug section are added.
- Manual verification steps are written clearly for:
  - follow insert
  - follow delete
  - comment insert/read
  - RLS rejecting writes as another user

## Deferred to Phase 3+
Acceptance criteria:
- No feed comments button is added in this run.
- No public profile screen routing is added in this run.
- No search UI is added in this run.
- Future UI work can build on the shipped schema/helpers without reshaping the DB contract.
