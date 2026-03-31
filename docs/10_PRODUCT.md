# Product

## Goal
Ship the MVP for an Expo client backed by Supabase.

## Core Rules
- Authentication is required.
- Creating a post requires at least one tag.
- Publishing a draft is atomic and must go through `publish_post(post_id)` checks.
- Grades are whole numbers from 1 to 10.
- Each user can grade a post once.
- A submitted grade is final for MVP (no edit/delete flow).
- Links must be checked for safety before users are sent outbound.
- Outbound link clicks must be logged.
- Users can report posts or other unsafe content.
- Clothing tags require a name and category; outbound URL requirement is controlled by `EXPO_PUBLIC_REQUIRE_TAG_URLS` and defaults to required.

## Q5 Tag URL Rule
- If `EXPO_PUBLIC_REQUIRE_TAG_URLS=true`:
  - clothing tag URLs are required
  - only `http://` and `https://` are allowed
- If `EXPO_PUBLIC_REQUIRE_TAG_URLS=false`:
  - clothing tags may be saved without a URL
  - tags without a URL appear in Reveal Items as non-clickable
  - any provided URL must still be `http://` or `https://`

## Q8 Grading UX Rules
- Grading UI shows values `1..10` on published posts in feed cards.
- Users can submit only one grade per post; after a grade exists, further attempts are blocked and the UI shows `Already graded`.
- If DB rejects a duplicate grade, UI shows `Already graded` and does not retry.
- Average grade is displayed per post and rounded to one decimal place.
- Grade submission has short client cooldown to reduce rapid repeat taps.

## Out Of Scope
- Extra roles beyond what MVP needs.
- Ranking, recommendation, or moderation features beyond reporting.
- Any feature not required by the rules above.
