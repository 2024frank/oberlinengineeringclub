'use client'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Lightbulb, Send, X } from 'lucide-react'
import type { ClubTeam, TeamProject } from '@/lib/teams/types'
import type { DirectoryMember } from '@/lib/members/directory'
import type { TeamAction } from '@/lib/teams/input'
import { useTeamAction } from './useTeamAction'
import { ActionFeedback } from './TeamForms'
import { TeamRoster } from './TeamBrowser'

function ActionButton({ input, children, success, confirm, admin = false }: { input: TeamAction; children: React.ReactNode; success: string; confirm?: string; admin?: boolean }) {
  const action = useTeamAction(admin)
  return <div><button className="button button--ghost" disabled={action.busy} onClick={() => { if (!confirm || window.confirm(confirm)) void action.run(input, success) }}>{action.busy ? 'Saving...' : children}</button><ActionFeedback {...action}/></div>
}
export function TeamProjectReview({ teamId, project, admin = false }: { teamId: string; project: TeamProject; admin?: boolean }) {
  const action = useTeamAction(admin)
  return <div><p>Approval gives the team&apos;s current and future members project access. Existing project leads keep their roles.</p><div className="team-actions">
    <button className="button button--primary" disabled={action.busy} onClick={() => void action.run({ action: 'review-project', teamId, projectId: project.id, decision: 'APPROVE' }, 'Team approved for this project.')}><Check size={16}/>Approve team</button>
    <button className="button button--ghost" disabled={action.busy} onClick={() => void action.run({ action: 'review-project', teamId, projectId: project.id, decision: 'REJECT' }, 'Request declined.')}><X size={16}/>Decline</button>
  </div><ActionFeedback {...action}/></div>
}
export function TeamProjectRequests({ teams, projectId, admin = false }: { teams: ClubTeam[]; projectId?: string; admin?: boolean }) {
  const requests = teams.flatMap(team => team.projects.filter(project => project.status === 'PENDING' && project.canReview && (!projectId || project.id === projectId)).map(project => ({ team, project })))
  if (!requests.length) return null
  return <section className="portal-section"><h2>Team project requests</h2>{requests.map(({ team, project }) => <article className="team-invitation" key={`${team.id}-${project.id}`}><div><h3>{team.name}</h3><p>{project.title} · {team.roster.length} member{team.roster.length === 1 ? '' : 's'}</p><TeamRoster people={team.roster}/></div><TeamProjectReview teamId={team.id} project={project} admin={admin}/></article>)}</section>
}
function JoinTeam({ team }: { team: ClubTeam }) {
  const action = useTeamAction()
  if (team.myRequest?.status === 'PENDING') return <p className="team-feedback">{team.myRequest.direction === 'INVITE' ? <Link href="/member/invitations">You have an invitation. Review it in Invitations.</Link> : 'Your request is waiting for the team lead.'}</p>
  if (!team.recruiting) return <p className="portal-muted">This team is not taking requests right now.</p>
  return <form className="team-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void action.run({ action: 'join', teamId: team.id, message: String(data.get('message')) }, 'Request sent to the team lead.') }}><label>Message to the team<textarea name="message" rows={3} maxLength={1200}/></label><button className="button button--primary" disabled={action.busy || Boolean(action.message)}><Send size={16}/>Request to join</button><ActionFeedback {...action}/></form>
}
function InviteTeammate({ team, members, inviteUserId }: { team: ClubTeam; members: DirectoryMember[]; inviteUserId?: string }) {
  const action = useTeamAction()
  const options = members.filter(member => member.displayName && !team.roster.some(person => person.userId === member.userId) && !team.requests.some(request => request.userId === member.userId && request.status === 'PENDING'))
  return <section className="portal-section"><h2>Invite a teammate</h2>{options.length ? <form className="team-form" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const result = await action.run({ action: 'invite', teamId: team.id, userId: String(data.get('memberId')), message: String(data.get('message')) }, 'Invitation sent. They must accept before joining.'); if (result) form.reset() }}>
    <label>Member<select name="memberId" defaultValue={options.some(member => member.userId === inviteUserId) ? inviteUserId : ''} required><option value="">Choose a member</option>{options.map(member => <option key={member.userId} value={member.userId}>{member.displayName}{member.skills?.length ? ` · ${member.skills.join(', ')}` : ''}</option>)}</select></label>
    <label>Message<textarea name="message" maxLength={1200} rows={2}/></label><button className="button button--primary" disabled={action.busy}><Send size={16}/>{action.busy ? 'Sending...' : 'Send invitation'}</button><ActionFeedback {...action}/>
  </form> : <p className="portal-muted">No more visible members to invite. Members with private profiles can request to join this team.</p>}</section>
}
function ChooseProject({ team, projects }: { team: ClubTeam; projects: { id: string; title: string }[] }) {
  const action = useTeamAction()
  const options = projects.filter(project => !team.projects.some(existing => existing.id === project.id && existing.status !== 'REJECTED'))
  return <section className="portal-section"><h2>Choose a project</h2>{options.length ? <form className="team-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void action.run({ action: 'request-project', teamId: team.id, projectId: String(data.get('projectId')) }, 'Request sent. A project lead or officer will review it.') }}><label>Existing project<select name="projectId" defaultValue="" required><option value="">Choose a project</option>{options.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><button className="button button--primary" disabled={action.busy}><Send size={16}/>Request project access</button><ActionFeedback {...action}/></form> : <p className="portal-muted">No other projects are accepting teams right now.</p>}
    <Link className="portal-text-link team-proposal-link" href={`/member/proposals?new=1&team=${team.id}`}><Lightbulb size={18}/>Propose a project for this team <ArrowRight size={16}/></Link>
  </section>
}
function TeamSettings({ team }: { team: ClubTeam }) {
  const action = useTeamAction()
  const [open, setOpen] = useState(false)
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); await action.run({ action: 'update', teamId: team.id, name: String(data.get('name')), description: String(data.get('description')), recruiting: data.has('recruiting') }, 'Team details saved.') }
  return <section className="portal-section"><button className="button button--ghost" aria-expanded={open} onClick={() => setOpen(!open)}>Team settings</button>{open && <form className="team-form" onSubmit={save}><label>Team name<input name="name" minLength={3} maxLength={80} defaultValue={team.name} required/></label><label>Description<textarea name="description" maxLength={1200} defaultValue={team.description}/></label><label className="portal-check"><input type="checkbox" name="recruiting" defaultChecked={team.recruiting}/>Accept join requests</label><button className="button button--primary" disabled={action.busy}>Save changes</button><ActionFeedback {...action}/></form>}</section>
}
export function TeamWorkspace({ team, members = [], projects = [], inviteUserId, admin = false }: { team: ClubTeam; members?: DirectoryMember[]; projects?: { id: string; title: string }[]; inviteUserId?: string; admin?: boolean }) {
  const lead = team.myRole === 'LEAD' && !admin
  return <>
    <div className="admin-page-heading"><div><p className="eyebrow">{team.myRole ? 'Your team' : 'Club team'}</p><h1>{team.name}</h1><p>{team.description}</p><span className="portal-status">{team.recruiting ? 'Recruiting' : 'Not recruiting'}</span></div></div>
    <div className="team-workspace-grid"><div>
      <section className="portal-section"><h2>Members <span className="portal-muted">{team.roster.length}</span></h2><TeamRoster people={team.roster}/>
        {lead && team.roster.filter(person => person.role !== 'LEAD' && person.userId).map(person => <div className="team-member-actions" key={person.userId}><strong>{person.displayName}</strong><div className="team-actions"><ActionButton input={{ action: 'transfer', teamId: team.id, userId: person.userId! }} success="Team lead changed." confirm={`Make ${person.displayName} the team lead? You will become a regular team member.`}>Make team lead</ActionButton><ActionButton input={{ action: 'remove', teamId: team.id, userId: person.userId! }} success="Member removed from this team." confirm={`Remove ${person.displayName} from this team?`}>Remove</ActionButton></div></div>)}
        {!team.myRole && !admin && <JoinTeam team={team}/>}
        {team.myRole === 'MEMBER' && !admin && <ActionButton input={{ action: 'leave', teamId: team.id }} success="You left the team." confirm="Leave this team? Access through this team will end.">Leave team</ActionButton>}
      </section>
      {(lead || admin) && team.requests.length > 0 && <section className="portal-section"><h2>Invitations and requests</h2>{team.requests.map(request => <article className="team-request" key={request.userId}><h3>{request.displayName}</h3><p>{request.direction === 'INVITE' ? 'Invitation sent' : 'Wants to join'} · {request.status.toLowerCase()}</p>{request.message && <p>{request.message}</p>}{lead && request.status === 'PENDING' && <div className="team-actions">{request.direction === 'JOIN' ? <><ActionButton input={{ action: 'review-member', teamId: team.id, userId: request.userId, decision: 'ACCEPT' }} success="Member added to the team.">Accept request</ActionButton><ActionButton input={{ action: 'review-member', teamId: team.id, userId: request.userId, decision: 'DECLINE' }} success="Request declined.">Decline</ActionButton></> : <ActionButton input={{ action: 'revoke', teamId: team.id, userId: request.userId }} success="Invitation cancelled.">Cancel invitation</ActionButton>}</div>}</article>)}</section>}
      {lead && <InviteTeammate team={team} members={members} inviteUserId={inviteUserId}/>}
    </div><div>
      <section className="portal-section"><h2>Projects</h2>{team.projects.length ? team.projects.map(project => <article className="team-project" key={project.id}><h3>{project.title}</h3><p className="portal-muted">{project.status === 'PENDING' ? 'Awaiting approval' : project.status === 'REJECTED' ? 'Request declined' : 'Approved'}</p>{project.status === 'APPROVED' && project.canAccess && team.myRole && <Link className="portal-text-link" href={`/member/teams/${project.id}`}>Open project workspace <ArrowRight size={16}/></Link>}{project.status === 'PENDING' && project.canReview && <TeamProjectReview teamId={team.id} project={project} admin={admin}/>}</article>) : <p className="portal-muted">No project selected yet.</p>}</section>
      {lead && <ChooseProject team={team} projects={projects}/>}
      {team.proposals.length > 0 && <section className="portal-section"><h2>Team proposals</h2>{team.proposals.map(proposal => <article className="team-project" key={proposal.id}><h3>{proposal.title}</h3><p>{proposal.status === 'PENDING' ? 'Awaiting officer review' : proposal.status.toLowerCase()}</p>{proposal.feedback && <p>{proposal.feedback}</p>}</article>)}</section>}
    </div></div>
    {lead && <TeamSettings team={team}/>}
  </>
}
