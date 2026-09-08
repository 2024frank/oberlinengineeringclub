# Professional public site

September 2026 release. The normal public website replaces the workbench frame and printer hero. Concept routes remain available separately. Published CMS sections, navigation, settings, project data, and membership destinations are preserved. The new styles are scoped to `.professional-site`, outside the officer and member layouts.

The source branch first preserves the previously deployed, uncommitted production work in commit `940f88a8`, then reconciles it with upstream main in `39e06f8a`. The original working folders are not reset or overwritten. This prevents the public redesign from removing production membership and email fixes.

## Checks

- Initial release build: 218 Vitest tests and 20 Node tests passed; 20 Chrome/WebKit public browser checks passed. Four authenticated browser checks and eight existing database integration placeholders were skipped. All 18 public-page accessibility scans were clear; the final select-control change was rechecked at all three scan widths.
- The membership request dropdown has a tested minimum 44px touch target on WebKit. Route screenshots wait for scrolling to finish and isolate each document to avoid aborting Safari link prefetches during navigation.
- Unit and Node tests cover the preserved CMS, member workflows, public layout, and project filtering. The eight existing integration placeholders do not exercise a real database.
- `tests/e2e/professional-release.spec.ts` checks eleven public routes at five widths, image loading, document scrolling, navigation bounds, project search, interest selection, form validation, request review, error recovery, and sign-in availability. Submission requests are intercepted; these checks do not send email or create records.
- `tests/e2e/accessibility-navigation.spec.ts` exercises keyboard navigation. Authenticated drawer checks require dedicated test credentials and are not run with personal accounts.
- Use `PLAYWRIGHT_BASE_URL` to test a running production build. `PLAYWRIGHT_CHANNEL=chrome` selects installed Chrome for the Chromium project; the mobile project uses WebKit.
- The release upgrades Next and eslint-config-next to 16.3.0 and Sharp to 0.35.3, removing the known image-processing dependency advisories. React remains 19.2.6.
- Zero-row public API reads confirmed the project difficulty and membership invitation tracking columns exist in production. No migration was applied, no member records were fetched, and privileged invitation RPCs were not executed.

The inherited repository-wide lint baseline contains 90 errors. The public redesign introduces no lint errors. Full private-portal acceptance, live email delivery, and database RPC behavior are separate from this visual release's read-only checks.

The final changed-file lint check passes. The production build passes, and `npm audit --audit-level=moderate` reports zero vulnerabilities.

Live verification caught an officer-link prefetch crossing into the separate admin origin. The follow-up uses a deliberate document navigation. It also passes the actual page slug into CMS heroes, preserving interior image/split headings and eyebrows. Four new unit cases bring the total to 222 Vitest tests, with all 20 Node tests still passing. Six targeted Chrome/WebKit workflow checks pass, including the new document-navigation regression.

## Deployment

GitHub: `2024frank/oberlinengineeringclub`, branch `main`.

Existing Vercel project: `oberlin-engineering-club`, ID `prj_oZTEbRPOMABspDQurnQSk0cJ8RNr`, scope `frank-kusi-appiahs-projects`.

Confirm both `oberlin32engineeringsociety.com` and `admin.oberlin32engineeringsociety.com` resolve to the expected release. Never expose `.env` files, local review caches, or browser test artifacts in deployment uploads.
