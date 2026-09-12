import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isOberlinEmail, normalizeMembershipDecision, type MembershipStatus } from './memberLifecycle'
import { assertMemberRecoveryEligible } from './passwordRecovery'
import { buildServerAuthLink, normalizeEmailOtpType, type OecEmailOtpType } from './serverAuthLinks'
import { memberEmailOrigin } from './memberEmailOrigin'
import { parseMemberEmails } from '@/lib/members/invitations'
import { sendTransactionalEmail } from '@/lib/email/client'
import { consumeSubmissionRateLimit, hashNetworkAddress } from '@/lib/submissions/rateLimit'
import { memberMagicLinkEmail,memberPasswordResetEmail,membershipApprovedEmail,membershipRejectedEmail,membershipVerificationEmail,membershipInvitationEmail } from '@/lib/email/templates'

export type MembershipRequestSummary = {
  id: string
  email: string
  displayName: string
  status: MembershipStatus
  emailVerifiedAt: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
  preapprovedAt: string | null
  lastEmailSentAt: string | null
  lastEmailError: string | null
}

async function generateMemberLink(email: string, origin: string, next: string, type: Exclude<OecEmailOtpType, 'signup'>) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.generateLink({ type, email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) throw new Error(`MEMBER_AUTH_LINK_FAILED:${error?.message ?? 'unknown'}`)
  // Supabase converts a magic link into a signup link for a new auth identity.
  const verificationType = normalizeEmailOtpType(data.properties.verification_type ?? type)
  return buildServerAuthLink({ origin: memberEmailOrigin(origin), tokenHash, type: verificationType, next })
}

export async function submitMembershipRequest(input: { email: string; displayName: string }, origin: string) {
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : ''
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim() : ''
  if (!isOberlinEmail(email)) throw new Error('OBERLIN_EMAIL_REQUIRED')
  if (displayName.length < 2) throw new Error('DISPLAY_NAME_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data: existing, error: loadError } = await supabase.from('membership_requests').select('id,status,last_email_sent_at').ilike('email', email).maybeSingle()
  if (loadError) throw new Error('MEMBERSHIP_REQUEST_LOAD_FAILED')
  if (existing && ['REJECTED', 'SUSPENDED'].includes(existing.status)) throw new Error('MEMBERSHIP_REQUEST_BLOCKED')
  if (existing && ['PENDING_APPROVAL', 'ACTIVE'].includes(existing.status)) {
    return { status: existing.status as MembershipStatus, emailSent: false }
  }
  // A retry must not invalidate the link someone has just opened in their inbox.
  if (existing?.last_email_sent_at && Date.now() - Date.parse(existing.last_email_sent_at) < 60_000) {
    return { status: existing.status as MembershipStatus, emailSent: false, retryAfter: 60 }
  }
  // Students at the meeting share campus Wi-Fi, so scope this limit to the address.
  if (!await consumeSubmissionRateLimit(hashNetworkAddress(`member-email:${email}`), 8)) throw new Error('MEMBERSHIP_EMAIL_RATE_LIMITED')
  let row = existing
  if (!row) {
    const { data, error } = await supabase.from('membership_requests').insert({ email, display_name: displayName, status: 'REQUESTED' }).select('id,status,last_email_sent_at').single()
    if (error || !data) throw new Error('MEMBERSHIP_REQUEST_CREATE_FAILED')
    row = data
  }
  // Keep the original request and approval. Delivery can be retried independently.
  const result = await sendMembershipSetupEmail(row.id, origin)
  if (!result.emailSent) throw new Error('MEMBERSHIP_EMAIL_FAILED')
  return { status: row.status as MembershipStatus, emailSent: true }
}

export async function startMembershipFromSubmission(input: { email: string; displayName: string }, origin: string, reviewerId: string) {
  const email = input.email.trim().toLowerCase()
  if (!isOberlinEmail(email)) throw new Error('OBERLIN_EMAIL_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('prepare_member_invitation', {
    p_email: email, p_display_name: input.displayName.trim() || email, p_reviewer_id: reviewerId,
  })
  if (error) throw new Error(error.message)
  const result = data as { request_id: string; status: MembershipStatus }
  if (result.status === 'ACTIVE') return { requestId: result.request_id, status: result.status, emailSent: false, skipped: true }
  return { requestId: result.request_id, status: result.status, ...await sendMembershipSetupEmail(result.request_id, origin), skipped: false }
}

// Email failure must not disguise a successful database approval. Persist its outcome
// separately so the officer can resend without repeating or undoing the decision.
export async function sendMembershipSetupEmail(requestId: string, origin: string) {
  const supabase = createSupabaseAdminClient()
  const { data: row, error } = await supabase.from('membership_requests').select('id,email,display_name,status,preapproved_at').eq('id', requestId).single()
  if (error || !row) throw new Error('MEMBERSHIP_REQUEST_NOT_FOUND')
  if (['REJECTED', 'SUSPENDED'].includes(row.status)) throw new Error('MEMBERSHIP_REQUEST_BLOCKED')
  let emailError: string | null = null
  try {
    const next = row.status === 'ACTIVE' ? '/member' : row.status === 'APPROVED' ? '/member-activate' : `/member-verify?request=${encodeURIComponent(row.id)}`
    const url = await generateMemberLink(row.email, origin, next, 'magiclink')
    const message = row.status === 'ACTIVE' ? memberMagicLinkEmail({ displayName: row.display_name, magicUrl: url })
      : row.status === 'APPROVED' ? membershipApprovedEmail({ displayName: row.display_name, activationUrl: url })
      : row.preapproved_at ? membershipInvitationEmail({ displayName: row.display_name, verificationUrl: url })
      : membershipVerificationEmail({ displayName: row.display_name, verificationUrl: url })
    await sendTransactionalEmail({ to: row.email, message })
  } catch (cause) {
    // Store only an error code, never auth links, provider responses, or credentials.
    emailError = cause instanceof Error ? cause.message.split(':')[0] : 'EMAIL_SEND_FAILED'
  }
  const { error: saveError } = await supabase.from('membership_requests').update({ last_email_error: emailError, ...(!emailError ? { last_email_sent_at: new Date().toISOString() } : {}) }).eq('id', row.id)
  return { emailSent: !emailError, emailError, trackingSaved: !saveError }
}

export async function inviteMembers(emailInput: string, reviewerId: string, origin: string) {
  const emails = parseMemberEmails(emailInput)
  const results: { email: string; outcome: 'sent' | 'failed' | 'already_active'; error?: string }[] = []
  for (const email of emails) {
    try {
      const result = await startMembershipFromSubmission({ email, displayName: email }, origin, reviewerId)
      results.push({ email, outcome: result.skipped ? 'already_active' : result.emailSent ? 'sent' : 'failed' })
    } catch (cause) {
      results.push({ email, outcome: 'failed', error: cause instanceof Error ? cause.message.split(':')[0] : 'INVITATION_FAILED' })
    }
    // Respect the mail provider's per-account rate limit for pasted batches.
    if (email !== emails.at(-1)) await new Promise(resolve => setTimeout(resolve, 550))
  }
  return results
}

export async function verifyServerMembershipRequest(requestId: string, currentUser: { id: string; email: string }) {
  if (!isOberlinEmail(currentUser.email)) throw new Error('OBERLIN_EMAIL_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('verify_membership_request', { p_request_id: requestId, p_user_id: currentUser.id })
  if (error) throw new Error(error.message)
  return data as { request_id: string; status: 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' }
}

export async function listMembershipRequests(status: MembershipStatus | 'ALL' = 'PENDING_APPROVAL'): Promise<MembershipRequestSummary[]> {
  const supabase = createSupabaseAdminClient()
  let query = supabase.from('membership_requests').select('id,email,display_name,status,email_verified_at,reviewed_at,review_note,created_at,preapproved_at,last_email_sent_at,last_email_error').order('created_at', { ascending: false })
  if (status !== 'ALL') query = query.eq('status', status)
  const { data, error } = await query.limit(200)
  if (error) throw new Error(`MEMBERSHIP_REQUESTS_LOAD_FAILED:${error.message}`)
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status as MembershipStatus,
    emailVerifiedAt: row.email_verified_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    preapprovedAt: row.preapproved_at,
    lastEmailSentAt: row.last_email_sent_at,
    lastEmailError: row.last_email_error,
  }))
}

export async function reviewMembershipRequest(
  input: { requestId: string; decision: string; note?: string },
  reviewerId: string,
  origin: string,
) {
  const decision = normalizeMembershipDecision(input.decision)
  const supabase = createSupabaseAdminClient()
  if (decision === 'REJECT') {
    const { data, error } = await supabase.rpc('reject_membership_request', { p_request_id: input.requestId, p_reviewer_id: reviewerId, p_review_note: input.note?.trim() || null })
    if (error) throw new Error(error.message)
    const result = data as { email: string; display_name: string; status: 'REJECTED' }
    let emailSent = false
    try { emailSent = await sendTransactionalEmail({to:result.email,message:membershipRejectedEmail({displayName:result.display_name,reviewNote:input.note})}) } catch { /* The decision remains saved even if email is unavailable. */ }
    return { ...result, emailSent }
  }

  const { data: row, error: loadError } = await supabase.from('membership_requests').select('email,display_name,status').eq('id', input.requestId).single()
  if (loadError || !row) throw new Error('MEMBERSHIP_REQUEST_NOT_FOUND')
  if (row.status === 'PENDING_APPROVAL') {
    const { error } = await supabase.rpc('approve_membership_request', { p_request_id: input.requestId, p_reviewer_id: reviewerId, p_review_note: input.note?.trim() || null })
    if (error) throw new Error(error.message)
    return { status: 'APPROVED', ...await sendMembershipSetupEmail(input.requestId, origin) }
  }
  return startMembershipFromSubmission({ email: row.email, displayName: row.display_name }, origin, reviewerId)
}

export async function activateServerMember(currentUser: { id: string; email: string }) {
  if (!isOberlinEmail(currentUser.email)) throw new Error('OBERLIN_EMAIL_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data: profile, error: loadError } = await supabase.from('member_profiles').select('oberlin_email,status').eq('user_id', currentUser.id).maybeSingle()
  if (loadError || !profile) throw new Error('MEMBER_PROFILE_NOT_FOUND')
  if (profile.oberlin_email.toLowerCase() !== currentUser.email.toLowerCase()) throw new Error('MEMBERSHIP_IDENTITY_MISMATCH')
  const { data, error } = await supabase.rpc('activate_member', { p_user_id: currentUser.id })
  if (error) throw new Error(error.message)
  return data as { user_id: string; status: 'ACTIVE' }
}

export async function sendActiveMemberMagicLink(emailInput: string, origin: string) {
  const email = emailInput.trim().toLowerCase()
  if (!isOberlinEmail(email)) throw new Error('ACTIVE_MEMBER_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data: profile, error } = await supabase.from('member_profiles').select('display_name,status').ilike('oberlin_email', email).maybeSingle()
  if (error || !profile || profile.status !== 'ACTIVE') throw new Error('ACTIVE_MEMBER_REQUIRED')
  const magicUrl = await generateMemberLink(email, origin, '/member', 'magiclink')
  await sendTransactionalEmail({to:email,message:memberMagicLinkEmail({displayName:profile.display_name,magicUrl})})
}


export async function sendActiveMemberPasswordReset(emailInput: string, origin: string) {
  const email = emailInput.trim().toLowerCase()
  const supabase = createSupabaseAdminClient()
  const { data: profile, error } = await supabase
    .from('member_profiles')
    .select('oberlin_email,display_name,status')
    .ilike('oberlin_email', email)
    .maybeSingle()
  if (error || !profile) throw new Error('ACTIVE_MEMBER_REQUIRED')
  assertMemberRecoveryEligible({ requestedEmail: email, profileEmail: profile.oberlin_email, status: profile.status as MembershipStatus })
  const resetUrl = await generateMemberLink(email, origin, '/member-reset-password', 'recovery')
  await sendTransactionalEmail({ to: email, message: memberPasswordResetEmail({ displayName: profile.display_name, resetUrl }) })
}
