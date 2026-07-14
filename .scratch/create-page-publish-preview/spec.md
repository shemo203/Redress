# Fix Create Page Publish Access and Media Preview Format

Status: ready-for-agent

## Problem Statement

Creators using the create page can run into two visible workflow problems before publishing a look.

First, the publish button does not always show clearly or can be hard to reach. This makes the final step of the compose flow feel unreliable, especially after selecting media, writing a description, and adding clothing tags. The creator may have completed all required work but still has to hunt for the action that publishes the post.

Second, the selected media preview on the create page appears as a square or arbitrary fixed frame instead of matching the 16:9 format of the selected pictures. This makes the create page preview misleading: creators cannot accurately judge how their media will look before they continue to preview or publish.

## Solution

The create page should keep publishing visibly reachable and present selected media in a predictable 16:9 frame.

The publish action should remain part of the create flow, but it should be easy to find and access regardless of normal compose content length, keyboard state, safe-area insets, or the number of clothing tags. A creator who has selected media and added at least one clothing tag should be able to publish without searching through the page.

The selected media preview should use a 16:9 presentation frame for photos and videos on the create page. The frame should be stable before and after media selection, avoid square presentation, and preserve the visual expectation that media previews are wide-format rather than a fixed-height block.

## User Stories

1. As a creator, I want the publish button to be visible or easy to reach after I finish composing, so that I can publish without hunting for the final action.
2. As a creator, I want the publish button to remain accessible after I add clothing tags, so that required tagging does not push publishing out of reach.
3. As a creator, I want the publish button to remain accessible after I write a longer description, so that normal caption length does not hide the publish action.
4. As a creator, I want the publish button to remain accessible on smaller phones, so that screen height does not block me from finishing a post.
5. As a creator, I want the publish button to remain accessible around the bottom dock and safe-area inset, so that app chrome does not cover the final action.
6. As a creator, I want the publish button to remain accessible after the keyboard opens and closes, so that typing a description or tag does not leave the page in an awkward scroll position.
7. As a creator, I want the publish action to stay visually connected to the publish step, so that I understand it is the final step of the create flow.
8. As a creator, I want the publish button to clearly show when publishing is unavailable, so that I know I still need to satisfy the post requirements.
9. As a creator, I want the publish button to become available after selecting media and adding a clothing tag, so that the app reflects the real publish requirements.
10. As a creator, I want the publish hint to explain what is missing, so that I can fix the create page without trial and error.
11. As a creator, I want the publish button to stay large enough to tap comfortably, so that publishing is not error-prone.
12. As a creator, I want the publish button to avoid being clipped by scroll boundaries, so that the action is fully readable and tappable.
13. As a creator, I want the selected photo preview to use a 16:9 frame, so that the create page matches the expected picture format.
14. As a creator, I want the selected video preview to use the same 16:9 frame, so that photos and videos behave consistently in the create flow.
15. As a creator, I want the empty media picker state to reserve the same 16:9 shape, so that the page does not jump dramatically after media selection.
16. As a creator, I want replacing media to keep the same preview frame, so that switching between photos and videos does not destabilize the layout.
17. As a creator, I want media metadata to avoid obscuring the important part of the preview, so that I can inspect the selected picture.
18. As a creator, I want the preview image to avoid square cropping, so that my 16:9 picture is not misrepresented.
19. As a creator, I want the create page preview to match the full-post preview as closely as practical, so that I trust what I see before publishing.
20. As a creator, I want the create page to remain scrollable when content is long, so that I can still review all compose sections.
21. As a creator, I want the create page to avoid layout jumps when validation messages appear, so that the publish action stays predictable.
22. As a creator, I want the publish action to show loading feedback only while publishing, so that I understand the app is working.
23. As a creator, I want a failed publish attempt to leave the publish action reachable, so that I can fix the issue and retry.
24. As a creator, I want the create page to preserve the existing draft fallback, so that fixing publish access does not remove draft saving.
25. As a creator, I want the create page to keep the existing requirement for at least one clothing tag, so that posts still follow Redress MVP rules.
26. As a creator, I want the create page to keep the existing image crop flow, so that photo selection behavior does not regress.
27. As a creator, I want the create page to keep the existing direct video picker flow, so that video selection behavior does not regress.
28. As a creator, I want the create page layout to feel intentional and stable, so that composing a look feels reliable.
29. As a user reviewing a created look, I want published media to be based on the selected media, so that preview changes do not alter upload semantics unexpectedly.
30. As a future maintainer, I want tests around the visible create-page behavior, so that publish access and preview format do not regress.

## Implementation Decisions

- Modify the create/upload surface that owns the primary compose flow.
- Keep the publish action on the create page rather than moving publishing to a separate route or modal.
- Use a persistent create-page publish footer so the CTA remains reachable when compose content is long, the keyboard has been used, or the bottom dock/safe area would otherwise compete with the final action.
- Make the publish action reliably reachable in the normal compose flow across small and large mobile viewports.
- Preserve the existing publish eligibility rule: media must be selected and at least one clothing tag must exist before publishing is enabled.
- Preserve the existing server-side publish behavior: final publishing still goes through the existing publish RPC after draft creation.
- Preserve the existing save-draft fallback path.
- Preserve the existing image crop picker behavior for photos.
- Preserve the existing direct picker behavior for videos.
- Update the selected media preview frame to use a stable 16:9 aspect ratio.
- Apply the 16:9 frame consistently to image media, video media, and the empty media picker state.
- Avoid a square preview frame and avoid arbitrary fixed-height presentation that can become square on common screen widths.
- Choose media fit behavior deliberately. The create-page preview should favor accurately representing the selected media's 16:9 format over decorative cropping.
- Ensure the metadata overlay or footer for selected media does not make the 16:9 preview feel clipped or inaccessible.
- Keep the full-post preview modal available from the create page.
- Align any preview-modal changes with the 16:9 expectation when the modal shows selected media, while preserving its role as a full-post preview of media, description, and clothing tags together.
- Avoid database schema changes.
- Avoid API contract changes.
- Avoid changing post validation rules outside the create page UI.
- Avoid introducing a new compose state model unless the current layout cannot support the reachability requirement cleanly.

## Testing Decisions

- Test at the highest practical seam: the upload/create route rendered as user-visible UI behavior.
- Prefer a minimal React Native component or route test harness when the repo has test infrastructure. If the repo still has no test runner or UI test dependencies, keep this bug fix scoped and document the manual verification gap explicitly.
- Mock authentication, media picker, video player behavior, and Supabase calls so tests focus on create-page behavior rather than platform or network details.
- Tests should assert external behavior rather than implementation details. Prefer visible button state, rendered labels, reachability, and stable layout contracts over internal state names.
- Cover the empty create page state: the media picker area reserves a 16:9 frame and the publish action is present but disabled.
- Cover the selected image state: the create-page preview renders in a 16:9 frame and does not become square.
- Cover the selected video state: the create-page preview renders in the same 16:9 frame and does not become square.
- Cover publish eligibility: without a clothing tag, publishing remains disabled; after a valid clothing tag exists, publishing becomes enabled.
- Cover publish reachability after normal compose content exists: media, description, and at least one clothing tag should not hide or clip the publish action.
- Cover smaller viewport behavior if the chosen test stack can simulate layout size. If not, document the manual check and keep the component styles structured around stable aspect-ratio constraints.
- Prior art: there are currently no repo test files or test configuration. The first test setup should stay focused on this route and avoid broad test infrastructure work beyond what is required.
- Manual verification should include running the Expo app, selecting a photo, selecting a video, adding at least one clothing tag, checking the 16:9 preview, and confirming the publish action is easy to access.

## Out of Scope

- Changing authentication requirements.
- Changing the database schema.
- Changing publish RPC behavior.
- Changing the requirement that a post must have at least one clothing tag to publish.
- Changing grade, feed, profile, Top List, comments, reports, or outbound link behavior.
- Reworking the entire create flow beyond the publish access and media preview format issues.
- Adding support for new media aspect ratios beyond the requested 16:9 create-page preview.
- Redesigning the bottom dock.
- Removing draft saving.
- Replacing the existing image crop step.
- Changing storage buckets or upload paths.

## Further Notes

- Product docs already state that the primary post flow lives on the upload screen and that creators publish from the same screen.
- Product docs were updated with the final decision that the publish CTA stays persistently reachable in the create flow while preserving the same publish eligibility rules.
- The current implementation appears to use a fixed-height preview area, which can present as square or otherwise mismatch the selected 16:9 media expectation depending on screen width.
- The local issue tracker convention stores this spec at `.scratch/create-page-publish-preview/spec.md`.

## Verification Notes

- Automated check: `npx tsc --noEmit`.
- App startup check: `npm run start -- --web --non-interactive`; Expo started the project without immediate startup errors, then the dev server was stopped.
- Manual device/media selection for photo and video was not completed in this environment.
