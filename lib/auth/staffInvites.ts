import { createHash, randomBytes } from 'node:crypto'

export type StaffInviteRole = 'ADMIN' | 'EDITOR'
export type StaffInviteStatus = 'INVITED' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'

export type StaffInviteRecord = {
  id: string
  email: string
  displayName: string
  role: StaffInviteRole
  scopes: string[]
  canPublish: boolean
  tokenHash: string
  status: StaffInviteStatus
  expiresAt: string
  invitedBy: string
  createdAt: string
}

type NewStaffInvite = Omit<StaffInviteRecord, 'id'>

type InviteDeliveryDeps = {
  randomToken?: () => string
  generateAuthInviteLink: (email: string, nextPath: string) => Promise<string>
  sendInviteEmail: (input: { email: string; displayName: string; activationUrl: string; expiresAt: string }) => Promise<void>
  audit: (input: { actorId: string; action: string; entityType: string; entityId: string; afterSnapshot: unknown }) => Promise<void>
}

type CreateStaffInviteDeps = InviteDeliveryDeps & {
  insertInvite: (row: NewStaffInvite) => Promise<string>
  discardInvite: (id: string) => Promise<void>
}

type ResendStaffInviteDeps = InviteDeliveryDeps & {
  getInvite: (id: string) => Promise<StaffInviteRecord | null>
  // Replaces the token only while it still equals expectedTokenHash.
  reissueInvite: (input: { id: string; expectedTokenHash: string; tokenHash: string; expiresAt: string; status: StaffInviteStatus }) => Promise<void>
}

type AcceptStaffInviteDeps = {
  getInviteByHash: (tokenHash: string) => Promise<StaffInviteRecord | null>
  activateInvite: (input: { invite: StaffInviteRecord; userId: string }) => Promise<void>
  expireInvite: (id: string) => Promise<void>
}

const inviteLifetimeMs = 72 * 60 * 60 * 1000

export function normalizeStaffInviteRole(value: string): StaffInviteRole {
  if (value !== 'ADMIN' && value !== 'EDITOR') throw new Error('INVITE_ROLE_NOT_ALLOWED')
  return value
}

export function assertStaffInviteTransition(
  invite: Pick<StaffInviteRecord, 'status' | 'expiresAt'>,
  now = new Date(),
) {
  if (invite.status === 'REVOKED') throw new Error('STAFF_INVITE_REVOKED')
  if (invite.status === 'ACCEPTED') throw new Error('STAFF_INVITE_USED')
  if (invite.status === 'EXPIRED' || new Date(invite.expiresAt).getTime() <= now.getTime()) {
    throw new Error('STAFF_INVITE_EXPIRED')
  }
  if (invite.status !== 'INVITED') throw new Error('STAFF_INVITE_INVALID_STATE')
}

// An INVITED row past its expiry is expired even before the database records it.
export function effectiveStaffInviteStatus(invite: Pick<StaffInviteRecord, 'status' | 'expiresAt'>, now = new Date()): StaffInviteStatus {
  if (invite.status === 'INVITED' && new Date(invite.expiresAt).getTime() <= now.getTime()) return 'EXPIRED'
  return invite.status
}

export function hashStaffInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function issueToken(deps: Pick<InviteDeliveryDeps, 'randomToken'>, now: Date) {
  const token = (deps.randomToken ?? (() => randomBytes(32).toString('base64url')))()
  return {
    token,
    tokenHash: hashStaffInviteToken(token),
    expiresAt: new Date(now.getTime() + inviteLifetimeMs).toISOString(),
    nextPath: `/staff-activate?invite=${encodeURIComponent(token)}`,
  }
}

export async function createStaffInvite(
  input: { email: string; displayName: string; role: string; scopes?: string[]; canPublish?: boolean; origin: string },
  actorId: string,
  deps: CreateStaffInviteDeps,
  now = new Date(),
) {
  const email = input.email.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('INVALID_EMAIL')
  const displayName = input.displayName.trim()
  if (!displayName) throw new Error('DISPLAY_NAME_REQUIRED')
  const role = normalizeStaffInviteRole(input.role)
  const { tokenHash, expiresAt, nextPath } = issueToken(deps, now)
  const record: NewStaffInvite = {
    email,
    displayName,
    role,
    scopes: role === 'EDITOR' ? [...new Set(input.scopes ?? [])] : [],
    canPublish: role === 'EDITOR' && Boolean(input.canPublish),
    tokenHash,
    status: 'INVITED',
    expiresAt,
    invitedBy: actorId,
    createdAt: now.toISOString(),
  }
  const id = await deps.insertInvite(record)
  try {
    const activationUrl = await deps.generateAuthInviteLink(email, nextPath)
    await deps.sendInviteEmail({ email, displayName, activationUrl, expiresAt })
  } catch (cause) {
    // Nobody received a working link, so this row must not block the next attempt.
    // If the cleanup also fails, the row stays listed and can be resent or revoked.
    await deps.discardInvite(id).catch(() => undefined)
    throw cause
  }
  await deps.audit({ actorId, action: 'STAFF_INVITED', entityType: 'staff_invite', entityId: id, afterSnapshot: { email, displayName, role, scopes: record.scopes, canPublish: record.canPublish, expiresAt } })
  return { id, expiresAt }
}

// Issues a fresh link for an open or expired invitation. Only the token digest is
// stored, so a resend always replaces the token and the earlier link stops working.
export async function resendStaffInvite(
  inviteId: string,
  actorId: string,
  deps: ResendStaffInviteDeps,
  now = new Date(),
) {
  const invite = await deps.getInvite(inviteId)
  if (!invite) throw new Error('STAFF_INVITE_NOT_FOUND')
  if (invite.status === 'ACCEPTED') throw new Error('STAFF_INVITE_USED')
  if (invite.status === 'REVOKED') throw new Error('STAFF_INVITE_REVOKED')
  const { tokenHash, expiresAt, nextPath } = issueToken(deps, now)
  await deps.reissueInvite({ id: invite.id, expectedTokenHash: invite.tokenHash, tokenHash, expiresAt, status: 'INVITED' })
  try {
    const activationUrl = await deps.generateAuthInviteLink(invite.email, nextPath)
    await deps.sendInviteEmail({ email: invite.email, displayName: invite.displayName, activationUrl, expiresAt })
  } catch (cause) {
    // Keep the previous link working when the new one was never delivered.
    await deps.reissueInvite({ id: invite.id, expectedTokenHash: tokenHash, tokenHash: invite.tokenHash, expiresAt: invite.expiresAt, status: invite.status }).catch(() => undefined)
    throw cause
  }
  await deps.audit({ actorId, action: 'STAFF_INVITE_RESENT', entityType: 'staff_invite', entityId: invite.id, afterSnapshot: { email: invite.email, expiresAt } })
  return { id: invite.id, expiresAt }
}

export async function acceptStaffInvite(
  input: { token: string; currentUser: { id: string; email: string } },
  deps: AcceptStaffInviteDeps,
  now = new Date(),
) {
  const tokenHash = hashStaffInviteToken(input.token)
  const invite = await deps.getInviteByHash(tokenHash)
  if (!invite) throw new Error('STAFF_INVITE_NOT_FOUND')
  try {
    assertStaffInviteTransition(invite, now)
  } catch (cause) {
    // Record the expiry so the invitation stops appearing as pending. The officer
    // still needs to hear that the invitation expired if recording it fails.
    if (effectiveStaffInviteStatus(invite, now) === 'EXPIRED' && invite.status === 'INVITED') await deps.expireInvite(invite.id).catch(() => undefined)
    throw cause
  }
  if (input.currentUser.email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
    throw new Error('STAFF_INVITE_IDENTITY_MISMATCH')
  }
  await deps.activateInvite({ invite, userId: input.currentUser.id })
  return { inviteId: invite.id, role: invite.role }
}
