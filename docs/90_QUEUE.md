# Build Queue (Redress MVP)

How to use:
- Work top-to-bottom.
- Only do ONE item per Codex run.
- Each item must end with: app runs + basic checks + docs updated + commit suggested.

Legend:
- Docs to read first: AGENTS.md, docs/10_PRODUCT.md, docs/30_DATA_MODEL.md, docs/40_SECURITY_PRIVACY.md, docs/50_RUNBOOK.md

Source of truth: docs/10_PRODUCT.md (summary) and docs/11_PRD_FULL.md (full PRD).
---

## Q1 — Repo baseline + dev setup (no product features)
**Goal:** Reliable local dev loop for Expo + Supabase.
**Tasks:**
- Ensure Expo app boots locally.
- Add env var wiring for Supabase URL/Anon key (EXPO_PUBLIC_*).
- Add `src/lib/supabaseClient.ts`.
- Update `docs/50_RUNBOOK.md` with exact steps.

**Done when:**
- `npm run start` launches.
- App renders a “Hello / Logged out” screen (placeholder OK).
- No secrets committed.

**Files likely touched:**
- `src/lib/supabaseClient.ts`
- `app/_layout.tsx` (or equivalent)
- `.env.example`
- `docs/50_RUNBOOK.md`

---

## Q2 — Supabase schema + migrations + RLS (core integrity)
**Goal:** DB enforces the MVP rules.
**Tasks:**
- Create migrations for: profiles, video_posts, clothing_tags, grades, reports, outbound_clicks.
- Add constraints:
  - grades.value is integer 1..10
  - unique(user_id, post_id) on grades
- Enable RLS on all tables; add policies:
  - read: published posts + tags (public)
  - write: authenticated users can create their own grades (once)
  - write: creators manage their own drafts/tags
- Add `publish_post(post_id)` RPC: checks >=1 tag + flips draft→published atomically.
- Update `docs/30_DATA_MODEL.md` with final schema + policies.

**Done when:**
- Migrations apply cleanly.
- Attempting second grade fails at DB level.
- Publishing without tags fails.

**Files likely touched:**
- `supabase/migrations/*`
- `docs/30_DATA_MODEL.md`

---

## Q3 — Auth gate (email + Google) + profile upsert
**Goal:** Auth required to use app; profile exists.
**Tasks:**
- Implement login/signup UI (email/password).
- Add Google sign-in (if configured).
- Gate app routes behind session.
- On first login: ensure `profiles` row exists (upsert).
- Add Terms/Privacy acceptance + “I’m 13+” checkbox gating signup UI (MVP).

**Done when:**
- Cannot access feed without auth.
- After login, `profiles` row exists.
- Sign out returns to auth screen.

**Files likely touched:**
- `app/(auth)/*`, `app/(tabs)/*` (or your chosen router structure)
- `src/features/auth/*`
- `docs/10_PRODUCT.md` (if behavior clarified)

---

## Q4 — Create draft post + upload video to storage
**Goal:** Creator can create a draft video post.
**Tasks:**
- Upload from device (pick video).
- Upload to Supabase Storage (private or public—document decision).
- Create `video_posts` row as `draft` with video URL/path.
- Basic error handling for failed uploads.

**Done when:**
- A draft post row is created.
- Video is stored and playable from its URL in dev.

---

## Q5 — Tagging UI + link validation (pre-publish)
**Goal:** Creator adds >=1 clothing tag with safe URLs.
**Tasks:**
- Tag add/edit/delete UI on draft.
- URL validation: http/https only; reject javascript/data/etc.
- Save tags in `clothing_tags`.
- Optional: category dropdown.

**Done when:**
- Invalid links can’t be saved.
- Draft displays tags list.

---

  ## Q6 — Publish flow (RPC)
  **Goal:** Publishing is atomic and enforces tags required.
  **Tasks:**
  - “Publish” button calls `publish_post(post_id)`.
  - Handle failure reasons gracefully (no tags, not owner, etc).

  **Done when:**
  - Cannot publish with 0 tags.
  - Published posts appear in “published feed query”.

---

## Q7 — Feed v1 (scroll + autoplay + reveal tags)
**Goal:** TikTok-style vertical feed works.
**Tasks:**
- Fullscreen vertical feed with snap paging.
- Autoplay active item; pause inactive.
- Show username, caption, average score (placeholder OK at first).
- Reveal tags bottom sheet listing items + open link.

**Done when:**
- Scrolling feels smooth.
- Reveal sheet shows tags for current post.
- Link opens and doesn’t accept unsafe schemes.

---

## Q8 — Grading (1–10) + average score display
**Goal:** Replace likes with ratings.
**Tasks:**
- Grade UI: integers 1..10.
- Write grade once (handle unique violation nicely).
- Display average score (rounded 1 decimal).
- Add minimal anti-spam client throttling.

**Done when:**
- Second grade attempt shows “already graded”.
- Average updates correctly.

---

## Q9 — Outbound click logging
**Goal:** Validate “commerce intent” KPI.
**Tasks:**
- When user taps a tag link, insert outbound_click row.
- Include post_id, tag_id, user_id, url.

**Done when:**
- Click creates a DB row every time.

---

## Q10 — Reporting (post/profile/link)
**Goal:** Basic safety hooks.
**Tasks:**
- Report UI and reasons list.
- Insert report rows.
- Add basic “blocklist domain” mechanism stub (config table or env list).

**Done when:**
- Report submissions are stored.
- Reasons match PRD list.

---

## Q11 — KPI queries (MVP analytics)
**Goal:** Quick measurement without heavy tooling.
**Tasks:**
- Add `docs/70_KPI_QUERIES.md` with SQL for DAU/WAU, grades/video, CTR, etc.

**Done when:**
- You can copy/paste queries into Supabase SQL editor.

---