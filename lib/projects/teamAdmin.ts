import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendTransactionalEmail, sendTransactionalEmailBatch } from '@/lib/email/client'
import { projectApplicationDecisionEmail, projectKickoffEmail, projectTeamWelcomeEmail } from '@/lib/email/templates'
import { memberSiteOrigin } from '@/lib/email/siteOrigin'
import type { ProjectInterestDecision, ProjectTeamAction } from './teamAdminInput'

export type ProjectRole = 'LEAD' | 'MEMBER'
export type ProjectTeamSummary = {
  id: string; title: string; slug: string; status: string; publicationState: string; recruiting: boolean
  startedAt: string | null; leadName: string; memberCount: number; leads: string[]; pendingApplications: number
  milestonesTotal: number; milestonesDone: number; lastActivityAt: string | null
}
export type AdminProjectTeam = {
  project: { id: string; title: string; slug: string; summary: string; status: string; publicationState: string; recruiting: boolean; leadName: string; nextStep: string; startedAt: string | null }
  roster: { userId: string; displayName: string; email: string; role: ProjectRole; joinedAt: string; viaTeam: boolean }[]
  applications: { id: string; userId: string; displayName: string; email: string; motivation: string; skills: string[]; createdAt: string }[]
  milestones: { id: string; title: string; description: string; status: string; dueDate: string | null; assigneeName: string | null; completedAt: string | null }[]
  posts: { id: string; kind: string; body: string; authorName: string; officer: boolean; createdAt: string }[]
  links: { id: string; label: string; url: string }[]
  kickoffs: { id: string; message: string; meetingAt: string | null; meetingLocation: string; recipientCount: number; emailsSent: number | null; createdAt: string; sentByName: string | null }[]
  updates: { id: string; title: string; reviewStatus: string; submittedAt: string }[]
}
export type ActiveMemberChoice = { userId: string; displayName: string; email: string }

async function rpc<T>(name: string, params?: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw new Error(error.message)
  return data as T
}
const workspaceUrl = (projectId: string) => `${memberSiteOrigin()}/member/teams/${projectId}`
async function tryEmail(to: string, message: Parameters<typeof sendTransactionalEmail>[0]['message']) {
  try { return await sendTransactionalEmail({ to, message, required: false }) } catch { return false }
}

export const listProjectTeams = () => rpc<ProjectTeamSummary[]>('admin_list_project_teams').then(rows => rows ?? [])
export const getAdminProjectTeam = (projectId: string) => rpc<AdminProjectTeam>('admin_project_team', { p_project_id: projectId })

export async function listActiveMemberChoices(): Promise<ActiveMemberChoice[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('member_profiles').select('user_id,display_name,oberlin_email').eq('status', 'ACTIVE').order('display_name').limit(1000)
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => ({ userId: row.user_id, displayName: row.display_name || row.oberlin_email, email: row.oberlin_email }))
}

export async function listProjectChoices() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('projects').select('id,title').eq('publication_state', 'published').order('title')
  if (error) throw new Error(error.message)
  return data ?? []
}

type ApprovalResult = { projectId: string; projectTitle: string; userId: string; memberName: string; memberEmail: string; role: ProjectRole; alreadyApproved: boolean }
export async function approveProjectInterest(input: ProjectInterestDecision) {
  const result = await rpc<ApprovalResult>('admin_approve_project_interest', {
    p_source: input.source, p_request_id: input.requestId,
    p_project_id: input.source === 'submission' ? input.projectId : null, p_role: input.role,
  })
  const emailSent = result.alreadyApproved ? false : await tryEmail(result.memberEmail, projectTeamWelcomeEmail({ memberName: result.memberName, projectTitle: result.projectTitle, role: result.role, actionUrl: workspaceUrl(result.projectId) }))
  return { result, emailSent }
}

export async function performProjectTeamAction(input: ProjectTeamAction) {
  switch (input.action) {
    case 'decline-application': {
      const result = await rpc<{ applicantEmail?: string; applicantName?: string; projectTitle?: string }>('review_project_application', { p_application_id: input.applicationId, p_decision: 'REJECT', p_note: input.note || null })
      const emailSent = result.applicantEmail ? await tryEmail(result.applicantEmail, projectApplicationDecisionEmail({ memberName: result.applicantName ?? 'there', projectTitle: result.projectTitle ?? 'OEC project', decision: 'REJECTED', note: input.note, actionUrl: `${memberSiteOrigin()}/member/applications` })) : false
      return { result, emailSent }
    }
    case 'set-member': {
      const result = await rpc<ApprovalResult & { previousRole: ProjectRole | null; changed: boolean }>('admin_set_project_member', { p_project_id: input.projectId, p_user_id: input.userId, p_role: input.role })
      // Email when someone joins or becomes a lead; a demotion is shown in-app only.
      const welcome = result.changed && (result.previousRole === null || result.role === 'LEAD')
      const emailSent = welcome ? await tryEmail(result.memberEmail, projectTeamWelcomeEmail({ memberName: result.memberName, projectTitle: result.projectTitle, role: result.role, actionUrl: workspaceUrl(result.projectId) })) : false
      return { result, emailSent }
    }
    case 'remove-member':
      return { result: await rpc('admin_remove_project_member', { p_project_id: input.projectId, p_user_id: input.userId }) }
    case 'start': {
      const result = await rpc<{ kickoffId: string; projectId: string; projectTitle: string; restarted: boolean; recipients: { displayName: string; email: string; role: ProjectRole }[] }>('start_project', {
        p_project_id: input.projectId, p_message: input.message, p_meeting_at: input.meetingAt, p_location: input.location,
      })
      const emailsSent = await sendTransactionalEmailBatch({
        idempotencyKey: `project-kickoff/${result.kickoffId}`,
        messages: result.recipients.filter(person => person.email).map(person => ({ to: person.email, message: projectKickoffEmail({ memberName: person.displayName, projectTitle: result.projectTitle, role: person.role, message: input.message, meetingAt: input.meetingAt, location: input.location, actionUrl: workspaceUrl(result.projectId) }) })),
      })
      await rpc('record_project_kickoff_delivery', { p_kickoff_id: result.kickoffId, p_emails_sent: emailsSent }).catch(() => false)
      return { result: { ...result, recipients: result.recipients.length }, emailsSent }
    }
    case 'post':
      return { result: await rpc('post_project_team_update', { p_project_id: input.projectId, p_kind: input.kind, p_body: input.body }) }
    case 'archive':
      return { result: await rpc('set_project_archived', { p_project_id: input.projectId, p_archived: input.archived }) }
    case 'delete':
      return { result: await rpc('delete_project', { p_project_id: input.projectId, p_confirm_title: input.confirmTitle }) }
  }
}
