import { z } from 'zod'

const uuid = z.string().uuid()
const status = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'])
const optionalDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()]).optional()

export const workspaceActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('milestone'), id: uuid.nullish(), title: z.string().trim().min(2).max(160), description: z.string().max(2000).default(''), status: status.default('TODO'), dueDate: optionalDate, sortOrder: z.number().int().min(0).max(10000).default(100), assigneeUserId: uuid.nullish() }),
  z.object({ action: z.literal('milestone-status'), milestoneId: uuid, status }),
  z.object({ action: z.literal('milestone-claim'), milestoneId: uuid, claim: z.boolean() }),
  z.object({ action: z.literal('milestone-delete'), milestoneId: uuid }),
  z.object({ action: z.literal('remove-member'), userId: uuid }),
  z.object({ action: z.literal('post'), kind: z.enum(['UPDATE', 'WIN', 'BLOCKER', 'QUESTION']).default('UPDATE'), body: z.string().trim().min(2).max(4000) }),
  z.object({ action: z.literal('post-delete'), postId: uuid }),
  z.object({ action: z.literal('link-add'), label: z.string().trim().min(1).max(120), url: z.string().trim().url().max(2000).refine(value => /^https?:\/\//i.test(value), 'TEAM_LINK_INVALID') }),
  z.object({ action: z.literal('link-remove'), linkId: uuid }),
  z.object({ action: z.literal('leave') }),
  z.object({ action: z.literal('resubmit-update'), updateId: uuid, title: z.string(), summary: z.string().default(''), body: z.string().default(''), milestone: z.string().default(''), updateDate: optionalDate }),
])
export type WorkspaceAction = z.infer<typeof workspaceActionSchema>

const messages: Record<string, string> = {
  PROJECT_LEAD_REQUIRED: 'Only a project lead can do that.',
  PROJECT_MEMBER_REQUIRED: 'You are no longer on this project team. Refresh the page.',
  SOLE_PROJECT_LEAD: 'You are the only lead. Ask a club officer to appoint another lead before you leave.',
  MILESTONE_ALREADY_CLAIMED: 'A teammate already took this milestone.',
  MILESTONE_NOT_YOURS: 'Only the person who took this milestone, or a lead, can hand it back.',
  MILESTONE_ASSIGNEE_NOT_ON_TEAM: 'Choose someone who is on the team.',
  MILESTONE_NOT_FOUND: 'This milestone was removed. Refresh the page.',
  CANNOT_REMOVE_PROJECT_LEAD: 'Leads can only be removed by a club officer.',
  TEAM_POST_FORBIDDEN: 'You can only delete your own posts.',
  TEAM_LINK_FORBIDDEN: 'Only the person who added this link, or a lead, can remove it.',
  TEAM_LINK_INVALID: 'Links must start with https:// or http://.',
  TEAM_LINK_LIMIT_REACHED: 'This team already has 30 links. Remove one first.',
  TEAM_UPDATE_NOT_EDITABLE: 'This update is not waiting on changes, so it cannot be edited.',
  TEAM_UPDATE_FORBIDDEN: 'Only the person who submitted this update, or a lead, can revise it.',
  PROJECT_UPDATE_TITLE_REQUIRED: 'Give the update a title of at least 3 characters.',
  PROJECT_UPDATE_CONTENT_REQUIRED: 'Add a summary or body of at least 10 characters.',
  ALREADY_INVITED: 'This member already has an open invitation.',
  ALREADY_PROJECT_MEMBER: 'This member is already on the team.',
  MEMBER_NOT_INVITABLE: 'This member cannot be invited right now.',
  APPLICANT_NOT_ACTIVE: 'This applicant no longer has an active membership.',
  PROJECT_APPLICATION_ALREADY_REVIEWED: 'This application was already handled. Refresh the page.',
}
export function workspaceErrorMessage(code: string) {
  return messages[code] ?? 'That change could not be saved. Please try again.'
}
export function publicWorkspaceError(code: string) {
  return Object.hasOwn(messages, code) ? code : 'WORKSPACE_UPDATE_FAILED'
}
