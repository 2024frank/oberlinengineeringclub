'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Plus, Send, Check, X, UserPlus } from 'lucide-react'
import type { ClubInvitation } from '@/lib/teams/types'
import { useTeamAction } from './useTeamAction'

export function ActionFeedback({ error, message }: { error: string; message: string }) {
  return <>{error && <p className="portal-form-error" role="alert">{error}</p>}{message && <p className="team-feedback" role="status">{message}</p>}</>
}
export function TeamCreateForm({ inviteUserId }: { inviteUserId?: string }) {
  const action = useTeamAction()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = await action.run({ action: 'create', name: String(data.get('name')), description: String(data.get('description')), recruiting: data.has('recruiting') }, 'Team created.')
    if (result) action.router.push(`/member/teams/group/${result.teamId}${inviteUserId ? `?invite=${encodeURIComponent(inviteUserId)}` : ''}`)
  }
  return <form className="portal-form" onSubmit={submit}><fieldset className="portal-editor-fields" disabled={action.busy}>
    <label>Team name<input name="name" minLength={3} maxLength={80} required autoComplete="off"/></label>
    <label>What do you want to work on?<textarea name="description" maxLength={1200} rows={4}/></label>
    <label className="portal-check"><input type="checkbox" name="recruiting" defaultChecked/>Accept requests from other members</label>
    <ActionFeedback {...action}/><div className="portal-form-footer"><Link href="/member/teams">Cancel</Link><button className="button button--primary" disabled={action.busy}><Plus size={18}/>{action.busy ? 'Creating...' : 'Create team'}</button></div>
  </fieldset></form>
}
export function TeamInviteControl({ userId, memberName, teams }: { userId: string; memberName: string; teams: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false), [teamId, setTeamId] = useState('')
  const action = useTeamAction()
  if (!teams.length) return <Link className="portal-text-link" href={`/member/teams/new?invite=${encodeURIComponent(userId)}`}><UserPlus size={16}/>Create a team together</Link>
  return <div className="team-invite-control">
    {!open ? <button className="button button--ghost" aria-label={`Invite ${memberName} to team`} onClick={() => setOpen(true)}><UserPlus size={16}/>Invite to team</button> : <form onSubmit={async event => { event.preventDefault(); await action.run({ action: 'invite', teamId, userId }, 'Invitation sent. They can accept it in their account.') }}>
      <label>Team for {memberName}<select value={teamId} onChange={event => setTeamId(event.target.value)} required disabled={action.busy}><option value="">Choose a team</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <div className="team-actions"><button className="button button--primary" disabled={!teamId || action.busy || Boolean(action.message)}><Send size={16}/>{action.busy ? 'Sending...' : 'Send invitation'}</button><button type="button" className="button button--ghost" onClick={() => setOpen(false)}>Close</button></div>
    </form>}
    <ActionFeedback {...action}/>
  </div>
}
function InvitationRow({ invitation }: { invitation: ClubInvitation }) {
  const [status, setStatus] = useState(invitation.status)
  const action = useTeamAction()
  async function respond(decision: 'ACCEPT' | 'DECLINE') {
    const result = await action.run({ action: 'respond', teamId: invitation.teamId, decision }, decision === 'ACCEPT' ? 'You joined the team.' : 'Invitation declined.')
    if (result?.status) setStatus(result.status)
  }
  return <article className="team-invitation"><div><Link href={`/member/teams/group/${invitation.teamId}`}><h3>{invitation.teamName}</h3></Link><p>{invitation.message}</p><p className="portal-muted">{status === 'PENDING' ? `Expires ${new Date(invitation.expiresAt).toLocaleDateString('en-US')}` : status.toLowerCase()}</p></div>
    {status === 'PENDING' && <div className="team-actions"><button className="button button--primary" disabled={action.busy} onClick={() => void respond('ACCEPT')}><Check size={16}/>Accept invitation</button><button className="button button--ghost" disabled={action.busy} onClick={() => void respond('DECLINE')}><X size={16}/>Decline</button></div>}
    <ActionFeedback {...action}/>
  </article>
}
export function ClubInvitations({ invitations }: { invitations: ClubInvitation[] }) {
  return <section className="portal-section"><h2>Team invitations</h2>{invitations.length ? invitations.map(invitation => <InvitationRow key={invitation.teamId} invitation={invitation}/>) : <p className="portal-muted">No team invitations yet.</p>}</section>
}
