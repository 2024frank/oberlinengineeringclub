# Robot Experience QA

final result: passed

## Workbench Production Release - September 6, 2026

This supersedes the local-only preview status above. The approved workbench is now the public website at https://oberlin32engineeringsociety.com/.

### Published Scope

- Public routes use the cabinet with real published projects, events, CMS information pages, and the existing membership and project submission flow. Preview-only signup remains isolated under the concept route.
- Project filters retain query parameters, full published lists are used instead of the homepage feed limit, and project details preserve their exact join links. Calendar items retain event detail links.
- Native scrolling is preserved inside the reading surface. Escape cannot discard a production form. Validation, rate-limit errors, retry, and field retention remain operational.
- Removed the legacy illustrative photo frame and empty column shown in the user's About screenshot. Actual leadership portraits and project media are retained. Disabled the old heading fade on cabinet pages.
- Route focus targets the cabinet-owned focusable wrapper rather than mutating server-rendered headings before hydration. Officer sign-in uses a full document navigation because production redirects it to a separate host.
- At the user's request, decorative slash separators were removed from page labels, project labels, and signup field labels. URLs and application behavior were not changed by this copy cleanup.
- No membership records, officer accounts, email settings, or database migrations were changed. A pre-release source-hash comparison confirmed the member, admin, and backend implementation matched the prior live deployment.
- `.vercelignore` excludes local environment files, tooling folders, test output, tutorials, and private artifacts. The club badge, self-hosted fonts, and 3D font subset are included.

### Release Verification

- Final deployment: `dpl_HevcXtDJEzKfMf4yEYJYJDNHuGLx`, READY. Unique URL: https://oberlin-engineering-club-4wrwfbsm5-frank-kusi-appiahs-projects.vercel.app.
- Both the public domain and `admin.oberlin32engineeringsociety.com` were independently inspected and resolved to that deployment.
- Remote production build passed, including TypeScript and 92 generated static pages. Scoped ESLint and `git diff --check` passed.
- Vitest: 52 suites, 195 tests passed. The seven native Node test files were run separately: 20 tests passed. Total: 215 checks.
- Playwright: four release tests passed locally and on the final live domain. The live run completed in 19.6 seconds using system Chrome.
- Browser coverage: 1536 x 1024 and 390 x 844 layouts; nonblank Three.js rendering and changed canvas pixels after the explode control; project drawer and detail navigation; mobile inner scrolling; project-specific joining; validation; simulated rate limiting and retry; proposal entry; calendar controls; About; browser history; member and officer login availability; direct-page hydration; and plain labels.
- The direct-load check captured console errors and page errors on About, Join, and Pathway, then followed Officer sign-in to the real login form. The final run reported none.
- All browser submission requests were intercepted. The real API was only sent an invalid empty payload and returned the expected 400 validation response. No test membership, email, invitation, or account was created.
- Final live screenshot evidence is preserved at `/Users/kwaku/.codex/visualizations/2026/08/25/01a03ab2-4925-7081-a9db-91f365af7a7f/machine-release/workbench-cabinet/live-release-20260906/`.
- This was a working-tree Vercel deployment. No Git commit or push was made. Pre-workbench rollback reference: `dpl_7KH9xuALNKqTwTSUR7uW4Eo6LFrx`.

### Verification Limits

- The default `npm test` still mixes Vitest, native Node, and Playwright files; the verified runners were invoked separately. Repo-wide ESLint has unrelated existing findings; the scoped release files passed.
- Mobile testing used browser viewport emulation, not physical phones or Safari. Hardware-GPU performance and forced WebGL context loss were not tested.
- Live database writes, outgoing email delivery, and a fresh authenticated member or officer session were not exercised. Existing account code was preserved and covered by the relevant unit checks.

## Sharing Preview Correction - September 6, 2026

- Root cause confirmed on the live homepage with WhatsApp and Facebook crawler user agents: `og:image` and the derived Twitter image still pointed to the retired `site/home-hero-workbench.jpg` stock photo. The public redesign had not updated the sharing image.
- Captured the actual live workbench as `public/brand/workbench/share-20260906.jpg`, a 1200 x 660 JPEG. This is a screenshot of the site's real rendered design, not a generated stock illustration.
- The shared metadata resolver now supplies that image with dimensions and alt text, retires the old photo at either the page or default setting level, preserves other custom CMS images, and explicitly keeps Open Graph and Twitter metadata consistent. Missing or invalid media falls back to the workbench. The unconfigured canonical-domain fallback now uses the actual public domain.
- Regression evidence: six metadata assertions failed before the fix; all seven metadata tests passed afterward. The full compatible Vitest run passed 202 tests across 53 files. TypeScript, scoped ESLint, and whitespace checks passed.
- Seven live Playwright checks passed in 22.2 seconds: the existing four release checks plus three crawler checks. Sharing checks read metadata from the initial HTML head without running the site's JavaScript, fetched the referenced JPEG, verified dimensions, and matched its SHA-256 to the local asset.
- Live deployment `dpl_13JF8YGQZTFF76FWyEUYHoPYuBjd` is READY and verified on the public domain. Its aliases include the public and officer domains. Unique URL: https://oberlin-engineering-club-ocep0hzne-frank-kusi-appiahs-projects.vercel.app.
- No WhatsApp message was sent or edited. The website metadata and image are verified; an already-generated WhatsApp card and WhatsApp's internal cache cannot be forcibly refreshed from this deployment.

## Scope and Visual Truth

The user selected the running Robot Companion direction, then requested a physical project-tablet reveal, a join interaction, production deployment, and removal of the black loading gap. This review covers that chosen direction and those additions, not a claim of pixel-identical reproduction of the earlier photorealistic concept.

Original art-direction reference: `/Users/kwaku/.codex/generated_images/01a03ab2-4925-7081-a9db-91f365af7a7f/exec-f4fd99b3-68b2-4aed-8dd2-ccae20c70764.png`.

Implementation: `http://127.0.0.1:3021/`, `/projects`, `/projects/ender-3-klipper-upgrade`, and `/get-involved`.

## Evidence

- Reference: 1586 x 992 pixels, normalized to 1440 x 900 for comparison.
- Desktop: 1440 x 900 CSS pixels, DPR 1. `/tmp/oec-robot-final-desktop-a.png` and `/tmp/oec-robot-final-desktop-b.png`.
- Combined full-view comparison: `/tmp/oec-robot-reference-comparison.png`. Source left, implementation right. Typography, composition, badge, color panels, and primary action were compared together.
- Focused working tablet evidence: `/tmp/oec-robot-project-tablet.png`; search returned the matching published project and its full detail page opened.
- Mobile: 390 x 844 CSS pixels, DPR 1. `/tmp/oec-robot-final-mobile.png` and `/tmp/oec-robot-mobile-review.png`.
- Actual framebuffer first frames: `public/brand/robot/first-frame-desktop.webp` (1440 x 838, 56,442 bytes) and `first-frame-mobile.webp` (390 x 780, 24,982 bytes). These contain the scene only, not rasterized navigation or text controls.

## Comparison History

1. Fixed over-bright visor materials and geometry protruding through the face. The latest desktop capture shows a dark, readable LED face with a continuous screen.
2. Fixed the robot's scale and camera framing, then added a pocket, articulated presentation gesture, physical tablet, and club badge. These are intentional user-requested additions.
3. Fixed mobile columns/layout from the earlier alternatives; the robot is the sole production direction.
4. Fixed programmatic form scrolling moving the CSS3D renderer away from its physical frame. Outer layers now use overflow:clip, and the join form scrolls only its tablet content. Repeated mobile progression through review left the renderer scrollTop at zero.
5. Enlarged mobile tablet text and kept the robot and badge visible above it. The screen measured x=20.94..369.06 and y=181.43..744.43 in a 390 x 844 viewport, with no horizontal page overflow.
6. Removed the initial empty 3D loading surface. Responsive first-frame images are server-rendered with eager/high-priority loading, and live WebGL fades in only after rendered frames are ready. The robot no longer waits for the dimensional font used by the other concepts.

## Required Fidelity Surfaces

- Typography: Inter/Arial interface stack, zero letter spacing, large three-line brand heading and smaller tablet headings. Mobile has independent fixed type sizes. Main project title, review values, form fields, and navigation were visually checked.
- Layout: full-bleed model; large heading left and primary action right on desktop; vertically recomposed mobile hero. Tablet content is attached to a moving CSS3DObject aligned to a real Three.js case, not a separate modal over a background. Persistent navigation and closing controls remain accessible.
- Colors: charcoal, porcelain, scarlet, chartreuse, and violet follow the selected direction. The visor was darkened for LED contrast. Bright lime retains primary-action emphasis.
- Assets: existing club badge is reused. Robot, articulated hand, pocket, tablet, badge holder, and colored forms are real runtime geometry. The generated reference remains more photorealistic; the selected implementation is intentionally stylized and does not claim equivalent sculpted asset detail.
- Copy/content: production uses published project records, full existing detail routes, CMS content, and the existing real submission form. Preview routes retain explicit no-submission messaging. Invented event dates and promotional status labels were not added.

## Verification

- Production build passed, including TypeScript and 90 static-page generations.
- Targeted lint passed for the new concept components, public layout, route, and edited join form.
- Eleven targeted unit tests passed across first-frame SSR, concept-only joining, real join validation/network handling, project cards, public shell, and page rendering.
- In-app browser: homepage, greeting, pause/resume, project search, project detail, and project-specific join deep link tested.
- Real join form tested through review with fictional preview details; no live submission was sent.
- Browser console warning/error check returned an empty list during local testing.
- Canvas pixel checks: desktop RGB standard deviations 83.65/82.42/75.52; mobile 90.23/87.03/73.43. Desktop frame difference averaged 10.48 channel levels with 13.99% of sampled channels changing by more than eight levels, confirming nonblank rendering and motion.

## Residual Notes

- The photorealistic concept is a direction reference, not the shipped mesh. Further sculpting/texturing is optional visual polish.
- The full repository test suite has pre-existing harness conflicts; the listed focused suite is the verified scope.
- Live database writes and outgoing email delivery were deliberately not exercised. Existing submission validation and error handling were retained and tested with mocks.
- Physical low-end phones and forced WebGL context loss were not tested. A first-frame fallback and usable HTML content path are implemented.

## Project-Based Workshop Revision - September 5, 2026

The user confirmed there are no company partners and delegated the design decisions. This revision keeps the selected robot and physical tablet, but changes the homepage into a scrollable project-based club experience. This supersedes the single-viewport homepage composition described above.

- Opening: smaller brand heading, direct club purpose, and visible entry points for projects, proposals, and capstone exploration. A hint of the next section remains visible on the checked phone and laptop viewports.
- Project bench: seven published projects from the live CMS, a discipline filter, selectable project index, exact-title join links, and an interactive Three.js printer assembly. The assembly is explicitly illustrative, not presented as a scan or photograph of the club's equipment.
- Ideas: an explanation of proposal review and an existing authenticated member-workspace route, alongside the public no-account proposal form.
- Capstones: exploratory requests only; no company logos, named partners, placements, or academic-credit guarantees. Requests retain the existing propose_project backend type with a Capstone exploration message tag. General membership requests do not inherit that tag.
- Performance: robot first-frame assets remain in server HTML. The additional assembly loads near its section; offscreen and hidden scenes stop rendering. Reduced-motion handling and explicit pause controls remain available.

### Revision Verification

- Sixteen focused tests passed across seven test files. Coverage includes project selection/filtering, exact join links, empty content, capstone payloads, validation, data retention, and network failure recovery. No real submissions were sent.
- TypeScript, targeted ESLint, local production build, and remote production build passed. The existing Next.js middleware deprecation warning remains unrelated to this change.
- Browser checks covered 1440 x 900, 1280 x 720, 390 x 844, and 375 x 667. The 390 x 844 capstone review screen retained its idea and contact values, with tablet bounds x=20.94..369.06 and y=181.43..744.43 and outer renderer scrollTop=0.
- Fixed and rechecked projects-to-capstone navigation: the destination was /#capstones with the section top at -0.07 CSS pixels. An isolated in-app tab avoided interference with simultaneous browsing in the visible preview.
- Screenshots: /tmp/oec-workshop-final-desktop.png (1280 x 720), /tmp/oec-workshop-mobile-home.png, /tmp/oec-workbench-mobile-a.png, /tmp/oec-workbench-mobile-exploded.png, /tmp/oec-capstone-mobile-review.png.
- Canvas checks: mobile RGB standard deviations 58.93/58.70/57.70; changing assembly mode changed 27.31% of sampled channels by more than eight levels. Desktop RGB standard deviations 56.19/56.03/55.11; animated frames differed by 13.08 channel levels on average, with 15.82% changing by more than eight levels.
- Production deployment dpl_BJ5oCBtTr2wwkDfGf1japzxLHKQF is READY and aliased to https://oberlin32engineeringsociety.com/. This is a working-tree deployment; no new Git commit or push was made.
- Live HTTP checks returned 200 for home, projects, capstone form, admin login, member login, and the mobile first-frame asset (24,982 bytes). Live browser checks confirmed seven projects, the two matching Chemical & Materials projects, the correct project-specific join URL, an operational assembly, and the capstone checkbox/notice on its dedicated entry path. Live warning/error logs were empty.

## Workbench Cabinet Preview - September 6, 2026

### Scope and Reference

This is a local-only design iteration at `http://127.0.0.1:3022/concepts/workbench`. It does not supersede the production release records above. No deployment, account changes, live form submission, or email was performed.

Source visual: `/Users/kwaku/.codex/generated_images/01a03ab2-4925-7081-a9db-91f365af7a7f/exec-a42b1e09-daad-49ea-8583-ed00fee7e0ab.png`.

The user approved this cabinet concept, then explicitly rejected the paper-like surfaces and requested the inner pages and lower section be redesigned as well. They delegated the remaining design decisions. Consequently, the dark metal project drawer, dark reading consoles, project modules, calendar, raised lettering, and lower project section are intentional adaptations, not a pixel-identical image clone.

Evidence directory: `/Users/kwaku/.codex/visualizations/2026/08/25/01a03ab2-4925-7081-a9db-91f365af7a7f/machine-release/workbench-cabinet/`.

### Comparison Evidence

- Source: 1536 x 1024 pixels. Desktop implementation: 1536 x 1024 CSS pixels and screenshot pixels, DPR 1, home state, running motion.
- Full-view comparison: `comparison-before.png`, then `comparison-final.png`. Both images are normalized to 768 x 512 and placed side by side, source left and implementation right.
- Focused comparison: `comparison-details.png`, matching source/implementation regions x=90, y=140, width=1350, height=710, normalized to 810 x 426 each. It examines lettering, printer geometry, controls, and drawer. The later full-view capture includes the final left-spacing/contact-shadow adjustment.
- Final home: `desktop-home.png`. Inner views: `desktop-projects.png`, `desktop-events.png`, `desktop-about.png`, `desktop-join.png`. Lower section: `desktop-lower.png`.
- Phone evidence: `mobile-home.png`, `mobile-projects.png`, `mobile-events.png`, `mobile-signup.png`, `small-phone.png`. Standard phone viewport: 390 x 844; small phone: 320 x 568, DPR 1.
- Additional rendered checks at 840 x 837 verified the two-column layout and text fit.

### Findings and Resolution

1. [P2, resolved] Initial rendering flattened the materials and letterforms. Reduced ambient lighting, added deterministic brushed-metal bump maps, real extruded licensed Barlow lettering, a deep graphite printer bay, and machined controls. Compared the resulting render against the source in `comparison-final.png`.
2. [P2, resolved] Early lettering cast oversized shadows, the left content was cramped, and the frame cast a long backdrop shadow. Reduced type extrusion, increased left spacing, sculpted the chassis ends, and replaced backdrop shadows with a physical floor and supporting feet. Final evidence: `desktop-home.png` and `comparison-final.png`.
3. [P2, resolved] The 320 x 568 home surface overflowed by 19 pixels and clipped the drawer. Compacted the short-phone header, title, selector rail, and spacing. The home surface subsequently measured 376 client-height and 376 scroll-height, with no horizontal overflow.
4. [P2, resolved] Inner pages and lower links retained the rejected lined-paper style. Rebuilt them as a consistent dark console: project modules, retained search/discipline filters, a three-step signup layout, branded About view, and functional monthly calendar. The home drawer now uses dark metal rather than ruled paper.
5. [P2, resolved] The first calendar layout grew oversized at desktop width. Capped the calendar track at 480 pixels while retaining responsive seven-column date controls.
6. [P2, resolved] Hidden or obstructed Three.js controls could still receive raycast actions. Added a visibility/occlusion-aware hit resolver scoped to workbench and verified the original failures with red/green unit tests.
7. [P2, resolved] Font arrival could leave measured lettering stale; Home could trap scrolling; the light header inherited a low-contrast focus ring. Added word/font observers with cleanup, restored Home scroll chaining, and set a dark header focus color.
8. [P3, resolved] Instanced cable buffers and owned bump maps needed explicit cleanup. Their disposal is now included in scene teardown.

### Required Fidelity Surfaces

- Typography: self-hosted Barlow Condensed, IBM Plex Sans, and IBM Plex Mono; zero letter spacing. The main heading is actual Three.js extruded geometry made from a small local font subset, with semantic HTML and readable fallback text retained. Inner headings are smaller and title case; long project names wrap without horizontal overflow.
- Spacing/layout: full-width machine chassis with recessed right bay, a left control rail, accessible flat reading area, and a visible hint of the next section. No decorative page cards are nested. Project cards are individual repeated records; the calendar is a framed interactive tool.
- Color/tokens: enamel red, silver, graphite, and muted green instrument surfaces, with readable pale text and red interaction accents. The paper-white drawer and ruled catalog rows were removed in response to the user.
- Image/asset quality: original OEC badge reused. Printer, chassis, bolts, dial, lever, drawer, moving carriage, lead screw, cable, and heading are live Three.js geometry. Lucide supplies interface icons. No generated bitmap is used as a substitute for the interactive machine. The offline reference remains more photorealistic; this implementation is visibly a real-time model, not claimed to be an exact offline-render match.
- Copy/content: seven real published project records; no invented events, membership statistics, sponsors, or company relationships. Signup clearly remains a non-submitting preview. The calendar uses Oberlin-local dates and event times.

### Verification

- 68 focused tests passed across 12 files, covering workbench geometry, navigation, project drawer/detail/filtering, signup validation/retention, calendar month/date filtering, hit testing, native surface behavior, and shared machine/public-flow regressions.
- TypeScript (`--incremental false`), targeted ESLint, and `git diff --check` passed. A production build/deployment was not run for this local preview.
- Browser exercised home/drawer navigation, project-specific signup through completion with `Preview Student` / `preview@example.com`, search plus discipline filtering (two matching PET projects), events month/date controls, About navigation, pause/resume, and exploded/assembled geometry.
- Phone catalog scroll reached 1781.5 pixels while document scroll stayed 0 and document width stayed 390 pixels. Home scroll chaining reached the real lower section. The same DOM form retains values through native surface handoff.
- Desktop motion evidence uses two full-page captures at the same home state and document scroll 0, then crops the actual canvas bay (610 x 400). 27,049 of 244,000 pixels changed above the threshold; RGB standard deviations were 36.81 / 34.41 / 34.31. Files: `motion-full-a.png`, `motion-full-b.png`, `motion-a.png`, `motion-b.png`.
- Paused mobile assembled/exploded captures at document scroll 0 changed 6,145 of 36,140 pixels in the measured bay crop. Files: `mobile-motion-a.png`, `mobile-motion-b.png`. This isolates an explicit geometry interaction rather than a page scroll.
- Browser console error checks returned no errors. Browser tests used viewport emulation; physical low-end phones and hardware-GPU performance were not tested.

### Remaining Polish

- Optional P3: a professionally authored, high-resolution printer asset could improve material and mechanical realism beyond this real-time procedural model. That is not represented as already delivered.
- The preview intentionally does not submit registrations or change the production site.

final result: passed
