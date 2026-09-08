import { isOberlinEmail, type MembershipStatus } from '@/lib/auth/memberLifecycle'

export function parseMemberEmails(input: string): string[] {
  const emails = [...new Set(input.split(/[,;\n\r]+/).map(email => email.trim().toLowerCase()).filter(Boolean))]
  if (!emails.length) throw new Error('Enter at least one Oberlin email address.')
  if (emails.length > 25) throw new Error('Add up to 25 email addresses at a time.')
  const invalid = emails.filter(email => !isOberlinEmail(email))
  if (invalid.length) throw new Error(`Use complete @oberlin.edu addresses: ${invalid.join(', ')}`)
  return emails
}

export function memberStatusLabel(row: { status: MembershipStatus; preapprovedAt?: string | null }) {
  if (row.status === 'ACTIVE') return 'Active member'
  if (row.status === 'APPROVED') return 'Awaiting account setup'
  if (row.status === 'REJECTED') return 'Not approved'
  if (row.status === 'SUSPENDED') return 'Suspended'
  if (row.status === 'PENDING_APPROVAL') return 'Needs approval'
  return row.preapprovedAt ? 'Awaiting email verification' : 'Needs approval'
}

export function membershipErrorMessage(code: string) {
  if (code.startsWith('MEMBERSHIP_REQUEST_BLOCKED')) return 'This account is rejected or suspended. Its access has not changed.'
  if (code.includes('EMAIL_CONFIG_MISSING')) return 'Email is not configured. The record is saved; contact the site administrator before retrying.'
  if (code.includes('EMAIL_SEND_FAILED') || code.includes('MEMBER_AUTH_LINK_FAILED')) return 'The record is saved, but the email could not be sent. Try Resend email.'
  if (code.includes('OBERLIN_EMAIL_REQUIRED')) return 'Use an @oberlin.edu address.'
  return 'Could not complete this action. Refresh the list and try again.'
}
