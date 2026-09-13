import { z } from 'zod'
const teamId = z.string().uuid()
const description = z.string().trim().max(1200).default('')
const fields = { name: z.string().trim().min(3).max(80), description, recruiting: z.boolean().default(true) }
const decision = z.enum(['ACCEPT', 'DECLINE'])
export const teamActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), ...fields }).strict(),
  z.object({ action: z.literal('update'), teamId, ...fields }).strict(),
  z.object({ action: z.literal('invite'), teamId, userId: teamId, message: description }).strict(),
  z.object({ action: z.literal('join'), teamId, message: description }).strict(),
  z.object({ action: z.literal('respond'), teamId, decision }).strict(),
  z.object({ action: z.literal('review-member'), teamId, userId: teamId, decision }).strict(),
  z.object({ action: z.literal('remove'), teamId, userId: teamId }).strict(),
  z.object({ action: z.literal('transfer'), teamId, userId: teamId }).strict(),
  z.object({ action: z.literal('revoke'), teamId, userId: teamId }).strict(),
  z.object({ action: z.literal('leave'), teamId }).strict(),
  z.object({ action: z.literal('request-project'), teamId, projectId: teamId }).strict(),
  z.object({ action: z.literal('review-project'), teamId, projectId: teamId, decision: z.enum(['APPROVE', 'REJECT']) }).strict(),
])
export type TeamAction = z.input<typeof teamActionSchema>
const errors: Record<string, string> = {
  ACTIVE_MEMBER_REQUIRED: 'Sign in with an active member account to continue.',
  TEAM_NOT_FOUND: 'This team could not be found.',
  TEAM_LEAD_REQUIRED: 'Only the team lead can make this change.',
  TEAM_LIMIT_REACHED: 'You have reached the team creation limit. Contact an officer for help.',
  TEAM_NOT_RECRUITING: 'This team is not taking join requests right now.',
  MEMBER_NOT_INVITABLE: 'This member is unavailable for invitations. They can request to join instead.',
  ALREADY_TEAM_MEMBER: 'This person is already on the team.',
  TEAM_MEMBER_NOT_FOUND: 'This person is no longer on the team.',
  TEAM_INVITATION_NOT_FOUND: 'This invitation or request is no longer available.',
  TEAM_REQUEST_ALREADY_REVIEWED: 'This request has already been handled.',
  TRANSFER_TEAM_LEAD_FIRST: 'Choose another team lead before leaving.',
  PROJECT_NOT_ACCEPTING_TEAMS: 'This project is not accepting teams right now.',
  PROJECT_REVIEW_FORBIDDEN: 'Only a project lead or admin can review this request.',
  TEAM_PROJECT_NOT_PENDING: 'This project request has already been handled.',
}
export function teamError(error: unknown) {
  return error instanceof Error ? errors[error.message] ?? 'The change could not be saved. Please try again.' : 'The change could not be saved. Please try again.'
}
