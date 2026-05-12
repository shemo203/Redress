create or replace function public.get_top_posts(
  period text,
  page_limit integer default 20
)
returns table (
  rank bigint,
  post_id uuid,
  creator_id uuid,
  username text,
  avatar_url text,
  caption text,
  media_type text,
  video_url text,
  avg_grade numeric,
  grade_count bigint,
  item_count bigint,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_period text := lower(trim(coalesce(period, 'today')));
  safe_limit integer := greatest(1, least(coalesce(page_limit, 20), 50));
  window_start timestamptz := null;
  min_grade_count integer := 3;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if normalized_period not in ('today', 'week', 'all') then
    raise exception 'invalid_period';
  end if;

  if normalized_period = 'today' then
    window_start := date_trunc('day', now());
  elsif normalized_period = 'week' then
    window_start := date_trunc('week', now());
  end if;

  return query
  with grade_scope as (
    select
      g.post_id,
      round(avg(g.value)::numeric, 1) as avg_grade,
      count(*)::bigint as grade_count
    from public.grades g
    where window_start is null
      or g.created_at >= window_start
    group by g.post_id
    having count(*) >= min_grade_count
  ),
  item_scope as (
    select
      ct.post_id,
      count(*)::bigint as item_count
    from public.clothing_tags ct
    group by ct.post_id
  ),
  ranked as (
    select
      row_number() over (
        order by
          gs.avg_grade desc,
          gs.grade_count desc,
          coalesce(vp.published_at, vp.created_at) desc,
          vp.id desc
      ) as rank,
      vp.id as post_id,
      vp.creator_id,
      p.username,
      p.avatar_url,
      vp.caption,
      vp.media_type,
      vp.video_url,
      gs.avg_grade,
      gs.grade_count,
      coalesce(iscope.item_count, 0)::bigint as item_count,
      coalesce(vp.published_at, vp.created_at) as published_at
    from public.video_posts vp
    join grade_scope gs
      on gs.post_id = vp.id
    join public.profiles p
      on p.id = vp.creator_id
    left join item_scope iscope
      on iscope.post_id = vp.id
    where vp.status = 'published'
  )
  select
    ranked.rank,
    ranked.post_id,
    ranked.creator_id,
    ranked.username,
    ranked.avatar_url,
    ranked.caption,
    ranked.media_type,
    ranked.video_url,
    ranked.avg_grade,
    ranked.grade_count,
    ranked.item_count,
    ranked.published_at
  from ranked
  order by ranked.rank
  limit safe_limit;
end;
$$;

revoke all on function public.get_top_posts(text, integer) from public;
grant execute on function public.get_top_posts(text, integer) to authenticated;

create or replace function public.get_my_best_ranked_post(
  period text
)
returns table (
  rank bigint,
  post_id uuid,
  creator_id uuid,
  username text,
  avatar_url text,
  caption text,
  media_type text,
  video_url text,
  avg_grade numeric,
  grade_count bigint,
  item_count bigint,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_period text := lower(trim(coalesce(period, 'week')));
  window_start timestamptz := null;
  min_grade_count integer := 3;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if normalized_period not in ('today', 'week', 'all') then
    raise exception 'invalid_period';
  end if;

  if normalized_period = 'today' then
    window_start := date_trunc('day', now());
  elsif normalized_period = 'week' then
    window_start := date_trunc('week', now());
  end if;

  return query
  with grade_scope as (
    select
      g.post_id,
      round(avg(g.value)::numeric, 1) as avg_grade,
      count(*)::bigint as grade_count
    from public.grades g
    where window_start is null
      or g.created_at >= window_start
    group by g.post_id
    having count(*) >= min_grade_count
  ),
  item_scope as (
    select
      ct.post_id,
      count(*)::bigint as item_count
    from public.clothing_tags ct
    group by ct.post_id
  ),
  ranked as (
    select
      row_number() over (
        order by
          gs.avg_grade desc,
          gs.grade_count desc,
          coalesce(vp.published_at, vp.created_at) desc,
          vp.id desc
      ) as rank,
      vp.id as post_id,
      vp.creator_id,
      p.username,
      p.avatar_url,
      vp.caption,
      vp.media_type,
      vp.video_url,
      gs.avg_grade,
      gs.grade_count,
      coalesce(iscope.item_count, 0)::bigint as item_count,
      coalesce(vp.published_at, vp.created_at) as published_at
    from public.video_posts vp
    join grade_scope gs
      on gs.post_id = vp.id
    join public.profiles p
      on p.id = vp.creator_id
    left join item_scope iscope
      on iscope.post_id = vp.id
    where vp.status = 'published'
  )
  select
    ranked.rank,
    ranked.post_id,
    ranked.creator_id,
    ranked.username,
    ranked.avatar_url,
    ranked.caption,
    ranked.media_type,
    ranked.video_url,
    ranked.avg_grade,
    ranked.grade_count,
    ranked.item_count,
    ranked.published_at
  from ranked
  where ranked.creator_id = auth.uid()
  order by ranked.rank
  limit 1;
end;
$$;

revoke all on function public.get_my_best_ranked_post(text) from public;
grant execute on function public.get_my_best_ranked_post(text) to authenticated;
