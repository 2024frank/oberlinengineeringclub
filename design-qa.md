# Engineering Public Website QA

Date: 2026-09-08

final result: passed for the visual and automated checks listed below

## Color Consistency Follow-up

- Replaced scattered public color values with one palette: cardinal #a21d2b, charcoal #222222, white, and neutral grays. The homepage now uses the same white header and cardinal join button as the inner pages.
- Removed the older teal focus rings, gold link hovers, green project markers, and green loading/portrait placeholders. Photos and the original club logo are unchanged. Success feedback retains its semantic green.
- Computed-color audits covered home, projects, events, About, pathway, resources, opportunities, news, and membership. Home, projects, and membership have matching header/button colors and no horizontal overflow at 320, 390, and 768 pixels; desktop was checked at 1280 pixels.
- Browser screenshots inspected the homepage, membership selections, focus rings, and phone controls. A selected option uses a pale cardinal tint, and the active step keeps white text on cardinal.
- Five palette regression tests passed after first reproducing the inconsistent colors and the missing inverse focus treatment on cardinal CMS sections. The inverse ring covers controls in dark heroes, project spotlights, and the footer; the light join section retains its cardinal ring. Browser keyboard checks confirmed white on the homepage hero and cardinal on the neutral join section.
- The final complete run passed 237 Vitest tests and 20 Node tests, with eight existing database integration skips. An earlier run alongside the production build hit two interaction timeouts and a subsequent failure; the full rerun with two workers passed without changing those tests or application logic. Changed-file ESLint and the production build including TypeScript passed. The database and physical-device limits below still apply.

## Visual Evidence

- Source visual truth: `/Users/kwaku/.codex/generated_images/01a03ab2-4925-7081-a9db-91f365af7a7f/exec-d78530ad-d2e2-479e-a882-c04f82ebf0c6.png` (1003 x 1568 pixels).
- Implementation: http://127.0.0.1:3026/ and its project, event, About, and membership routes.
- Implementation screenshot path: CUA returned inline screenshots, not filesystem paths. The captures are in this task's browser-tool results, tabs 12 and 14. The homepage and project-index captures were each emitted in the same comparison input as the source image.
- Desktop comparison: 1440 x 1000 CSS pixels, device pixel ratio 1. Source is a tall concept sheet, not an identical viewport. Comparison was by corresponding hero, meeting strip, and project-list regions; no pixel-perfect match is claimed.
- Additional browser-rendered evidence: 320 x 568, 390 x 844, 768 x 1024, and 1280 x 720. Home and events also received DOM-width checks at 320, 390, 768, 1280, and 1440 pixels.
- State: anonymous, public published records read through the existing public Supabase configuration. No private data edits or live form submissions.

## Comparison History

1. P2: At 320 x 568, absolute-positioned secondary homepage links overlapped the main button. Changed them to normal flex flow, added space between actions, and introduced compact short-screen typography. Re-capture showed separate controls and a visible beginning of the meeting strip.
2. P2: The published starter record still said Founding Meetup and claimed the room was unconfirmed. Corrected only the exact legacy copy, retaining the published URL, September 12 date, 1:00-2:30 PM time, and Science Center A155 location. Verified the home strip, events list, and event detail.
3. P2: Project summaries appeared twice on simple project pages. Kept a single brief below the photograph. The narrow-screen project detail retained all skills and participation links without horizontal overflow.
4. P2: Removing the decorative meeting cover exposed inherited pale paragraph text on white. Added a specific non-image hero text color. Final 390 x 844 re-capture showed readable #5c5b59 text on white. Meeting date and location appear ahead of the description on phones.

## Required Surfaces

- Typography: self-hosted DM Sans, fixed breakpoint sizes, no negative tracking. Long project titles wrap. The About hero now uses the same family as the public interface. The selected mock's slogan was intentionally replaced with plain explanatory copy at the user's request.
- Spacing and layout: full-width red hero, white meeting strip, open project rows. No floating page cards or 3D wrapper. Actual CMS records produce six homepage projects rather than the mock's three illustrative entries. The header retains the working CMS navigation and original club seal.
- Colors: cardinal red, white, charcoal, and restrained gray. Meeting text contrast and phone control separation checked after fixes.
- Image quality: original logo and published project photographs retained. Six homepage project images were confirmed loaded. The new hardware hero is illustrative generated artwork, not documentary evidence of a club build. List thumbnails request appropriately sized images.
- Copy: generic starter slogans removed from public introductions, About headings, and footer. Future custom officer-written copy is preserved. First interest meeting copy explicitly asks members to complete their profile, list skills, and propose or express interest in a project.

## Interaction Checks

- Project search for Ender returns one project with a singular result label.
- Project link opens the complete brief; Express interest carries its title into the form.
- At 320 pixels, an Electronics selection and dummy contact details persisted through the review step. No request was sent.
- Mobile navigation opens and links to Events; menu closes after navigation.
- Event link shows the correct date, start/end times, and room. Unscheduled event regression test prevents 1969/1970 dates.
- Header, footer, project listings, event listings, and reviewed form states had no horizontal document overflow at inspected sizes.
- Focused screenshots covered project-list density, phone controls, and meeting details in addition to the full-view comparison.

## Verification and Limits

- Fresh release-copy runs passed: 232 Vitest tests and 20 Node unit tests. Eight database integration tests remain skipped by the existing test configuration.
- ESLint passed for all changed TypeScript/TSX files. The production build and its TypeScript check passed with only public Supabase configuration. Repository-wide lint has pre-existing findings outside this release's changed files.
- No visible browser runtime error screen occurred in inspected flows. A full browser-console audit and physical iPhone/Safari run were not performed.
- Authenticated account actions, email delivery, and live submissions were not re-tested or changed.
- The user approved publishing this preview on September 8, 2026. This report records pre-release checks; production deployment status is verified separately in Vercel after merge. No production database writes are part of this release.

## Checklist

- [x] Compare homepage and project list with selected visual direction.
- [x] Replace generic public copy and correct the interest meeting.
- [x] Verify phone, tablet, and desktop layouts; recheck discovered defects.
- [x] Run unit tests, changed-file lint, and production build.
- [x] Keep unrelated working copies, accounts, and database records untouched.

Remaining verification limits: physical mobile Safari and configured database integration tests were not run. The release does not change authentication, permissions, email delivery, or submission endpoints.
