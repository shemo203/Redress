# Data Model (Supabase Postgres)

## Entities
- profiles
- video_posts
- clothing_tags
- grades
- reports
- outbound_clicks

## Integrity invariants (must be enforced in DB)
1) One grade per user per post
   - unique(user_id, post_id)
2) Grade value is integer 1..10
   - check constraint
3) A post must have >= 1 clothing tag before it becomes "published"
   - recommended approach:
     - video_posts has status: 'draft'|'published'
     - publishing is an RPC/transaction that checks tags exist then flips status

## Row Level Security (RLS) principles
- public read access to published posts + their tags
- only authenticated users can insert grades
- user can only insert a grade for themselves
- creator can insert/update their own drafts, and publish via RPC

## Suggested tables (high-level)
### profiles
- id (uuid, references auth.users)
- username (unique)
- avatar_url
- bio
- created_at

### video_posts
- id (uuid)
- creator_id (uuid -> profiles.id)
- caption (text)
- video_url (text)
- status (draft/published)
- created_at

### clothing_tags
- id
- post_id
- creator_id
- name
- category
- brand (nullable)
- url
- created_at

### grades
- id
- post_id
- user_id
- value (1..10)
- created_at

### reports
- id
- reporter_id
- target_type ('post'|'profile'|'link')
- target_id (uuid or text)
- reason
- details (optional)
- created_at

### outbound_clicks
- id
- post_id
- tag_id
- user_id
- url
- created_at