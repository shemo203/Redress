create or replace function public.set_grade(post_id uuid, grade_value integer)
returns public.grades
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_grade public.grades;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if grade_value < 1 or grade_value > 10 then
    raise exception 'invalid_grade_value';
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
      and vp.status = 'published'
  ) then
    raise exception 'post_not_published';
  end if;

  insert into public.grades (post_id, user_id, value)
  values (post_id, auth.uid(), grade_value)
  on conflict (user_id, post_id)
  do update
    set value = excluded.value
  returning * into saved_grade;

  return saved_grade;
end;
$$;

revoke all on function public.set_grade(uuid, integer) from public;
grant execute on function public.set_grade(uuid, integer) to authenticated;
