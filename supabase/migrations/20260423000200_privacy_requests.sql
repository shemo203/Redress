create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  request_type text not null check (request_type in ('account_deletion', 'data_export')),
  status text not null default 'requested' check (status in ('requested', 'fulfilled', 'declined')),
  details text,
  created_at timestamptz not null default now(),
  constraint privacy_requests_details_length_check
    check (details is null or char_length(trim(details)) <= 500)
);

create index if not exists privacy_requests_requester_created_idx
  on public.privacy_requests (requester_id, created_at desc);

alter table public.privacy_requests enable row level security;

create policy "privacy_requests_select_own"
on public.privacy_requests
for select
to authenticated
using (requester_id = auth.uid());

create policy "privacy_requests_insert_own"
on public.privacy_requests
for insert
to authenticated
with check (
  requester_id = auth.uid()
  and request_type in ('account_deletion', 'data_export')
  and status = 'requested'
  and (details is null or char_length(trim(details)) <= 500)
);
