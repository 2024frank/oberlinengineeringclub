# Team-first collaboration

Approved in chat: members form a team, invite peers who accept, then request an existing project or propose a new one. Members browse teams and project rosters; admins see all teams and approve project connections.

## Data and permissions

Add club teams independently of canonical projects. A team has one lead, active memberships, invitations or join requests, and project connections with PENDING, APPROVED or REJECTED status. Existing project memberships and URLs remain valid. Team leads may manage their team, not automatically manage connected projects. Only project leads or admins approve connections. Approved connections grant team members project-member access dynamically; leaving a team revokes that source of access. Explicit project removal overrides team-derived access. Direct project leads are never demoted.

New proposals optionally belong to a team, submitted only by its lead. Existing admin proposal review creates the canonical project and approves the connection atomically. No duplicate projects and no automatic approval of existing data.

## Experience

My teams includes standalone teams and existing project workspaces. Find teams shows rosters, recruiting status and linked published projects. Find teammates adds invitation controls. Team pages provide roster management, join-request review, project selection and team proposals. Invitations show accept/decline and expiry. Admin Teams shows team membership, project requests and existing project rosters.

All discovery is signed-in only. Outside a shared workspace, names and identifiers respect directory visibility and visible-name settings; contacts are never exposed by team endpoints. Pending requests and unpublished ideas are private. Use current portal styling, plain copy, no decorative 3D, no visible browser disruption.

## Verification

Use isolated PostgreSQL integration tests for authorization, lifecycle, proposal integration, removal, privacy and existing-team regression. Test route validation and UI pending/error/success states. Verify desktop and mobile headlessly. Production migration must leave existing memberships unchanged and only run after local checks.
