create table if not exists public.app_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null check (char_length(trim(session_id)) > 0),
  created_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create table if not exists public.post_impressions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.video_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null check (char_length(trim(session_id)) > 0),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, session_id)
);

create table if not exists public.tag_reveals (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.video_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null check (char_length(trim(session_id)) > 0),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, session_id)
);

create index if not exists app_opens_user_created_idx
  on public.app_opens (user_id, created_at desc);

create index if not exists post_impressions_post_created_idx
  on public.post_impressions (post_id, created_at desc);

create index if not exists post_impressions_user_created_idx
  on public.post_impressions (user_id, created_at desc);

create index if not exists tag_reveals_post_created_idx
  on public.tag_reveals (post_id, created_at desc);

create index if not exists tag_reveals_user_created_idx
  on public.tag_reveals (user_id, created_at desc);

alter table public.app_opens enable row level security;
alter table public.post_impressions enable row level security;
alter table public.tag_reveals enable row level security;

create policy "app_opens_insert_own"
on public.app_opens
for insert
to authenticated
with check (
  user_id = auth.uid()
  and char_length(trim(session_id)) > 0
);

create policy "post_impressions_insert_own_published_posts"
on public.post_impressions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and char_length(trim(session_id)) > 0
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = post_impressions.post_id
      and vp.status = 'published'
  )
);

create policy "tag_reveals_insert_own_published_posts"
on public.tag_reveals
for insert
to authenticated
with check (
  user_id = auth.uid()
  and char_length(trim(session_id)) > 0
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = tag_reveals.post_id
      and vp.status = 'published'
  )
);
