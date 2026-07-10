create or replace function public.normalize_username(input text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(input, '')));
$$;

create or replace function public.is_valid_username(input text)
returns boolean
language sql
immutable
as $$
  select public.normalize_username(input) ~ '^[a-z0-9._]{3,30}$';
$$;

create or replace function public.build_default_username(user_id uuid, email text)
returns text
language plpgsql
immutable
as $$
declare
  raw_prefix text := split_part(coalesce(email, ''), '@', 1);
  clean_prefix text := regexp_replace(lower(raw_prefix), '[^a-z0-9._]', '', 'g');
  safe_prefix text := case
    when char_length(clean_prefix) >= 3 then clean_prefix
    else 'user'
  end;
  suffix text := substring(replace(user_id::text, '-', '') from 1 for 6);
begin
  return left(left(safe_prefix, 23) || '_' || suffix, 30);
end;
$$;

create or replace function public.enforce_profile_username_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  normalized_username text;
begin
  if tg_op = 'UPDATE' and new.username is not distinct from old.username then
    return new;
  end if;

  normalized_username := public.normalize_username(new.username);

  if not public.is_valid_username(normalized_username) then
    raise exception 'Username must be 3 to 30 characters and use only lowercase letters, numbers, periods, or underscores.';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id <> new.id
      and lower(p.username) = normalized_username
  ) then
    raise exception 'Username is already taken.';
  end if;

  new.username := normalized_username;
  return new;
end;
$$;

drop trigger if exists enforce_profile_username_rules on public.profiles;

create trigger enforce_profile_username_rules
before insert or update of username on public.profiles
for each row
execute function public.enforce_profile_username_rules();

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_username text := coalesce(new.raw_user_meta_data ->> 'username', '');
  normalized_username text;
begin
  if trim(metadata_username) <> '' then
    normalized_username := public.normalize_username(metadata_username);

    if not public.is_valid_username(normalized_username) then
      raise exception 'Username must be 3 to 30 characters and use only lowercase letters, numbers, periods, or underscores.';
    end if;

    if exists (
      select 1
      from public.profiles p
      where p.id <> new.id
        and lower(p.username) = normalized_username
    ) then
      raise exception 'Username is already taken.';
    end if;
  else
    normalized_username := public.build_default_username(new.id, new.email);
  end if;

  insert into public.profiles (id, username, created_at, updated_at)
  values (new.id, normalized_username, now(), now())
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user_profile();
