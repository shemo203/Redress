drop policy if exists "video_posts_public_read_published" on public.video_posts;

create policy "video_posts_public_read_published"
on public.video_posts
for select
to authenticated
using (status = 'published');

drop policy if exists "clothing_tags_public_read_published_posts" on public.clothing_tags;

create policy "clothing_tags_public_read_published_posts"
on public.clothing_tags
for select
to authenticated
using (
  exists (
    select 1
    from public.video_posts vp
    where vp.id = clothing_tags.post_id
      and vp.status = 'published'
  )
);

drop policy if exists "grades_public_read_published_posts" on public.grades;

create policy "grades_public_read_published_posts"
on public.grades
for select
to authenticated
using (
  exists (
    select 1
    from public.video_posts vp
    where vp.id = grades.post_id
      and vp.status = 'published'
  )
);

drop policy if exists "comments_read_published_posts" on public.comments;

create policy "comments_read_published_posts"
on public.comments
for select
to authenticated
using (
  exists (
    select 1
    from public.video_posts vp
    where vp.id = comments.post_id
      and vp.status = 'published'
  )
);
