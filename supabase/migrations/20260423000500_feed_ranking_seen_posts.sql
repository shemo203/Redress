create table if not exists public.post_watches (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.video_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null check (char_length(trim(session_id)) > 0),
  watch_ms integer not null check (watch_ms >= 1000),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists post_watches_post_created_idx
  on public.post_watches (post_id, created_at desc);

create index if not exists post_watches_user_created_idx
  on public.post_watches (user_id, created_at desc);

alter table public.post_watches enable row level security;

create policy "post_watches_insert_own_published_posts"
on public.post_watches
for insert
to authenticated
with check (
  user_id = auth.uid()
  and char_length(trim(session_id)) > 0
  and watch_ms >= 1000
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = post_watches.post_id
      and vp.status = 'published'
  )
);

create or replace function public.rank_feed_posts(
  viewer_id uuid,
  page_limit integer default 8,
  exclude_post_ids uuid[] default '{}'
)
returns table (
  id uuid,
  creator_id uuid,
  caption text,
  created_at timestamptz,
  published_at timestamptz,
  video_url text,
  ranking_score numeric,
  seen_by_viewer boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  safe_limit integer := greatest(1, least(coalesce(page_limit, 8), 20));
begin
  if auth.uid() is null or viewer_id is null or viewer_id <> auth.uid() then
    raise exception 'Not authorized to rank feed';
  end if;

  return query
  with seen_posts as (
    select distinct pi.post_id
    from public.post_impressions pi
    where pi.user_id = viewer_id
  ),
  watch_stats as (
    select
      pw.post_id,
      avg(pw.watch_ms)::numeric as avg_watch_ms,
      avg(case when pw.completed then 1 else 0 end)::numeric as completion_rate
    from public.post_watches pw
    group by pw.post_id
  ),
  grade_stats as (
    select
      g.post_id,
      count(*)::numeric as grade_count
    from public.grades g
    group by g.post_id
  ),
  reveal_stats as (
    select
      tr.post_id,
      count(*)::numeric as reveal_count
    from public.tag_reveals tr
    group by tr.post_id
  ),
  click_stats as (
    select
      oc.post_id,
      count(*)::numeric as click_count
    from public.outbound_clicks oc
    group by oc.post_id
  ),
  report_stats as (
    select
      r.target_id::uuid as post_id,
      count(*)::numeric as report_count
    from public.reports r
    where r.target_type = 'post'
    group by r.target_id::uuid
  ),
  ranked_posts as (
    select
      vp.id,
      vp.creator_id,
      vp.caption,
      vp.created_at,
      vp.published_at,
      vp.video_url,
      (sp.post_id is not null) as seen_by_viewer,
      (
        case when sp.post_id is null then 1000 else 0 end
        + greatest(
            0::numeric,
            72::numeric
            - (extract(epoch from now() - coalesce(vp.published_at, vp.created_at)) / 3600.0)::numeric
          )
        + least(coalesce(ws.avg_watch_ms, 0) / 1000.0, 40::numeric)
        + coalesce(ws.completion_rate, 0) * 25::numeric
        + least(coalesce(gs.grade_count, 0) * 2::numeric, 20::numeric)
        + least(coalesce(rs.reveal_count, 0) * 1.5::numeric, 18::numeric)
        + least(coalesce(cs.click_count, 0) * 3::numeric, 24::numeric)
        - least(coalesce(rps.report_count, 0) * 6::numeric, 30::numeric)
      )::numeric as ranking_score
    from public.video_posts vp
    left join seen_posts sp
      on sp.post_id = vp.id
    left join watch_stats ws
      on ws.post_id = vp.id
    left join grade_stats gs
      on gs.post_id = vp.id
    left join reveal_stats rs
      on rs.post_id = vp.id
    left join click_stats cs
      on cs.post_id = vp.id
    left join report_stats rps
      on rps.post_id = vp.id
    where vp.status = 'published'
      and not (vp.id = any (coalesce(exclude_post_ids, '{}'::uuid[])))
  )
  select
    rp.id,
    rp.creator_id,
    rp.caption,
    rp.created_at,
    rp.published_at,
    rp.video_url,
    rp.ranking_score,
    rp.seen_by_viewer
  from ranked_posts rp
  order by
    rp.seen_by_viewer asc,
    rp.ranking_score desc,
    coalesce(rp.published_at, rp.created_at) desc,
    rp.id desc
  limit safe_limit;
end;
$$;

grant execute on function public.rank_feed_posts(uuid, integer, uuid[]) to authenticated;
