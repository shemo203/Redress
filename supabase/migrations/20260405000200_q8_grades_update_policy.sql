create policy "grades_update_own_user"
on public.grades
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = grades.post_id
      and vp.status = 'published'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.video_posts vp
    where vp.id = grades.post_id
      and vp.status = 'published'
  )
);
