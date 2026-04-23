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

### D1 retention by signup day (last 14 signup cohorts)
Uses `profiles.created_at` as cohort day and `app_opens` as return activity.

```sql
with signup_cohorts as (
  select
    p.id as user_id,
    timezone('UTC', p.created_at)::date as signup_day
  from public.profiles p
  where p.created_at >= current_date - interval '13 days'
),
cohort_sizes as (
  select
    signup_day,
    count(*)::numeric as cohort_size
  from signup_cohorts
  group by signup_day
),
d1_returns as (
  select
    sc.signup_day,
    count(distinct sc.user_id)::numeric as retained_users
  from signup_cohorts sc
  join public.app_opens ao
    on ao.user_id = sc.user_id
   and timezone('UTC', ao.created_at)::date = sc.signup_day + 1
  group by sc.signup_day
)
select
  cs.signup_day,
  cs.cohort_size::bigint as cohort_size,
  coalesce(dr.retained_users, 0)::bigint as d1_retained_users,
  case
    when cs.cohort_size = 0 then 0
    else round(100.0 * coalesce(dr.retained_users, 0) / cs.cohort_size, 2)
  end as d1_retention_pct
from cohort_sizes cs
left join d1_returns dr
  on dr.signup_day = cs.signup_day
order by cs.signup_day;
```

### D3 retention by signup day (last 14 signup cohorts)
```sql
with signup_cohorts as (
  select
    p.id as user_id,
    timezone('UTC', p.created_at)::date as signup_day
  from public.profiles p
  where p.created_at >= current_date - interval '13 days'
),
cohort_sizes as (
  select
    signup_day,
    count(*)::numeric as cohort_size
  from signup_cohorts
  group by signup_day
),
d3_returns as (
  select
    sc.signup_day,
    count(distinct sc.user_id)::numeric as retained_users
  from signup_cohorts sc
  join public.app_opens ao
    on ao.user_id = sc.user_id
   and timezone('UTC', ao.created_at)::date = sc.signup_day + 3
  group by sc.signup_day
)
select
  cs.signup_day,
  cs.cohort_size::bigint as cohort_size,
  coalesce(dr.retained_users, 0)::bigint as d3_retained_users,
  case
    when cs.cohort_size = 0 then 0
    else round(100.0 * coalesce(dr.retained_users, 0) / cs.cohort_size, 2)
  end as d3_retention_pct
from cohort_sizes cs
left join d3_returns dr
  on dr.signup_day = cs.signup_day
order by cs.signup_day;
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

### Impression → reveal rate (overall)
Uses distinct user/post pairs from `post_impressions` and `tag_reveals`.

```sql
with impressions as (
  select
    count(distinct user_id::text || ':' || post_id::text)::numeric as impression_units
  from public.post_impressions
),
reveals as (
  select
    count(distinct user_id::text || ':' || post_id::text)::numeric as reveal_units
  from public.tag_reveals
)
select
  impressions.impression_units::bigint as impression_units,
  reveals.reveal_units::bigint as reveal_units,
  case
    when impressions.impression_units = 0 then 0
    else round(100.0 * reveals.reveal_units / impressions.impression_units, 2)
  end as impression_to_reveal_rate_pct
from impressions
cross join reveals;
```

### Reveal → click rate (overall)
Measures distinct user/post click pairs divided by distinct user/post reveal pairs.

```sql
with reveals as (
  select
    count(distinct user_id::text || ':' || post_id::text)::numeric as reveal_units
  from public.tag_reveals
),
clicks as (
  select
    count(distinct user_id::text || ':' || post_id::text)::numeric as click_user_post_pairs
  from public.outbound_clicks
)
select
  reveals.reveal_units::bigint as reveal_units,
  clicks.click_user_post_pairs::bigint as click_user_post_pairs,
  case
    when reveals.reveal_units = 0 then 0
    else round(100.0 * clicks.click_user_post_pairs / reveals.reveal_units, 2)
  end as reveal_to_click_rate_pct
from reveals
cross join clicks;
```

### True CTR (overall)
Distinct user/post click pairs divided by distinct user/post impression pairs.

```sql
with impressions as (
  select
    count(distinct user_id::text || ':' || post_id::text)::numeric as impression_units
  from public.post_impressions
),
clicks as (
  select
    count(distinct user_id::text || ':' || post_id::text)::numeric as click_user_post_pairs
  from public.outbound_clicks
)
select
  impressions.impression_units::bigint as impression_units,
  clicks.click_user_post_pairs::bigint as click_user_post_pairs,
  case
    when impressions.impression_units = 0 then 0
    else round(100.0 * clicks.click_user_post_pairs / impressions.impression_units, 2)
  end as true_ctr_pct
from impressions
cross join clicks;
```

### True CTR per post
```sql
with impression_units as (
  select
    post_id,
    count(distinct user_id)::numeric as viewers
  from public.post_impressions
  group by post_id
),
click_units as (
  select
    post_id,
    count(distinct user_id)::numeric as clickers
  from public.outbound_clicks
  group by post_id
)
select
  vp.id as post_id,
  vp.creator_id,
  vp.published_at,
  coalesce(iu.viewers, 0)::bigint as viewers,
  coalesce(cu.clickers, 0)::bigint as clickers,
  case
    when coalesce(iu.viewers, 0) = 0 then 0
    else round(100.0 * coalesce(cu.clickers, 0) / iu.viewers, 2)
  end as true_ctr_pct
from public.video_posts vp
left join impression_units iu
  on iu.post_id = vp.id
left join click_units cu
  on cu.post_id = vp.id
where vp.status = 'published'
order by true_ctr_pct desc, clickers desc, vp.published_at desc
limit 50;
```

### Outbound link engagement per post
Useful supporting slice alongside CTR.

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
