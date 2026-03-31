# KPI Queries (MVP)

## How To Use
- Run these queries in the Supabase SQL Editor.
- They assume the current MVP schema documented in [docs/30_DATA_MODEL.md](/Users/sherwan/Desktop/Redress/docs/30_DATA_MODEL.md).
- Time windows used below:
  - `last 14 days` for new users
  - `last 30 days` for daily post/report trends unless noted otherwise
  - `last 12 weeks` for weekly publishing trends
- Most app-facing user counts use `public.profiles` because every authenticated user should have a profile row after signup.
- If you prefer `auth.users` as the source of truth and your SQL role has access, swap `public.profiles` for `auth.users` in the user-count queries.

## Acquisition

### Total registered users
```sql
select count(*)::bigint as total_registered_users
from public.profiles;
```

### New users per day (last 14 days)
```sql
with days as (
  select generate_series(
    current_date - interval '13 days',
    current_date,
    interval '1 day'
  )::date as day
)
select
  days.day,
  count(p.id)::bigint as new_users
from days
left join public.profiles p
  on p.created_at >= days.day
 and p.created_at < days.day + interval '1 day'
group by days.day
order by days.day;
```

## Engagement / Content Supply

### Published videos per day (last 30 days)
```sql
with days as (
  select generate_series(
    current_date - interval '29 days',
    current_date,
    interval '1 day'
  )::date as day
)
select
  days.day,
  count(vp.id)::bigint as published_videos
from days
left join public.video_posts vp
  on vp.status = 'published'
 and vp.published_at >= days.day
 and vp.published_at < days.day + interval '1 day'
group by days.day
order by days.day;
```

### Published videos per week (last 12 weeks)
```sql
with weeks as (
  select generate_series(
    date_trunc('week', current_date) - interval '11 weeks',
    date_trunc('week', current_date),
    interval '1 week'
  ) as week_start
)
select
  weeks.week_start::date as week_start,
  count(vp.id)::bigint as published_videos
from weeks
left join public.video_posts vp
  on vp.status = 'published'
 and vp.published_at >= weeks.week_start
 and vp.published_at < weeks.week_start + interval '1 week'
group by weeks.week_start
order by weeks.week_start;
```

### Percent of registered users who published at least one video
```sql
with totals as (
  select count(*)::numeric as total_users
  from public.profiles
),
creators as (
  select count(distinct creator_id)::numeric as users_with_published_video
  from public.video_posts
  where status = 'published'
)
select
  creators.users_with_published_video::bigint as users_with_published_video,
  totals.total_users::bigint as total_registered_users,
  case
    when totals.total_users = 0 then 0
    else round(100.0 * creators.users_with_published_video / totals.total_users, 2)
  end as pct_users_with_published_video
from totals
cross join creators;
```

### Average tags per published post
```sql
with tag_counts as (
  select
    vp.id,
    count(ct.id)::numeric as tag_count
  from public.video_posts vp
  left join public.clothing_tags ct
    on ct.post_id = vp.id
  where vp.status = 'published'
  group by vp.id
)
select
  count(*)::bigint as published_posts,
  round(avg(tag_count), 2) as avg_tags_per_published_post,
  min(tag_count)::bigint as min_tags_on_post,
  max(tag_count)::bigint as max_tags_on_post
from tag_counts;
```

## Grading

### Grade participation rate
Approximation: percent of registered users who graded at least one post. This is not the same as percent of viewers who graded, because we do not have feed view events.

```sql
with totals as (
  select count(*)::numeric as total_users
  from public.profiles
),
graders as (
  select count(distinct user_id)::numeric as users_who_graded
  from public.grades
)
select
  graders.users_who_graded::bigint as users_who_graded,
  totals.total_users::bigint as total_registered_users,
  case
    when totals.total_users = 0 then 0
    else round(100.0 * graders.users_who_graded / totals.total_users, 2)
  end as pct_registered_users_who_graded_once
from totals
cross join graders;
```

### Average number of grades per video
```sql
with grade_counts as (
  select
    vp.id,
    count(g.id)::numeric as grade_count
  from public.video_posts vp
  left join public.grades g
    on g.post_id = vp.id
  where vp.status = 'published'
  group by vp.id
)
select
  count(*)::bigint as published_posts,
  round(avg(grade_count), 2) as avg_grades_per_published_video,
  round(avg(case when grade_count > 0 then grade_count end), 2) as avg_grades_per_graded_video_only
from grade_counts;
```

### Top posts by average grade (minimum grade threshold)
Adjust `min_grades` to reduce noise.

```sql
with params as (
  select 5::int as min_grades
),
post_grades as (
  select
    vp.id as post_id,
    vp.creator_id,
    vp.published_at,
    count(g.id)::int as grade_count,
    round(avg(g.value)::numeric, 2) as avg_grade
  from public.video_posts vp
  join public.grades g
    on g.post_id = vp.id
  where vp.status = 'published'
  group by vp.id, vp.creator_id, vp.published_at
)
select
  post_id,
  creator_id,
  published_at,
  grade_count,
  avg_grade
from post_grades
cross join params
where grade_count >= params.min_grades
order by avg_grade desc, grade_count desc, published_at desc
limit 20;
```

## Commerce Intent

### Reveal-tags tap-through rate
Not instrumented yet.

Current schema does not log when the Reveal Items sheet is opened, so we cannot compute a reveal-to-click rate.

Minimal additional instrumentation needed:
- add a `tag_reveals` event table with at least:
  - `id uuid`
  - `post_id uuid`
  - `user_id uuid`
  - `created_at timestamptz`

Once instrumented, the KPI would be:
- `distinct users who clicked outbound links / distinct users who opened Reveal Items`

### Outbound link engagement per post
This is a useful current-state proxy, but it is not a true CTR because we do not track post impressions or viewers.

```sql
select
  vp.id as post_id,
  vp.creator_id,
  vp.published_at,
  count(oc.id)::bigint as outbound_clicks,
  count(distinct oc.user_id)::bigint as unique_clickers
from public.video_posts vp
left join public.outbound_clicks oc
  on oc.post_id = vp.id
where vp.status = 'published'
group by vp.id, vp.creator_id, vp.published_at
order by outbound_clicks desc, unique_clickers desc, vp.published_at desc
limit 50;
```

### True outbound link click-through rate per post
Requires event instrumentation.

Current schema has clicks, but not post views or post impressions. To compute true CTR per post, add a minimal event table such as `post_impressions` with:
- `id uuid`
- `post_id uuid`
- `user_id uuid`
- `created_at timestamptz`

Then the KPI becomes:
- `distinct users who clicked / distinct users who saw the post`

### Percent of published posts that generated at least one outbound click
```sql
with post_clicks as (
  select
    vp.id,
    count(oc.id) as click_count
  from public.video_posts vp
  left join public.outbound_clicks oc
    on oc.post_id = vp.id
  where vp.status = 'published'
  group by vp.id
)
select
  count(*)::bigint as published_posts,
  count(*) filter (where click_count > 0)::bigint as posts_with_outbound_click,
  case
    when count(*) = 0 then 0
    else round(100.0 * count(*) filter (where click_count > 0) / count(*), 2)
  end as pct_posts_with_outbound_click
from post_clicks;
```

## Trust & Safety

### Report rate per 100 published posts (last 30 days)
This compares reports created in the last 30 days to posts published in the last 30 days.

```sql
with published_posts as (
  select count(*)::numeric as published_post_count
  from public.video_posts
  where status = 'published'
    and published_at >= now() - interval '30 days'
),
reports_last_30d as (
  select count(*)::numeric as report_count
  from public.reports
  where created_at >= now() - interval '30 days'
)
select
  reports_last_30d.report_count::bigint as reports_last_30_days,
  published_posts.published_post_count::bigint as posts_published_last_30_days,
  case
    when published_posts.published_post_count = 0 then 0
    else round(100.0 * reports_last_30d.report_count / published_posts.published_post_count, 2)
  end as reports_per_100_posts
from published_posts
cross join reports_last_30d;
```

### Broken/malicious link reports count
```sql
select
  count(*)::bigint as broken_or_malicious_link_reports
from public.reports
where reason = 'broken/malicious link';
```

### Broken/malicious link reports by target type
```sql
select
  target_type,
  count(*)::bigint as report_count
from public.reports
where reason = 'broken/malicious link'
group by target_type
order by report_count desc, target_type asc;
```
