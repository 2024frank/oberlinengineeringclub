# OEC Walkthrough Videos

Prepared September 5, 2026 from the current website source.

## Production status

- Narration scripts and shot lists: complete, with the spoken wording in the three guide files.
- HeyGen website: signed in.
- Voice library: Kwaku confirmed that `UC Warehouse 2` is his voice recording.
- Voice audition: generated in HeyGen Studio with the confirmed clone, Eleven Multilingual v2, speed 1.0. Duration: approximately 9.51 seconds. Kwaku approved the voice and pace on September 5, 2026.
- Three 1920 x 1080 MP4 walkthroughs exported with the approved voice, burned-in captions, separate SRT/VTT captions, animated pointer cues, and selected close-ups.
- These are edited walkthroughs assembled from isolated demo screen captures, not continuous recordings of live accounts. Core login, activation, profile, project application, member review, content editing, and staff invitation components come from the current repository. Some populated list screens use illustrative demo fixtures.
- Private outputs, an HTML viewing page, source captures, narration tracks, rendering scripts, shot timings, and verification results are in the output folder below. No videos were published.
- All three MP4s were decoded without errors. Stream dimensions, caption timing, nonblank frames at every shot, and nonclipping audio were checked. Speech was transcribed locally and compared with the scripts; spot frames and shot contact sheets were visually reviewed. A full real-time listening/viewing pass remains for Kwaku's review.
- No member invitations, approvals, applications, publications, or account changes may be performed on production just to record a tutorial.

## Three videos

1. `01-member-access.md`: sign in and use the member workspace.
2. `02-admin-walkthrough.md`: review requests, manage members and content, and locate officer invitations.
3. `03-member-setup.md`: accept an invitation or request an account, activate it, and set profile privacy.

Final format: 1920 x 1080 landscape, H.264/AAC, 24 fps. Member workspace: 1:20. Officer portal: 2:08. Member setup: 1:39. No stock presenter is used.

Use isolated demo data for private screens, clearly identified as a demonstration. Never show real member rosters, sign-in tokens, passwords, private messages, browser autofill, API keys, or unrelated browser tabs. Stop before consequential actions on a live account. Demonstrate completed states only in an isolated recording environment, not by editing the production database.

The two member videos may be shared with students. Keep the admin walkthrough separate for officers.

## Voice audition

After confirming the clone belongs to Kwaku, synthesize only this short sample first:

> Hey everyone, here's a quick look at the Oberlin Engineering Club website. I'll show you how to get into your account, find a project, and see what your team is working on.

Audition draft: https://app.heygen.com/create-v4/e46107cfc4ca4f8b8f6cca7dc2c3acd1

The private audio export is outside the website repository:
`/Users/kwaku/.codex/visualizations/2026/08/25/01a03ab2-4925-7081-a9db-91f365af7a7f/oec-tutorials/voice-audition.mp3`

Review pronunciation of Oberlin, pace, clarity, and whether the delivery sounds like the speaker. Do not describe a synthesized track as a live recording. Do not generate the full three tracks until the sample is accepted. Actual narration recorded by Kwaku can replace the synthetic voice without changing the video structure.

## Final checks

- Verify every recorded label against the deployed interface before capturing it.
- Match the cursor action to the spoken instruction and let the destination finish loading.
- Explain that an application is a request, not automatic team membership.
- Explain that member approval does not grant officer permissions.
- Do not promise that emails always arrive in Inbox; distinguish provider acceptance from delivery.
- Check the newest account email without exposing its private URL.
- Watch all three final exports, listen to the full audio, check caption timing, and inspect the videos for private data.
- Deliver MP4 files, caption files, and the editable narration scripts. Do not publish them automatically.

## Source references

- `docs/ADMIN_OPERATIONS.md`
- `lib/navigation/portal.ts`
- `components/member/MemberLoginPanel.tsx`
- `components/member/MemberActivationForm.tsx`
- `components/member/MemberDashboard.tsx`
- `components/member/ProfileForm.tsx`
- `components/member/ProjectApplicationForm.tsx`
- `components/admin/system/AdminUsersManager.tsx`
- `components/admin/members/MemberApplicationQueue.tsx`
