create extension if not exists pgcrypto;

create or replace function public.is_http_url(input text)
returns boolean
language sql
immutable
as $$
  select input ~* '^https?://[^[:space:]]+$';
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 30),
  avatar_url text check (avatar_url is null or public.is_http_url(avatar_url)),
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  caption text not null default '',
  video_url text not null check (public.is_http_url(video_url)),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'draft' and published_at is null)
    or (status = 'published' and published_at is not null)
  )
);

create table if not exists public.clothing_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.video_posts (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  category text not null default 'other',
  brand text,
  url text not null check (public.is_http_url(url)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.video_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value integer not null check (value between 1 and 10),
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile', 'link')),
  target_id text not null check (char_length(trim(target_id)) > 0),
  reason text not null check (char_length(trim(reason)) > 0),
  details text,
  created_at timestamptz not null default now(),
  check (
    (target_type = 'link' and public.is_http_url(target_id))
    or (target_type in ('post', 'profile'))
  )
);

create table if not exists public.outbound_clicks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.video_posts (id) on delete cascade,
  tag_id uuid references public.clothing_tags (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null check (public.is_http_url(url)),
  created_at timestamptz not null default now()
);

create index if not exists video_posts_status_created_at_idx
  on public.video_posts (status, created_at desc);
create index if not exists video_posts_creator_id_idx
  on public.video_posts (creator_id);
create index if not exists clothing_tags_post_id_idx
  on public.clothing_tags (post_id);
create index if not exists grades_post_id_idx
  on public.grades (post_id);
create index if not exists grades_user_id_idx
  on public.grades (user_id);
create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);
create index if not exists outbound_clicks_post_created_idx
  on public.outbound_clicks (post_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.video_posts enable row level security;
alter table public.clothing_tags enable row level security;
alter table public.grades enable row level security;
alter table public.reports enable row level security;
alter table public.outbound_clicks enable row level security;

create policy "profiles_authenticated_read"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "video_posts_public_read_published"
on public.video_posts
for select
to anon, authenticated
using (status = 'published');

create policy "video_posts_creator_read_own"
on public.video_posts
for select
to authenticated
using (creator_id = auth.uid());

create policy "video_posts_creator_insert_own_draft"
on public.video_posts
for insert
to authenticated
with check (
  creator_id = auth.uid()
  and status = 'draft'
  and published_at is null
);

create policy "video_posts_creator_update_own"
on public.video_posts
for update
to authenticated
using (creator_id = auth.uid())
with check (
  creator_id = auth.uid()
  and status = 'draft'
  and published_at is null
);

create policy "video_posts_creator_delete_own_draft"
on public.video_posts
for delete
to authenticated
using (creator_id = auth.uid() and status = 'draft');

create policy "clothing_tags_public_read_published_posts"
on public.clothing_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.video_posts vp
    where vp.id = clothing_tags.post_id
      and vp.status = 'published'
  )
);

create policy "clothing_tags_creator_read_own"
on public.clothing_tags
for select
to authenticated
using (creator_id = auth.uid());

create policy "clothing_tags_creator_insert_own_draft_posts"
on public.clothing_tags
for insert
to authenticated
with check (
  creator_id = auth.uid()
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = clothing_tags.post_id
      and vp.creator_id = auth.uid()
      and vp.status = 'draft'
  )
);

create policy "clothing_tags_creator_update_own_draft_posts"
on public.clothing_tags
for update
to authenticated
using (
  creator_id = auth.uid()
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = clothing_tags.post_id
      and vp.creator_id = auth.uid()
      and vp.status = 'draft'
  )
)
with check (
  creator_id = auth.uid()
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = clothing_tags.post_id
      and vp.creator_id = auth.uid()
      and vp.status = 'draft'
  )
);

create policy "clothing_tags_creator_delete_own_draft_posts"
on public.clothing_tags
for delete
to authenticated
using (
  creator_id = auth.uid()
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = clothing_tags.post_id
      and vp.creator_id = auth.uid()
      and vp.status = 'draft'
  )
);

create policy "grades_public_read_published_posts"
on public.grades
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.video_posts vp
    where vp.id = grades.post_id
      and vp.status = 'published'
  )
);

create policy "grades_insert_own_user"
on public.grades
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = grades.post_id
      and vp.status = 'published'
  )
);

create policy "reports_insert_authenticated_own"
on public.reports
for insert
to authenticated
with check (reporter_id = auth.uid());

create policy "outbound_clicks_insert_authenticated_own"
on public.outbound_clicks
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = outbound_clicks.post_id
      and vp.status = 'published'
  )
);

create or replace function public.publish_post(post_id uuid)
returns public.video_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_post public.video_posts;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  update public.video_posts vp
  set
    status = 'published',
    published_at = now(),
    updated_at = now()
  where vp.id = post_id
    and vp.creator_id = auth.uid()
    and vp.status = 'draft'
    and exists (
      select 1
      from public.clothing_tags ct
      where ct.post_id = vp.id
    )
  returning vp.* into updated_post;

  if found then
    return updated_post;
  end if;

  if not exists (
    select 1
    from public.video_posts vp
    where vp.id = post_id
  ) then
    raise exception 'post_not_found';
  end if;

  if not exists (
    select 1
    from public.video_posts vp
    where vp.id = post_id
      and vp.creator_id = auth.uid()
  ) then
    raise exception 'not_post_owner';
  end if;

  if exists (
    select 1
    from public.video_posts vp
    where vp.id = post_id
      and vp.status = 'published'
  ) then
    raise exception 'post_already_published';
  end if;

  if not exists (
    select 1
    from public.clothing_tags ct
    where ct.post_id = post_id
  ) then
    raise exception 'post_requires_at_least_one_tag';
  end if;

  raise exception 'publish_failed';
end;
$$;

revoke all on function public.publish_post(uuid) from public;
grant execute on function public.publish_post(uuid) to authenticated;
