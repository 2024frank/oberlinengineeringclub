import { z } from 'zod'

export const projectLeadApprovalSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('application'), requestId: z.string().uuid() }).strict(),
  z.object({ source: z.literal('submission'), requestId: z.string().uuid(), projectId: z.string().uuid() }).strict(),
])
export type ProjectLeadApprovalInput = z.infer<typeof projectLeadApprovalSchema>

const messages: Record<string, string> = {
  ACTIVE_MEMBER_REQUIRED: 'This person must finish setting up an approved membership account before becoming a project lead. Check their account under Members.',
  PUBLISHED_PROJECT_REQUIRED: 'Choose a published project for this request.',
  PROJECT_MISMATCH: 'This request belongs to a different project. Refresh the page and check it again.',
  PROJECT_INTEREST_NOT_PENDING: 'This request has already been reviewed or archived. Refresh the page to see its status.',
  PROJECT_INTEREST_ALREADY_REVIEWED: 'This appointment was already reviewed and the lead access has changed. Check the project team before trying again.',
  PROJECT_INTEREST_NOT_FOUND: 'This project-interest request could not be found. Refresh the page and try again.',
  PROJECT_LEAD_APPROVAL_FORBIDDEN: 'Only an active Admin or Super Admin can appoint project leads.',
}
export function projectLeadApprovalError(code: string) {
  return messages[code] ?? 'Could not approve this project lead. Your request is still here; please try again.'
}
export function publicProjectLeadError(code: string) {
  return Object.hasOwn(messages, code) ? code : 'PROJECT_LEAD_APPROVAL_FAILED'
}
