create or replace function public.is_uuid_text(value text)
returns boolean
language sql
immutable
as $$
  select trim(value) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

alter table public.reports
  drop constraint if exists reports_check;

alter table public.reports
  drop constraint if exists reports_target_id_uuid_check;

alter table public.reports
  drop constraint if exists reports_reason_allowed_check;

alter table public.reports
  drop constraint if exists reports_details_max_length_check;

alter table public.reports
  add constraint reports_target_id_uuid_check
  check (public.is_uuid_text(target_id));

alter table public.reports
  add constraint reports_reason_allowed_check
  check (
    reason in (
      'offensive content',
      'sexual/explicit content',
      'harassment',
      'spam',
      'broken/malicious link'
    )
  );

alter table public.reports
  add constraint reports_details_max_length_check
  check (char_length(coalesce(details, '')) <= 500);

drop policy if exists "reports_select_own" on public.reports;

create policy "reports_select_own"
on public.reports
for select
to authenticated
using (reporter_id = auth.uid());
