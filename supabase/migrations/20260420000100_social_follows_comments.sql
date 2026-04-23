create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.video_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists follows_followee_id_idx
  on public.follows (followee_id);

create index if not exists follows_follower_id_idx
  on public.follows (follower_id);

create index if not exists comments_post_created_idx
  on public.comments (post_id, created_at desc);

alter table public.follows enable row level security;
alter table public.comments enable row level security;

create policy "follows_select_own"
on public.follows
for select
to authenticated
using (follower_id = auth.uid());

create policy "follows_insert_own"
on public.follows
for insert
to authenticated
with check (follower_id = auth.uid());

create policy "follows_delete_own"
on public.follows
for delete
to authenticated
using (follower_id = auth.uid());

create policy "comments_read_published_posts"
on public.comments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.video_posts vp
    where vp.id = comments.post_id
      and vp.status = 'published'
  )
);

create policy "comments_insert_own_published_posts"
on public.comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = comments.post_id
      and vp.status = 'published'
  )
);

create policy "comments_delete_own"
on public.comments
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.get_follow_counts(target_profile_id uuid)
returns table (
  followers_count bigint,
  following_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.follows where followee_id = target_profile_id),
    (select count(*) from public.follows where follower_id = target_profile_id);
$$;

revoke all on function public.get_follow_counts(uuid) from public;
grant execute on function public.get_follow_counts(uuid) to authenticated;
