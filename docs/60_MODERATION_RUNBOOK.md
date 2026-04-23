# Moderation Runbook

## Purpose
Use this runbook for the MVP reports-review workflow. The in-app moderation queue helps triage reports, but actual content removal or account suspension is still manual.

## Setup
1. Add the moderator user id to `.env`:
   - `EXPO_PUBLIC_ADMIN_USER_IDS=<uuid>`
   - for multiple admins, use comma-separated ids
2. Apply the latest migrations:
   - `supabase db push`
3. Add the same user id to `moderation_admins` in Supabase SQL Editor:

```sql
insert into public.moderation_admins (user_id)
values ('<admin-user-uuid>'::uuid)
on conflict (user_id) do nothing;
```

The app allowlist controls whether the screen is shown. The DB allowlist controls whether the moderation RPCs actually work.

## How To Review Reports
1. Sign in with an allowlisted admin account.
2. Open `Account`.
3. Tap `Open reports review`.
4. Filter by:
   - reason
   - target type
5. Open the latest relevant report card and inspect:
   - reason
   - target id
   - reporter
   - details
6. Mark the report:
   - `reviewed` when you have triaged it and need a manual follow-up
   - `resolved` when the manual action is complete or no further action is needed

## Manual Actions
### Remove or hide a post
MVP path:
1. Find the `video_posts.id` from the report target.
2. In Supabase Table Editor or SQL Editor, inspect the post and creator.
3. Manually update or remove the content:

```sql
delete from public.video_posts
where id = '<post-uuid>'::uuid;
```

Deleting the post will also cascade related tags, grades, comments, and some report context.

### Remove or disable a link
1. Find the `clothing_tags.id` from the report target.
2. In Supabase, inspect the tag and its parent post.
3. Remove the unsafe URL or delete the tag:

```sql
update public.clothing_tags
set url = null
where id = '<tag-uuid>'::uuid;
```

or

```sql
delete from public.clothing_tags
where id = '<tag-uuid>'::uuid;
```

### Suspend a profile or user
MVP path is manual:
1. Find the target `profiles.id`.
2. Review associated posts and reports.
3. Remove content manually if needed.
4. In Supabase Auth/Dashboard, suspend or delete the user account using operational/admin tools.

There is no in-app automated suspension flow in the MVP.

## What To Do For Common Report Reasons
- `broken/malicious link`: remove or null the tag URL first, then resolve the report.
- `spam`: review the reported profile and recent posts; remove clear spam content and consider suspending the account manually.
- `harassment`, `offensive content`, `sexual/explicit content`: review the post/profile, remove offending content manually if confirmed, then resolve the report.

## Verification
1. Submit a few reports from a normal user account.
2. Sign in as an allowlisted admin.
3. Confirm the reports appear in `Reports Review`.
4. Apply a filter and confirm the list narrows correctly.
5. Mark one report `reviewed` and one `resolved`.
6. Confirm the `reports` table updates:

```sql
select id, reason, target_type, review_status, reviewed_at, reviewed_by
from public.reports
order by created_at desc
limit 20;
```

## Limits Of This MVP
- The moderation queue is not a full case-management system.
- No audit trail beyond report review metadata is stored.
- No automated takedown, suspension, or appeal flow exists yet.
- Moderator permissions are allowlist-based, not role-management based.
