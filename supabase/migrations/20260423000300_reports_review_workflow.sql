create table if not exists public.moderation_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.moderation_admins enable row level security;

alter table public.reports
  add column if not exists review_status text not null default 'open'
    check (review_status in ('open', 'reviewed', 'resolved'));

alter table public.reports
  add column if not exists reviewed_at timestamptz;

alter table public.reports
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

create index if not exists reports_review_status_created_idx
  on public.reports (review_status, created_at desc);

create or replace function public.is_moderation_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.moderation_admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.list_reports_for_review(
  filter_reason text default null,
  filter_target_type text default null
)
returns table (
  id uuid,
  created_at timestamptz,
  reporter_id uuid,
  reporter_username text,
  target_type text,
  target_id text,
  reason text,
  details text,
  review_status text,
  reviewed_at timestamptz,
  reviewed_by uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderation_admin() then
    raise exception 'Not authorized to review reports';
  end if;

  return query
    select
      r.id,
      r.created_at,
      r.reporter_id,
      p.username as reporter_username,
      r.target_type,
      r.target_id,
      r.reason,
      r.details,
      r.review_status,
      r.reviewed_at,
      r.reviewed_by
    from public.reports r
    left join public.profiles p on p.id = r.reporter_id
    where (filter_reason is null or r.reason = filter_reason)
      and (filter_target_type is null or r.target_type = filter_target_type)
    order by r.created_at desc
    limit 100;
end;
$$;

create or replace function public.set_report_review_status(
  target_report_id uuid,
  next_review_status text
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_report public.reports;
begin
  if not public.is_moderation_admin() then
    raise exception 'Not authorized to review reports';
  end if;

  if next_review_status not in ('reviewed', 'resolved') then
    raise exception 'Invalid review status';
  end if;

  update public.reports r
  set
    review_status = next_review_status,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where r.id = target_report_id
  returning r.* into updated_report;

  if updated_report.id is null then
    raise exception 'Report not found';
  end if;

  return updated_report;
end;
$$;

grant execute on function public.is_moderation_admin() to authenticated;
grant execute on function public.list_reports_for_review(text, text) to authenticated;
grant execute on function public.set_report_review_status(uuid, text) to authenticated;
