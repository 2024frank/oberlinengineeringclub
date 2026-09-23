import { z } from 'zod'
const positionId = z.string().uuid()
export const officerMemberActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('apply'), positionId, statement: z.string().trim().min(20).max(3000), experience: z.string().trim().max(2000).default('') }).strict(),
  z.object({ action: z.literal('withdraw'), positionId }).strict(),
])
export const officerReviewSchema = z.object({ action: z.literal('review'), positionId, userId: z.string().uuid(), decision: z.enum(['SHORTLISTED', 'NOT_SELECTED']), feedback: z.string().trim().max(2000).default('') }).strict()
export type OfficerAction = z.infer<typeof officerMemberActionSchema> | z.infer<typeof officerReviewSchema>
export function officerError(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  const messages: Record<string, string> = {
    POSITION_CLOSED: 'This position is no longer accepting applications.',
    POSITION_NOT_FOUND: 'This position could not be found.',
    ACTIVE_MEMBER_REQUIRED: 'Sign in with an active member account.',
    ADMIN_REQUIRED: 'Only admins can review officer applications.',
    APPLICATION_REVIEWED: 'This application has already been reviewed and cannot be edited.',
    APPLICATION_INVALID: 'Write a statement of 20 to 3,000 characters and keep experience under 2,000 characters.',
    APPLICATION_NOT_WITHDRAWABLE: 'This application cannot be withdrawn.',
    APPLICATION_NOT_REVIEWABLE: 'This application was withdrawn or could not be found.',
  }
  return messages[code] ?? 'We could not save this change. Please refresh and try again.'
}
export function officerLoginNext(value: unknown) {
  if (typeof value !== 'string') return '/member'
  if (value === '/member/leadership') return value
  const match = /^\/member\/leadership\?position=([\da-f-]+)$/i.exec(value)
  if (match) return positionId.safeParse(match[1]).success ? value : '/member'
  // Project links from the public site: apply to a project or open its workspace.
  const project = /^\/member\/(?:applications\?project=|teams\/)([\da-f-]{36})$/i.exec(value)
  return project && positionId.safeParse(project[1]).success ? value : '/member'
}
