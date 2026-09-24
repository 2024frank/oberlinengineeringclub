// Plain-language messages for staff access errors. Server routes return codes such as
// `STAFF_AUTH_LINK_FAILED:<provider detail>`; only the code before the colon is shown.

export type StaffAccessAction = 'invite' | 'resend' | 'revoke' | 'update'

const deliveryCodes = new Set(['STAFF_AUTH_LINK_FAILED', 'EMAIL_SEND_FAILED'])

const sharedMessages: Record<string, string> = {
  FORBIDDEN: 'Only a Super Admin can manage officer access.',
  INVALID_EMAIL: 'Enter a complete email address.',
  DISPLAY_NAME_REQUIRED: 'Enter the officer’s name.',
  INVITE_ROLE_NOT_ALLOWED: 'Invitations can give Admin or Editor access. To make someone a Super Admin, invite them first, then change their role from Manage.',
  STAFF_ALREADY_ACTIVE: 'This person is already an active officer. Use Manage to change their access.',
  STAFF_INVITE_ALREADY_PENDING: 'This person already has an open invitation. Use Resend on that invitation instead.',
  STAFF_INVITE_NOT_FOUND: 'This invitation no longer exists. Refresh the page.',
  STAFF_INVITE_USED: 'This invitation has already been accepted.',
  STAFF_INVITE_REVOKED: 'This invitation was revoked. Send a new invitation instead.',
  STAFF_INVITE_NOT_REVOCABLE: 'This invitation was already accepted or revoked. Refresh the page.',
  STAFF_INVITE_CHANGED: 'This invitation changed while you were working. Refresh the page and try again.',
  FINAL_SUPER_ADMIN_REQUIRED: 'The site needs at least one active Super Admin. Make someone else a Super Admin first.',
  ADMIN_USER_NOT_FOUND: 'This officer account could not be found. Refresh the page.',
  INVALID_ROLE: 'Choose Super Admin, Admin, or Editor.',
}

export function staffErrorCode(value: unknown) {
  return typeof value === 'string' ? value.split(':')[0] : ''
}

export function staffAccessErrorMessage(value: unknown, action: StaffAccessAction) {
  const code = staffErrorCode(value)
  if (code === 'EMAIL_CONFIG_MISSING') return 'Email sending is not set up on this site, so no invitation was sent. Contact the site administrator.'
  if (deliveryCodes.has(code)) {
    return action === 'resend'
      ? 'The invitation email could not be sent, so the invitation was left as it was. Try again in a few minutes.'
      : 'The invitation email could not be sent, so no invitation was saved. Try again in a few minutes.'
  }
  return sharedMessages[code] ?? 'Could not complete this action. Refresh the page and try again.'
}

// Shown to the invited officer on the activation page.
const activationMessages: Record<string, string> = {
  AUTHENTICATED_INVITE_SESSION_REQUIRED: 'Your sign-in from the invitation link has expired. Open the link in the invitation email again.',
  STAFF_INVITE_NOT_FOUND: 'This invitation link is no longer valid. If you received a newer invitation email, use the link in that one.',
  STAFF_INVITE_EXPIRED: 'This invitation has expired. Ask the Super Admin to resend it.',
  STAFF_INVITE_USED: 'This invitation has already been used. Sign in to the officer portal instead.',
  STAFF_INVITE_REVOKED: 'This invitation was cancelled. Contact the Super Admin if you think this is a mistake.',
  STAFF_INVITE_IDENTITY_MISMATCH: 'You are signed in with a different email than the one that was invited. Open the link in the invitation email again.',
  STAFF_ALREADY_ACTIVE: 'You already have officer access. Sign in to the officer portal.',
}

export function staffActivationErrorMessage(value: unknown) {
  return activationMessages[staffErrorCode(value)] ?? 'Officer activation failed. Try again, or ask the Super Admin to resend the invitation.'
}
