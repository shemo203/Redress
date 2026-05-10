create or replace function public.delete_own_post(post_id uuid)
returns public.video_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_post public.video_posts;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  delete from public.video_posts vp
  where vp.id = post_id
    and vp.creator_id = auth.uid()
  returning vp.* into deleted_post;

  if found then
    return deleted_post;
  end if;

  if not exists (
    select 1
    from public.video_posts vp
    where vp.id = post_id
  ) then
    raise exception 'post_not_found';
  end if;

  if not exists (
    select 1
    from public.video_posts vp
    where vp.id = post_id
      and vp.creator_id = auth.uid()
  ) then
    raise exception 'not_post_owner';
  end if;

  raise exception 'delete_failed';
end;
$$;

revoke all on function public.delete_own_post(uuid) from public;
grant execute on function public.delete_own_post(uuid) to authenticated;
