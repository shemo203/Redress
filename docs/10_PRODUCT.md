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
- Image posts now open a lightweight native crop step immediately after image selection.
- The image crop step uses a consistent `3:4` post frame so the cropped result better preserves full outfits while staying consistent across the app's image-post presentation.
- The create-post screen should offer a simple full-post preview before publishing so creators can check the selected media, caption, and item tags together.
- The publish CTA sits directly in the create flow under the items section instead of floating over the screen.
- The upload and draft editor surfaces now use the same guided three-step framing:
  - `Draft`
  - `Tags`
  - `Publish`
- The create-post description composer should stay visible while typing and offer an explicit keyboard dismiss path on mobile.
- Video selection should keep the direct picker flow unchanged.
- Saving a draft is still supported, but it is a fallback path instead of a required step in the main flow.
- Publishing still requires at least one clothing tag and still goes through `publish_post(post_id)` for the final status flip.
- Each post stores `media_type = 'image' | 'video'` so the feed and profile can render the correct media presentation.

## Feed MVP Rules
- The feed lives at the authenticated app root and is rendered by `app/(app)/index.tsx`.
- Each feed card should present creator identity and caption together in the top bar instead of using a separate bottom caption box.
- Long feed captions should stay clamped in the fixed-height top bar and open separately when tapped.
- Feed action overlays should follow the current editorial layout:
  - small Items pill beneath the top bar
  - rating card anchored above the dock on the lower right
  - Save/Comment pill anchored above the dock as a horizontal action bar
- Re-tapping the active dock destination should not replay navigation or animate the same screen again.
- Re-tapping the active feed or account dock destination should scroll that surface back to the top when no modal/sheet is open.
- If no published posts exist yet, the feed shows an empty-state CTA to upload the first post instead of trying to render an empty scroll experience.
- Pulling down on the top feed card should trigger a native refresh of the feed.
- Creators should be able to delete their own posts from the post card itself, with a confirmation step before removal.
- The reveal-items sheet should present clean tagged-item cards and remain scrollable when a post has many items.
- Reporting a tagged link from the reveal-items sheet should immediately swap into the report composer instead of staying behind the current sheet.
- Opening a post from a creator profile should keep feed scrolling scoped to that creator's published posts instead of falling back to the global ranked feed.

## Navigation Shell
- The bottom dock uses a five-slot editorial layout:
  - `Search`
  - `Top List`
  - centered circular `Feed` / Redress logo button
  - `Add fit`
  - `Profile`

## Top List MVP Rules
- The Top List route lives at `app/(app)/top-list.tsx`.
- The screen shows a time-filtered leaderboard of published posts with at least `3` grades in the selected period.
- Available filters:
  - `Today`
  - `This Week`
  - `All Time`
- Ranking order is:
  1. average grade descending
  2. grade count descending
  3. published timestamp descending
- `Today` and `This Week` use grades created within the selected period.
- `All Time` uses all grades on published posts.
- The Top List screen should show:
  - a header with subtitle
  - a segmented period control
  - a top-three podium
  - a rounded ranked list for ranks `4+`
  - a personal card for `Your best fit this week`
- Tapping a podium card or ranked row should open the existing feed post surface through the feed route with a `postId` param.
- Re-tapping the active Top List dock item should not re-navigate or animate the screen again; it should scroll the leaderboard back to the top.

## Profile MVP Rules
- The signed-in profile supports updating the profile photo from the device photo library.
- The signed-in profile supports updating the profile description/bio.
- Profile bios on account/public profile surfaces should be expandable when the text is longer than the collapsed preview.
- Profile bios are optional and should not fall back to seeded placeholder copy when unset.
- Profile photo uploads reuse the existing authenticated storage path and update `profiles.avatar_url`.
- Profile management actions are intentionally minimal in the account menu:
  - view public profile
  - share profile
  - privacy/support requests
  - sign out

## Mobile Input Behavior
- On iPhone, the sign-in password field, add-item URL field, and profile bio editor should remain visible when the keyboard opens.
- The edit-profile bio editor should stay in place when focused; it should not auto-jump the sheet upward just because the user starts typing.
- These input surfaces should dismiss the keyboard cleanly via tap-outside, scrolling, or submit behavior, without blocking buttons or scrolling.
- Comment and report sheets should close back to the underlying screen when the user taps outside the panel.
- The shared report composer should follow the same keyboard-safe pattern so the details field stays visible while typing.

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
