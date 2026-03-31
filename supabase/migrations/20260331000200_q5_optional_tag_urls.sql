alter table public.clothing_tags
  alter column url drop not null;

alter table public.clothing_tags
  drop constraint if exists clothing_tags_url_check;

alter table public.clothing_tags
  add constraint clothing_tags_url_check
  check (url is null or public.is_http_url(url));
