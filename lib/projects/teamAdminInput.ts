import { z } from 'zod'

const uuid = z.string().uuid()
const role = z.enum(['MEMBER', 'LEAD'])

export const projectInterestDecisionSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('application'), requestId: uuid, role: role.default('MEMBER') }).strict(),
  z.object({ source: z.literal('submission'), requestId: uuid, projectId: uuid, role: role.default('MEMBER') }).strict(),
])
export type ProjectInterestDecision = z.infer<typeof projectInterestDecisionSchema>

export const projectTeamActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('decline-application'), applicationId: uuid, note: z.string().trim().max(1000).default('') }).strict(),
  z.object({ action: z.literal('set-member'), projectId: uuid, userId: uuid, role }).strict(),
  z.object({ action: z.literal('remove-member'), projectId: uuid, userId: uuid }).strict(),
  z.object({
    action: z.literal('start'), projectId: uuid,
    message: z.string().trim().max(4000).default(''),
    meetingAt: z.string().datetime({ offset: true }).nullable().default(null),
    location: z.string().trim().max(300).default(''),
  }).strict(),
  z.object({ action: z.literal('post'), projectId: uuid, kind: z.enum(['UPDATE', 'WIN', 'BLOCKER', 'QUESTION']).default('UPDATE'), body: z.string().trim().min(2).max(4000) }).strict(),
  z.object({ action: z.literal('archive'), projectId: uuid, archived: z.boolean() }).strict(),
  z.object({ action: z.literal('delete'), projectId: uuid, confirmTitle: z.string().max(300) }).strict(),
])
export type ProjectTeamAction = z.infer<typeof projectTeamActionSchema>

const messages: Record<string, string> = {
  ACTIVE_MEMBER_REQUIRED: 'This person needs an active member account first. Approve or finish their membership under Members, then try again.',
  PUBLISHED_PROJECT_REQUIRED: 'Choose a project that is published on the website.',
  PROJECT_MISMATCH: 'This request belongs to a different project. Refresh the page and check it again.',
  PROJECT_INTEREST_NOT_PENDING: 'This request was already handled. Refresh the page to see where it stands.',
  PROJECT_INTEREST_NOT_FOUND: 'This request could not be found. Refresh the page and try again.',
  PROJECT_APPLICATION_ALREADY_REVIEWED: 'This application was already handled. Refresh the page to see where it stands.',
  PROJECT_APPLICATION_NOT_FOUND: 'This application could not be found. Refresh the page and try again.',
  PROJECT_TEAM_ADMIN_REQUIRED: 'Only an active Admin or Super Admin can manage project teams.',
  PROJECT_NOT_FOUND: 'This project no longer exists. Refresh the page.',
  PROJECT_MEMBER_NOT_FOUND: 'This person is no longer on the project team.',
  PROJECT_HAS_NO_MEMBERS: 'Add at least one team member before starting this project.',
  PROJECT_ALREADY_COMPLETE: 'This project is marked complete. Change its stage in Projects before starting it again.',
  PROJECT_DELETE_CONFIRMATION_MISMATCH: 'The title you typed does not match this project. Nothing was deleted.',
  TEAM_POST_REQUIRED: 'Write a short message first.',
}
export function projectTeamErrorMessage(code: string) {
  return messages[code] ?? 'That change could not be saved. Nothing was lost; please try again.'
}
export function publicProjectTeamError(code: string) {
  return Object.hasOwn(messages, code) ? code : 'PROJECT_TEAM_ACTION_FAILED'
}
