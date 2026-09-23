# Project teams

## Adding people to projects

Requests to join a project arrive two ways:

- **Project applications**: a member applies from the member portal.
- **Inbox**: someone uses the public "Join a project" form.

**Add to team** makes the person a regular team member. This is the right choice for almost everyone. **Make lead** is a separate, confirmed choice for the person who will run the project. Applications can also be **declined** with an optional note. Approving someone never demotes an existing lead.

The person must have an active membership account. They get an in-app notice and an email with a link to their workspace. If the email fails, the approval still stands.

## Project teams page (`/admin/project-teams`)

Every project with its members, leads, milestone progress and last activity. Filters show projects with **no members yet**, projects that **need a lead**, **applications waiting**, projects **ready to start**, projects **underway**, and **hidden** projects.

Open a project to:

- **Start the project.** It is marked Active on the website, the team gets an in-app notice, and everyone on the roster gets a kickoff email with your message, first meeting time and place. You can email the team again later; every kickoff email is logged with how many were sent.
- **Manage the roster.** Add any active member, make someone lead or member, or remove anyone (including leads).
- **Handle applications** for that project.
- **Follow progress:** milestones, the team feed, links and public updates. Officers can post a note to the team feed.
- **Hide from website** (reversible) or **delete permanently** (type the project title to confirm; the team is notified).

## What members can do in their workspace

- Post to a private **team feed**: progress updates, wins, blockers and questions. Teammates are notified.
- Move any milestone between To do, In progress, Blocked and Done, and **claim** unowned milestones. Leads add, edit, assign and delete milestones.
- Keep shared **team links** (drive folders, CAD, parts lists, code).
- Submit **website updates** for officer review, and revise and resubmit when an officer asks for changes.
- **Leave** the project. A sole lead with teammates must ask an officer to appoint another lead first.
- Withdraw a pending application, and apply again after a decline.

## Deployment

Apply `database/migrations/027_project_team_management.sql` before deploying this code. For the September 2026 roster cleanup, run `database/maintenance/2026-09-22_project_roster_cleanup.sql` once, after 027.

The integration tests load the real migrations into an isolated PGlite database; they never connect to production or send email.
