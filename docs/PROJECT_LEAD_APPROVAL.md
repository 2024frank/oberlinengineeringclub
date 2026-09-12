# Appointing Project Leads

Admins and Super Admins can appoint a lead from an existing request:

- Public project-interest forms appear in **Inbox**. Select **Approve as project lead**, check the member and selected project, then **Confirm project lead**.
- Member applications appear in **Project applications** with the applicant's name and email. The same approval action appoints the applicant to that project.

The recipient must have an active membership account. This action does not approve club membership, activate an account, or grant officer access. Missing or unactivated accounts remain blocked until membership setup is finished.

An approved lead can open **My teams**, manage milestones, invite members, and review applications. Every appointment is explicit: approving another person as lead adds a co-lead without replacing an existing lead. Ordinary application and invitation acceptance still adds teammates, not leads.

The appointment, request status, audit entry, and in-app notification are saved in one database transaction. Email is attempted afterward; email failure is shown without undoing the appointment. Repeating an already-successful request does not send another notification or email. No existing applicants are automatically approved by this release.

## Deployment

Apply `database/migrations/023_admin_project_lead_approval.sql` before deploying the new approval screens. It adds approval tracking fields and an authenticated, admin-checked RPC. The two existing acceptance RPCs are updated only to preserve an active lead's role when an older application or invitation is accepted.

Run `npm test` and `npm run build`. The admin-lead integration tests load the relevant real migrations into an isolated PGlite database; they never connect to production or send email.
