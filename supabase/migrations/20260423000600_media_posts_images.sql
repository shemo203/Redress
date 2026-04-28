alter table public.video_posts
  add column if not exists media_type text;

update public.video_posts
set media_type = 'video'
where media_type is null;

alter table public.video_posts
  alter column media_type set default 'video';

alter table public.video_posts
  alter column media_type set not null;

alter table public.video_posts
  drop constraint if exists video_posts_media_type_check;

alter table public.video_posts
  add constraint video_posts_media_type_check
  check (media_type in ('video', 'image'));

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'media');

drop policy if exists "media_auth_upload_own_prefix" on storage.objects;
create policy "media_auth_upload_own_prefix"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "media_auth_update_own_prefix" on storage.objects;
create policy "media_auth_update_own_prefix"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "media_auth_delete_own_prefix" on storage.objects;
create policy "media_auth_delete_own_prefix"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop function if exists public.rank_feed_posts(uuid, integer, uuid[]);

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
  media_type text,
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
      vp.media_type,
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
    rp.media_type,
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
