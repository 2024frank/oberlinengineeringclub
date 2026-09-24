import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  acceptStaffInvite,
  createStaffInvite,
  effectiveStaffInviteStatus,
  hashStaffInviteToken,
  resendStaffInvite,
  type StaffInviteRecord,
  type StaffInviteRole,
} from './staffInvites'
import { sendTransactionalEmail } from '@/lib/email/client'
import { staffInvitationEmail } from '@/lib/email/templates'
import { buildServerAuthLink, normalizeEmailOtpType } from './serverAuthLinks'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

const allowedScopes = ['pages','projects','project_updates','events','opportunities','news_posts','leaders','resources','documents','sponsors','partner_schools','media']
const inviteColumns = 'id,email,display_name,role,scopes,can_publish,token_hash,status,expires_at,invited_by,created_at'

function sanitizeScopes(scopes: string[]) {
  return [...new Set(scopes.filter((scope) => allowedScopes.includes(scope)))]
}

function mapInvite(row: Record<string, unknown>): StaffInviteRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
    role: row.role as StaffInviteRole,
    scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : [],
    canPublish: Boolean(row.can_publish),
    tokenHash: String(row.token_hash),
    status: row.status as StaffInviteRecord['status'],
    expiresAt: String(row.expires_at),
    invitedBy: String(row.invited_by),
    createdAt: String(row.created_at),
  }
}

function inviteWriteError(error: { code?: string; message?: string }, fallback: string) {
  if (error.code === '23505') return new Error('STAFF_INVITE_ALREADY_PENDING')
  if (error.message?.includes('STAFF_ALREADY_ACTIVE')) return new Error('STAFF_ALREADY_ACTIVE')
  return new Error(`${fallback}:${error.message ?? 'unknown'}`)
}

// Members and officers share one Supabase identity, and Supabase refuses invite links
// for an email that is already registered. A magic link signs in an existing account;
// for a new email Supabase converts it into a signup link, reported in verification_type.
async function generateStaffActivationLink(supabase: AdminClient, email: string, nextPath: string, origin: string) {
  const { data, error } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) throw new Error(`STAFF_AUTH_LINK_FAILED:${error?.message ?? 'unknown'}`)
  const type = normalizeEmailOtpType(data.properties.verification_type ?? 'magiclink')
  return buildServerAuthLink({ origin, tokenHash, type, next: nextPath })
}

async function sendStaffInviteEmail(input: { email: string; displayName: string; activationUrl: string; expiresAt: string }) {await sendTransactionalEmail({to:input.email,message:staffInvitationEmail(input)})}

function auditWriter(supabase: AdminClient) {
  return async (event: { actorId: string; action: string; entityType: string; entityId: string; afterSnapshot: unknown }) => {
    const { error } = await supabase.from('audit_log').insert({
      actor_id: event.actorId,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      after_snapshot: event.afterSnapshot,
    })
    if (error) throw new Error(`STAFF_INVITE_AUDIT_FAILED:${error.message}`)
  }
}

export async function listStaffInvites() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('staff_invites')
    .select(inviteColumns)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(`STAFF_INVITES_LOAD_FAILED:${error.message}`)
  const now = new Date()
  return (data ?? []).map((row) => {
    const invite = mapInvite(row as Record<string, unknown>)
    return {
      id: invite.id,
      email: invite.email,
      displayName: invite.displayName,
      role: invite.role,
      scopes: invite.scopes,
      canPublish: invite.canPublish,
      status: effectiveStaffInviteStatus(invite, now),
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    }
  })
}

export async function createServerStaffInvite(
  input: { email: string; displayName: string; role: string; scopes?: string[]; canPublish?: boolean },
  actorId: string,
  origin: string,
) {
  const supabase = createSupabaseAdminClient()
  return createStaffInvite(
    { ...input, scopes: sanitizeScopes(input.scopes ?? []), origin },
    actorId,
    {
      insertInvite: async (row) => {
        const { data, error } = await supabase.from('staff_invites').insert({
          email: row.email,
          display_name: row.displayName,
          role: row.role,
          scopes: row.scopes,
          can_publish: row.canPublish,
          token_hash: row.tokenHash,
          status: row.status,
          expires_at: row.expiresAt,
          invited_by: row.invitedBy,
          created_at: row.createdAt,
        }).select('id').single()
        if (error || !data) throw inviteWriteError(error ?? {}, 'STAFF_INVITE_CREATE_FAILED')
        return data.id
      },
      discardInvite: async (id) => {
        const { error } = await supabase.from('staff_invites').delete().eq('id', id).eq('status', 'INVITED')
        if (error) throw new Error(`STAFF_INVITE_DISCARD_FAILED:${error.message}`)
      },
      generateAuthInviteLink: (email, nextPath) => generateStaffActivationLink(supabase, email, nextPath, origin),
      sendInviteEmail: sendStaffInviteEmail,
      audit: auditWriter(supabase),
    },
  )
}

export async function resendServerStaffInvite(inviteId: string, actorId: string, origin: string) {
  const supabase = createSupabaseAdminClient()
  return resendStaffInvite(inviteId, actorId, {
    getInvite: async (id) => {
      const { data, error } = await supabase.from('staff_invites').select(inviteColumns).eq('id', id).maybeSingle()
      if (error) throw new Error(`STAFF_INVITE_LOAD_FAILED:${error.message}`)
      return data ? mapInvite(data as Record<string, unknown>) : null
    },
    reissueInvite: async ({ id, expectedTokenHash, tokenHash, expiresAt, status }) => {
      const { data, error } = await supabase.from('staff_invites')
        .update({ token_hash: tokenHash, expires_at: expiresAt, status })
        .eq('id', id).eq('token_hash', expectedTokenHash).in('status', ['INVITED', 'EXPIRED'])
        .select('id')
      if (error) throw inviteWriteError(error, 'STAFF_INVITE_RESEND_FAILED')
      if (!data?.length) throw new Error('STAFF_INVITE_CHANGED')
    },
    generateAuthInviteLink: (email, nextPath) => generateStaffActivationLink(supabase, email, nextPath, origin),
    sendInviteEmail: sendStaffInviteEmail,
    audit: auditWriter(supabase),
  })
}

// Revoking an expired invitation dismisses it from the Super Admin's list.
export async function revokeServerStaffInvite(inviteId: string, actorId: string) {
  const supabase = createSupabaseAdminClient()
  const { data: invite, error: loadError } = await supabase.from('staff_invites').select('id,email,status').eq('id', inviteId).single()
  if (loadError || !invite) throw new Error('STAFF_INVITE_NOT_FOUND')
  if (invite.status !== 'INVITED' && invite.status !== 'EXPIRED') throw new Error('STAFF_INVITE_NOT_REVOCABLE')
  const { data, error } = await supabase.from('staff_invites').update({ status: 'REVOKED', revoked_at: new Date().toISOString() }).eq('id', inviteId).in('status', ['INVITED', 'EXPIRED']).select('id')
  if (error) throw new Error(`STAFF_INVITE_REVOKE_FAILED:${error.message}`)
  if (!data?.length) throw new Error('STAFF_INVITE_NOT_REVOCABLE')
  await supabase.from('audit_log').insert({ actor_id: actorId, action: 'STAFF_INVITE_REVOKED', entity_type: 'staff_invite', entity_id: inviteId, after_snapshot: { email: invite.email } })
}

export async function acceptServerStaffInvite(token: string, currentUser: { id: string; email: string }) {
  const supabase = createSupabaseAdminClient()
  return acceptStaffInvite(
    { token, currentUser },
    {
      getInviteByHash: async (tokenHash) => {
        const { data, error } = await supabase.from('staff_invites').select('*').eq('token_hash', tokenHash).maybeSingle()
        if (error) throw new Error(`STAFF_INVITE_LOAD_FAILED:${error.message}`)
        return data ? mapInvite(data as Record<string, unknown>) : null
      },
      activateInvite: async ({ invite, userId }) => {
        const { data, error } = await supabase.rpc('accept_staff_invite', { p_invite_id: invite.id, p_user_id: userId })
        if (error) throw new Error(error.message)
        // The database reports expiry as data so that the EXPIRED status is kept.
        const failure = (data as { error?: unknown } | null)?.error
        if (typeof failure === 'string') throw new Error(failure)
      },
      expireInvite: async (id) => {
        const { error } = await supabase.from('staff_invites').update({ status: 'EXPIRED' })
          .eq('id', id).eq('status', 'INVITED').lte('expires_at', new Date().toISOString())
        if (error) throw new Error(`STAFF_INVITE_EXPIRE_FAILED:${error.message}`)
      },
    },
  )
}

export function staffInviteTokenDigest(token: string) {
  return hashStaffInviteToken(token)
}
