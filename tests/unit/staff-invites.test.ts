import { describe, expect, it, vi } from 'vitest'
import {
  acceptStaffInvite,
  assertStaffInviteTransition,
  createStaffInvite,
  effectiveStaffInviteStatus,
  hashStaffInviteToken,
  normalizeStaffInviteRole,
  resendStaffInvite,
  type StaffInviteRecord,
} from '@/lib/auth/staffInvites'
import { staffAccessErrorMessage, staffActivationErrorMessage } from '@/lib/auth/staffInviteMessages'

const now = new Date('2026-08-17T06:00:00.000Z')
const invite = (overrides: Partial<StaffInviteRecord> = {}): StaffInviteRecord => ({
  id: 'invite-1', email: 'officer@oberlin.edu', displayName: 'Officer', role: 'EDITOR', scopes: [], canPublish: false,
  tokenHash: hashStaffInviteToken('old-token'), status: 'INVITED', expiresAt: '2026-08-18T06:00:00.000Z', invitedBy: 'super-1', createdAt: '2026-08-16T06:00:00.000Z',
  ...overrides,
})
const createInput = { email: 'officer@oberlin.edu', displayName: 'Officer', role: 'EDITOR', scopes: ['projects'], canPublish: false, origin: 'https://engineering.example' }

function createDeps(overrides: Partial<Parameters<typeof createStaffInvite>[2]> = {}) {
  return {
    randomToken: () => 'raw-secret-token',
    insertInvite: vi.fn(async () => 'invite-1'),
    discardInvite: vi.fn(async () => undefined),
    generateAuthInviteLink: vi.fn(async (_email: string, next: string) => `https://engineering.example/auth/email-action?next=${encodeURIComponent(next)}`),
    sendInviteEmail: vi.fn(async () => undefined),
    audit: vi.fn(async () => undefined),
    ...overrides,
  }
}

function resendDeps(current: StaffInviteRecord | null, overrides: Partial<Parameters<typeof resendStaffInvite>[2]> = {}) {
  return {
    randomToken: () => 'new-token',
    getInvite: vi.fn(async () => current),
    reissueInvite: vi.fn(async () => undefined),
    generateAuthInviteLink: vi.fn(async (_email: string, next: string) => `https://engineering.example/auth/email-action?next=${encodeURIComponent(next)}`),
    sendInviteEmail: vi.fn(async () => undefined),
    audit: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('staff invitation lifecycle', () => {
  it('allows only ADMIN and EDITOR to be directly invited', () => {
    expect(normalizeStaffInviteRole('ADMIN')).toBe('ADMIN')
    expect(normalizeStaffInviteRole('EDITOR')).toBe('EDITOR')
    expect(() => normalizeStaffInviteRole('SUPER_ADMIN')).toThrow('INVITE_ROLE_NOT_ALLOWED')
  })

  it('rejects expired and revoked invitations', () => {
    expect(() => assertStaffInviteTransition({ status: 'REVOKED', expiresAt: '2099-01-01T00:00:00.000Z' })).toThrow('STAFF_INVITE_REVOKED')
    expect(() => assertStaffInviteTransition({ status: 'INVITED', expiresAt: '2000-01-01T00:00:00.000Z' }, now)).toThrow('STAFF_INVITE_EXPIRED')
  })

  it('treats an open invitation at or past its expiry as expired', () => {
    expect(effectiveStaffInviteStatus({ status: 'INVITED', expiresAt: now.toISOString() }, now)).toBe('EXPIRED')
    expect(effectiveStaffInviteStatus({ status: 'INVITED', expiresAt: '2026-08-17T06:00:01.000Z' }, now)).toBe('INVITED')
    expect(effectiveStaffInviteStatus({ status: 'ACCEPTED', expiresAt: '2000-01-01T00:00:00.000Z' }, now)).toBe('ACCEPTED')
  })

  it('stores only the token digest and sends the raw token only through the activation URL', async () => {
    let inserted: StaffInviteRecord | undefined
    let sentUrl = ''
    const deps = createDeps({
      insertInvite: vi.fn(async (row) => { inserted = { ...row, id: 'invite-1' }; return 'invite-1' }),
      sendInviteEmail: vi.fn(async ({ activationUrl }) => { sentUrl = activationUrl }),
    })
    const result = await createStaffInvite(createInput, 'super-1', deps, now)

    expect(result.id).toBe('invite-1')
    expect(inserted?.tokenHash).toBe(hashStaffInviteToken('raw-secret-token'))
    expect(JSON.stringify(inserted)).not.toContain('raw-secret-token')
    expect(sentUrl).toContain(encodeURIComponent('/staff-activate?invite=raw-secret-token'))
    expect(deps.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'STAFF_INVITED', entityId: 'invite-1' }))
    expect(deps.discardInvite).not.toHaveBeenCalled()
  })

  it('discards the invitation when the sign-in link cannot be created, so a retry is not blocked', async () => {
    const deps = createDeps({ generateAuthInviteLink: vi.fn(async () => { throw new Error('STAFF_AUTH_LINK_FAILED:rate limited') }) })
    await expect(createStaffInvite(createInput, 'super-1', deps, now)).rejects.toThrow('STAFF_AUTH_LINK_FAILED')
    expect(deps.discardInvite).toHaveBeenCalledWith('invite-1')
    expect(deps.sendInviteEmail).not.toHaveBeenCalled()
    expect(deps.audit).not.toHaveBeenCalled()
  })

  it('discards the invitation when the email cannot be sent', async () => {
    const deps = createDeps({ sendInviteEmail: vi.fn(async () => { throw new Error('EMAIL_SEND_FAILED:500') }) })
    await expect(createStaffInvite(createInput, 'super-1', deps, now)).rejects.toThrow('EMAIL_SEND_FAILED')
    expect(deps.discardInvite).toHaveBeenCalledWith('invite-1')
    expect(deps.audit).not.toHaveBeenCalled()
  })

  it('reports the delivery failure even when the cleanup also fails', async () => {
    const deps = createDeps({
      sendInviteEmail: vi.fn(async () => { throw new Error('EMAIL_SEND_FAILED:500') }),
      discardInvite: vi.fn(async () => { throw new Error('STAFF_INVITE_DISCARD_FAILED:offline') }),
    })
    await expect(createStaffInvite(createInput, 'super-1', deps, now)).rejects.toThrow('EMAIL_SEND_FAILED')
  })

  it('resends an expired invitation with a new token and a fresh 72-hour window', async () => {
    const expired = invite({ status: 'EXPIRED', expiresAt: '2026-08-10T06:00:00.000Z' })
    const deps = resendDeps(expired)
    const result = await resendStaffInvite('invite-1', 'super-1', deps, now)

    expect(result).toEqual({ id: 'invite-1', expiresAt: '2026-08-20T06:00:00.000Z' })
    expect(deps.reissueInvite).toHaveBeenCalledOnce()
    expect(deps.reissueInvite).toHaveBeenCalledWith({ id: 'invite-1', expectedTokenHash: expired.tokenHash, tokenHash: hashStaffInviteToken('new-token'), expiresAt: '2026-08-20T06:00:00.000Z', status: 'INVITED' })
    expect(deps.generateAuthInviteLink).toHaveBeenCalledWith('officer@oberlin.edu', '/staff-activate?invite=new-token')
    expect(deps.sendInviteEmail).toHaveBeenCalledWith(expect.objectContaining({ email: 'officer@oberlin.edu', expiresAt: '2026-08-20T06:00:00.000Z' }))
    expect(deps.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'STAFF_INVITE_RESENT', entityId: 'invite-1' }))
  })

  it('restores the previous link when a resend cannot be delivered', async () => {
    const open = invite()
    const deps = resendDeps(open, { sendInviteEmail: vi.fn(async () => { throw new Error('EMAIL_SEND_FAILED:500') }) })
    await expect(resendStaffInvite('invite-1', 'super-1', deps, now)).rejects.toThrow('EMAIL_SEND_FAILED')
    expect(deps.reissueInvite).toHaveBeenLastCalledWith({ id: 'invite-1', expectedTokenHash: hashStaffInviteToken('new-token'), tokenHash: open.tokenHash, expiresAt: open.expiresAt, status: 'INVITED' })
    expect(deps.audit).not.toHaveBeenCalled()
  })

  it.each([
    ['ACCEPTED', 'STAFF_INVITE_USED'],
    ['REVOKED', 'STAFF_INVITE_REVOKED'],
  ] as const)('does not resend a %s invitation', async (status, code) => {
    const deps = resendDeps(invite({ status }))
    await expect(resendStaffInvite('invite-1', 'super-1', deps, now)).rejects.toThrow(code)
    expect(deps.reissueInvite).not.toHaveBeenCalled()
    expect(deps.sendInviteEmail).not.toHaveBeenCalled()
  })

  it('reports a missing invitation on resend', async () => {
    await expect(resendStaffInvite('missing', 'super-1', resendDeps(null), now)).rejects.toThrow('STAFF_INVITE_NOT_FOUND')
  })

  it('requires the authenticated email to match the invitation', async () => {
    const token = 'raw-secret-token'
    await expect(acceptStaffInvite(
      { token, currentUser: { id: 'user-1', email: 'wrong@oberlin.edu' } },
      {
        getInviteByHash: async () => invite({ tokenHash: hashStaffInviteToken(token), expiresAt: '2099-01-01T00:00:00.000Z' }),
        activateInvite: async () => undefined,
        expireInvite: async () => undefined,
      },
    )).rejects.toThrow('STAFF_INVITE_IDENTITY_MISMATCH')
  })

  it('records the expiry when someone opens an invitation that ran out', async () => {
    const expireInvite = vi.fn(async () => undefined)
    const activateInvite = vi.fn(async () => undefined)
    await expect(acceptStaffInvite(
      { token: 'old-token', currentUser: { id: 'user-1', email: 'officer@oberlin.edu' } },
      { getInviteByHash: async () => invite({ expiresAt: '2026-08-17T05:00:00.000Z' }), activateInvite, expireInvite },
      now,
    )).rejects.toThrow('STAFF_INVITE_EXPIRED')
    expect(expireInvite).toHaveBeenCalledWith('invite-1')
    expect(activateInvite).not.toHaveBeenCalled()
  })

  it('still reports expiry if recording it fails, and skips already-recorded expiries', async () => {
    const failing = vi.fn(async () => { throw new Error('STAFF_INVITE_EXPIRE_FAILED:offline') })
    await expect(acceptStaffInvite(
      { token: 'old-token', currentUser: { id: 'user-1', email: 'officer@oberlin.edu' } },
      { getInviteByHash: async () => invite({ expiresAt: '2026-08-17T05:00:00.000Z' }), activateInvite: async () => undefined, expireInvite: failing },
      now,
    )).rejects.toThrow('STAFF_INVITE_EXPIRED')

    const expireInvite = vi.fn(async () => undefined)
    await expect(acceptStaffInvite(
      { token: 'old-token', currentUser: { id: 'user-1', email: 'officer@oberlin.edu' } },
      { getInviteByHash: async () => invite({ status: 'EXPIRED' }), activateInvite: async () => undefined, expireInvite },
      now,
    )).rejects.toThrow('STAFF_INVITE_EXPIRED')
    expect(expireInvite).not.toHaveBeenCalled()
  })
})

describe('staff access messages', () => {
  it('never shows raw error codes or provider detail to officers', () => {
    const codes = ['STAFF_AUTH_LINK_FAILED:A user with this email address has already been registered', 'EMAIL_SEND_FAILED:500', 'EMAIL_CONFIG_MISSING', 'STAFF_INVITE_ALREADY_PENDING', 'STAFF_ALREADY_ACTIVE', 'STAFF_INVITE_CREATE_FAILED:boom', 'FINAL_SUPER_ADMIN_REQUIRED', undefined, '']
    for (const code of codes) {
      for (const action of ['invite', 'resend', 'revoke', 'update'] as const) {
        const message = staffAccessErrorMessage(code, action)
        expect(message).not.toMatch(/[A-Z]{2,}_[A-Z_]+|registered|500|boom/)
        expect(message.length).toBeGreaterThan(10)
      }
      expect(staffActivationErrorMessage(code)).not.toMatch(/[A-Z]{2,}_[A-Z_]+/)
    }
  })

  it('tells the Super Admin whether a failed delivery left anything behind', () => {
    expect(staffAccessErrorMessage('STAFF_AUTH_LINK_FAILED:rate limited', 'invite')).toContain('no invitation was saved')
    expect(staffAccessErrorMessage('EMAIL_SEND_FAILED:500', 'resend')).toContain('left as it was')
    expect(staffAccessErrorMessage('STAFF_INVITE_ALREADY_PENDING', 'invite')).toContain('Resend')
    expect(staffActivationErrorMessage('STAFF_INVITE_EXPIRED')).toContain('resend')
  })
})
