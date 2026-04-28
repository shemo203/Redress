# Product

## Goal
Ship the MVP for an Expo client backed by Supabase.

## Core Rules
- Authentication is required.
- Publishing a post requires at least one tag.
- Publishing a draft is atomic and must go through `publish_post(post_id)` checks.
- Grades are whole numbers from 1 to 10.
- Each user has one active grade per post.
- Users can update their own grade; the latest saved value is the active one for averages.
- Links must be checked for safety before users are sent outbound.
- Outbound link clicks must be logged.
- Users can report posts or other unsafe content.
- Clothing tags require a name and category; outbound URL requirement is controlled by `EXPO_PUBLIC_REQUIRE_TAG_URLS` and defaults to required.

## Compose Flow
- The primary post flow lives on the upload screen.
- Creators pick a single photo or video, add a caption, add clothing tags inline, and publish from the same screen.
- The publish CTA sits directly in the create flow under the items section instead of floating over the screen.
- The upload and draft editor surfaces now use the same guided three-step framing:
  - `Draft`
  - `Tags`
  - `Publish`
- Saving a draft is still supported, but it is a fallback path instead of a required step in the main flow.
- Publishing still requires at least one clothing tag and still goes through `publish_post(post_id)` for the final status flip.
- Each post stores `media_type = 'image' | 'video'` so the feed and profile can render the correct media presentation.

## Profile MVP Rules
- The signed-in profile supports updating the profile photo from the device photo library.
- The signed-in profile supports updating the profile description/bio.
- Profile photo uploads reuse the existing authenticated storage path and update `profiles.avatar_url`.
- Profile management actions are intentionally minimal in the account menu:
  - view public profile
  - share profile
  - privacy/support requests
  - sign out

## Q5 Tag URL Rule
- If `EXPO_PUBLIC_REQUIRE_TAG_URLS=true`:
  - clothing tag URLs are required
  - only `http://` and `https://` are allowed
- If `EXPO_PUBLIC_REQUIRE_TAG_URLS=false`:
  - clothing tags may be saved without a URL
  - tags without a URL appear in Reveal Items as non-clickable
  - any provided URL must still be `http://` or `https://`

## Q8 Grading UX Rules
- Grading UI uses a slider with values `1..10` on published posts in feed cards.
- Users can save a rating and later update it from the same sheet.
- The database still stores one grade row per user/post; re-rating updates the existing row instead of creating a duplicate.
- Average grade is displayed per post and rounded to one decimal place.
- Grade submission has short client cooldown to reduce rapid repeat taps.

## Comments MVP Rules
- Comments are available only on published posts.
- Authenticated users can add comments.
- Comment text is trimmed and limited to `500` characters.
- Empty comments are blocked.
- The MVP supports plain text comments only:
  - no likes
  - no replies
  - no editing
- Comment submission has a short client cooldown to reduce rapid repeat taps.

## Out Of Scope
- Extra roles beyond what MVP needs.
- Ranking, recommendation, or moderation features beyond reporting.
- Any feature not required by the rules above.
