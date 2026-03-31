# KPI Definitions (MVP)

## How To Read These
- These definitions match the SQL in [docs/70_KPI_QUERIES.md](/Users/sherwan/Desktop/Redress/docs/70_KPI_QUERIES.md).
- The goal is fast MVP measurement, not perfect analytics.
- If a denominator is missing from the schema, the metric is called out as approximate or not instrumented yet.

## Acquisition

### Total registered users
What it measures:
- How many app users have made it far enough through auth/setup to get a `profiles` row.

What it misses:
- Any auth users who somehow exist without a profile row.

### New users per day
What it measures:
- Daily signup/profile creation volume.

What it misses:
- Marketing source, channel attribution, and install-to-signup conversion.

## Engagement / Content Supply

### Published videos per day/week
What it measures:
- The supply side of the marketplace: how much content is actually getting published.

What it misses:
- Draft creation volume and abandoned uploads.

### Percent of users who published at least one video
What it measures:
- How many registered users become creators.

What it misses:
- Users who created drafts but never published.

### Average tags per published post
What it measures:
- How richly a fit is merchandised.

What it misses:
- Tag quality, accuracy, and whether users actually open those links.

## Grading

### Grade participation rate
What it measures:
- Approximate share of registered users who ever graded a post.

What it misses:
- True viewer-to-grader conversion, because the app does not currently log who viewed which posts.

### Average grades per video
What it measures:
- How much rating activity each published post attracts.

What it misses:
- Whether the same cohort is grading everything and whether low-view posts are underexposed.

### Top posts by average grade
What it measures:
- Best-performing posts by quality signal, with a minimum-grade threshold to reduce noise.

What it misses:
- Exposure bias. A high average on a lightly seen post may still be misleading even with a threshold.

## Commerce Intent

### Reveal-tags tap-through rate
What it measures:
- Intended future metric: how often users who open the items sheet continue to product links.

What it misses today:
- Everything. The app does not yet log reveal-sheet opens.

Minimal instrumentation needed:
- A `tag_reveals` table or equivalent event with `post_id`, `user_id`, and `created_at`.

### Outbound link engagement per post
What it measures:
- Current proxy for commerce intent using raw outbound link clicks and unique clickers.

What it misses:
- True CTR, because we do not know how many users saw each post.

### Percent of posts with at least one outbound click
What it measures:
- Share of published content that generates any downstream shopping intent.

What it misses:
- How strong that intent was beyond the first click.

## Trust & Safety

### Report rate per 100 posts
What it measures:
- Overall safety pressure in the product relative to content volume.

What it misses:
- Severity, legitimacy, moderation outcome, and whether reports cluster around a few creators.

### Broken/malicious link reports
What it measures:
- How often link trust and commerce quality are failing.

What it misses:
- Silent link failures that users do not report.
