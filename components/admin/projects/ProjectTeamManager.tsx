'use client'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowUpRight, Crown, Eye, EyeOff, Rocket, Send, Trash2, UserMinus, UserPlus } from 'lucide-react'
import type { ActiveMemberChoice, AdminProjectTeam } from '@/lib/projects/teamAdmin'
import { formatDueDate, isOverdue, milestoneStatusLabels, postKindLabels, publicationLabel, relativeTime, stageLabel } from '@/lib/projects/labels'
import { formatPortalDate } from '@/lib/format/portalDate'
import { ProjectInterestDecision } from './ProjectInterestDecision'
import { ActionNotice, useProjectTeamAction } from './useProjectTeamAction'

type Team = AdminProjectTeam
const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?'

export function ProjectTeamManager({ team, members }: { team: Team; members: ActiveMemberChoice[] }) {
  const { project, roster } = team
  const leads = roster.filter(person => person.role === 'LEAD')
  const done = team.milestones.filter(m => m.status === 'DONE').length
  return <>
    <Link className="pt-back" href="/admin/project-teams"><ArrowLeft size={16}/>All project teams</Link>
    <div className="admin-page-heading">
      <div>
        <div className="pt-pills">
          <span className={`pt-pill ${project.status === 'active' ? 'pt-pill--good' : ''}`}>{stageLabel(project.status)}</span>
          <span className={`pt-pill ${project.publicationState === 'published' ? '' : 'pt-pill--warn'}`}>{publicationLabel(project.publicationState)}</span>
          {project.recruiting && <span className="pt-pill pt-pill--accent">Accepting applications</span>}
        </div>
        <h1>{project.title}</h1>
        {project.summary && <p>{project.summary}</p>}
      </div>
      <div className="pt-actions">
        {project.publicationState === 'published' && <a className="button button--ghost" href={`/projects/${project.slug}`} target="_blank" rel="noreferrer">View on website <ArrowUpRight size={16}/></a>}
        <Link className="button button--ghost" href={`/admin/projects?edit=${project.id}`}>Edit project details</Link>
      </div>
    </div>
    <p className="pt-summary">
      <span>{roster.length} team member{roster.length === 1 ? '' : 's'}</span>
      <span>{leads.length ? `Lead: ${leads.map(person => person.displayName).join(', ')}` : 'No lead yet'}</span>
      {team.milestones.length > 0 && <span className="pt-progress"><span>{done} of {team.milestones.length} milestones done</span><span className="pt-progress__bar" aria-hidden="true"><span style={{ width: `${Math.round(done / team.milestones.length * 100)}%` }}/></span></span>}
    </p>
    <div className="pt-stack">
      <StartPanel team={team}/>
      <div className="pt-grid">
        <div className="pt-stack">
          {team.applications.length > 0 && <ApplicationsPanel team={team}/>}
          <RosterPanel team={team} members={members}/>
        </div>
        <div className="pt-stack">
          <ProgressPanel team={team}/>
          <FeedPanel team={team}/>
          {team.links.length > 0 && <section className="pt-card" aria-labelledby="pt-links"><h2 id="pt-links">Team links</h2><ul className="pt-links">{team.links.map(link => <li key={link.id}><a href={link.url} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={14}/></a></li>)}</ul></section>}
        </div>
      </div>
      <ManagePanel team={team}/>
    </div>
  </>
}

function StartPanel({ team }: { team: Team }) {
  const action = useProjectTeamAction()
  const { project, roster } = team
  const started = Boolean(project.startedAt)
  const [open, setOpen] = useState(!started)
  const hasLead = roster.some(person => person.role === 'LEAD')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const when = String(form.get('meetingAt') ?? '')
    if (!window.confirm(`${started ? 'Send another kickoff email to' : `Start "${project.title}" and email`} ${roster.length} team member${roster.length === 1 ? '' : 's'}?`)) return
    const body = await action.run({ action: 'start', projectId: project.id, message: String(form.get('message') ?? ''), meetingAt: when ? new Date(when).toISOString() : null, location: String(form.get('location') ?? '') },
      result => result.emailsSent === roster.length ? `Project started. Kickoff email sent to all ${roster.length} team members.` : `Project started and everyone has an in-app notice, but only ${result.emailsSent ?? 0} of ${roster.length} kickoff emails were sent.`)
    if (body) setOpen(false)
  }
  return <section className={`pt-card ${started ? 'pt-card--started' : 'pt-card--start'}`} aria-labelledby="pt-start">
    <div className="pt-card-head"><h2 id="pt-start">{started ? 'Project underway' : 'Start this project'}</h2>{started && <span className="pt-pill pt-pill--good">Started {formatPortalDate(project.startedAt!)}</span>}</div>
    <p className="pt-hint">{started ? 'Everyone on the team was told the project started. You can email the team again with new kickoff details.' : 'Starting marks the project Active on the website and emails everyone on the team with your kickoff note, so they know it is time to begin.'}</p>
    <ActionNotice error={action.error} message={action.message}/>
    {roster.length === 0 ? <p className="pt-hint"><strong>Add at least one team member before starting.</strong></p>
      : !open ? <div className="pt-actions"><button type="button" onClick={() => setOpen(true)}><Send size={16}/>Email the team again</button></div>
      : <form className="pt-form" onSubmit={submit}>
        {!hasLead && <p className="pt-hint">This team has no lead yet. You can still start it; officers will handle new applications until someone is made lead.</p>}
        <label>Kickoff message <small>Included in the email and shown at the top of the team workspace</small><textarea name="message" rows={4} maxLength={4000} placeholder="Welcome to the team! Here is what we will tackle first..."/></label>
        <div className="pt-form-row">
          <label>First meeting <small>Optional</small><input name="meetingAt" type="datetime-local"/></label>
          <label>Where <small>Optional</small><input name="location" maxLength={300} placeholder="Science Center, room B25"/></label>
        </div>
        <div className="pt-actions">
          <button className="button--cardinal" disabled={action.busy}><Rocket size={17}/>{action.busy ? 'Sending...' : started ? `Email ${roster.length} team member${roster.length === 1 ? '' : 's'}` : `Start project & email ${roster.length} ${roster.length === 1 ? 'person' : 'people'}`}</button>
          {started && <button type="button" disabled={action.busy} onClick={() => setOpen(false)}>Cancel</button>}
        </div>
      </form>}
    {team.kickoffs.length > 0 && <ul className="pt-history" aria-label="Kickoff emails">{team.kickoffs.map(kickoff => <li key={kickoff.id}>{formatPortalDate(kickoff.createdAt)}{kickoff.sentByName ? ` by ${kickoff.sentByName}` : ''}: emailed {kickoff.emailsSent ?? 0} of {kickoff.recipientCount}{kickoff.meetingLocation ? ` · ${kickoff.meetingLocation}` : ''}</li>)}</ul>}
  </section>
}

function RosterPanel({ team, members }: { team: Team; members: ActiveMemberChoice[] }) {
  const action = useProjectTeamAction()
  const [query, setQuery] = useState('')
  const { project, roster } = team
  const onTeam = new Set(roster.map(person => person.userId))
  const needle = query.trim().toLowerCase()
  const choices = members.filter(member => !onTeam.has(member.userId) && (!needle || `${member.displayName} ${member.email}`.toLowerCase().includes(needle))).slice(0, 200)
  function setRole(userId: string, name: string, role: 'LEAD' | 'MEMBER') {
    void action.run({ action: 'set-member', projectId: project.id, userId, role }, () => role === 'LEAD' ? `${name} is now a lead.` : `${name} is now a team member.`)
  }
  function remove(userId: string, name: string) {
    if (!window.confirm(`Remove ${name} from ${project.title}? They will be notified.`)) return
    void action.run({ action: 'remove-member', projectId: project.id, userId }, () => `${name} was removed from the team.`)
  }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const userId = String(form.get('userId') ?? '')
    const role = form.get('role') === 'LEAD' ? 'LEAD' : 'MEMBER'
    const name = members.find(member => member.userId === userId)?.displayName ?? 'Member'
    if (!userId) return
    const body = await action.run({ action: 'set-member', projectId: project.id, userId, role }, result => `${name} was added${role === 'LEAD' ? ' as a lead' : ''}.${result.emailSent ? '' : ' They have an in-app notice, but the email was not sent.'}`)
    if (body) { formElement.reset(); setQuery('') }
  }
  return <section className="pt-card" aria-labelledby="pt-roster">
    <div className="pt-card-head"><h2 id="pt-roster">Team roster</h2><span className="portal-muted">{roster.length} {roster.length === 1 ? 'person' : 'people'}</span></div>
    <ActionNotice error={action.error} message={action.message}/>
    {roster.length ? <ul className="pt-roster">{roster.map(person => <li key={person.userId}>
      <span className={`pt-avatar ${person.role === 'LEAD' ? 'pt-avatar--lead' : ''}`} aria-hidden="true">{initial(person.displayName)}</span>
      <span className="pt-person"><strong>{person.displayName}</strong><small>{person.role === 'LEAD' ? 'Project lead' : 'Team member'} · <a href={`mailto:${person.email}`}>{person.email}</a></small><small>Joined {relativeTime(person.joinedAt)}{person.viaTeam ? ' through a club team' : ''}</small></span>
      <span className="pt-person-actions pt-actions">
        {person.role === 'LEAD' ? <button type="button" className="pt-btn--small" disabled={action.busy} onClick={() => setRole(person.userId, person.displayName, 'MEMBER')}>Make member</button>
          : <button type="button" className="pt-btn--small" disabled={action.busy} onClick={() => setRole(person.userId, person.displayName, 'LEAD')}><Crown size={14}/>Make lead</button>}
        <button type="button" className="pt-btn--small pt-btn--danger" disabled={action.busy} onClick={() => remove(person.userId, person.displayName)} aria-label={`Remove ${person.displayName}`}><UserMinus size={14}/>Remove</button>
      </span>
    </li>)}</ul> : <p className="pt-hint">No one is on this team yet. Add members below, or approve someone&apos;s application.</p>}
    <form className="pt-form" onSubmit={add} style={{ marginTop: 18 }}>
      <h3 style={{ margin: 0, fontSize: 15 }}>Add someone to the team</h3>
      <label>Find a member<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or Oberlin email"/></label>
      <label>Member<select name="userId" required defaultValue=""><option value="" disabled>{choices.length ? 'Choose a member' : 'No matching active members'}</option>{choices.map(member => <option key={member.userId} value={member.userId}>{member.displayName} ({member.email})</option>)}</select></label>
      <label>Role<select name="role" defaultValue="MEMBER"><option value="MEMBER">Team member</option><option value="LEAD">Project lead</option></select></label>
      <div className="pt-actions"><button className="button--cardinal" disabled={action.busy}><UserPlus size={16}/>{action.busy ? 'Saving...' : 'Add to team'}</button></div>
      <p className="pt-hint">Only members with an active account are listed. They get an email and an in-app notice.</p>
    </form>
  </section>
}

function ApplicationsPanel({ team }: { team: Team }) {
  const action = useProjectTeamAction()
  return <section className="pt-card" aria-labelledby="pt-applications">
    <div className="pt-card-head"><h2 id="pt-applications">Waiting to join</h2><span className="pt-pill pt-pill--accent">{team.applications.length}</span></div>
    <p className="pt-hint">Add people as team members. Only choose Make lead for the person who will run the project.</p>
    <ul className="pt-roster pt-roster--stacked">{team.applications.map(application => <li key={application.id} style={{ gridTemplateColumns: '36px minmax(0,1fr)' }}>
      <span className="pt-avatar" aria-hidden="true">{initial(application.displayName)}</span>
      <div className="pt-person">
        <strong>{application.displayName}</strong><small><a href={`mailto:${application.email}`}>{application.email}</a> · applied {relativeTime(application.createdAt)}</small>
        <p style={{ margin: '8px 0 0', fontSize: 14 }}>{application.motivation}</p>
        {application.skills.length > 0 && <div className="tag-row">{application.skills.map(skill => <span key={skill}>{skill}</span>)}</div>}
        <ProjectInterestDecision source="application" requestId={application.id} projectId={team.project.id} projectTitle={team.project.title} memberName={application.displayName} memberEmail={application.email} onDone={() => action.router.refresh()}/>
      </div>
    </li>)}</ul>
  </section>
}

function ProgressPanel({ team }: { team: Team }) {
  const reviewCount = team.updates.filter(update => update.reviewStatus === 'PENDING_REVIEW').length
  return <section className="pt-card" aria-labelledby="pt-progress">
    <div className="pt-card-head"><h2 id="pt-progress">Milestones</h2><span className="portal-muted">Managed by the team</span></div>
    {team.milestones.length ? <ul className="pt-milestones">{team.milestones.map(milestone => <li key={milestone.id} className={`pt-milestone ${milestone.status === 'DONE' ? 'pt-milestone--done' : ''}`}>
      <div><h3>{milestone.title}</h3><div className="pt-meta">{milestone.assigneeName ? <span>Owner: {milestone.assigneeName}</span> : <span>No owner</span>}{milestone.dueDate && <span className={isOverdue(milestone.dueDate, milestone.status) ? 'pt-overdue' : ''}>Due {formatDueDate(milestone.dueDate)}</span>}</div></div>
      <span className={`pt-pill ${milestone.status === 'DONE' ? 'pt-pill--good' : milestone.status === 'BLOCKED' ? 'pt-pill--bad' : milestone.status === 'IN_PROGRESS' ? 'pt-pill--warn' : ''}`}>{milestoneStatusLabels[milestone.status as keyof typeof milestoneStatusLabels] ?? milestone.status}</span>
    </li>)}</ul> : <p className="pt-hint">The team has not planned any milestones yet. Project leads add them in the team workspace.</p>}
    {team.updates.length > 0 && <p className="pt-hint" style={{ marginTop: 12 }}>{team.updates.length} public update{team.updates.length === 1 ? '' : 's'} submitted{reviewCount ? `, ${reviewCount} waiting for review` : ''}. <Link className="portal-text-link" href="/admin/project-updates">Review updates</Link></p>}
  </section>
}

function FeedPanel({ team }: { team: Team }) {
  const action = useProjectTeamAction()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const body = await action.run({ action: 'post', projectId: team.project.id, kind: form.get('kind') === 'WIN' ? 'WIN' : 'UPDATE', body: String(form.get('body') ?? '') }, () => 'Posted to the team feed. Everyone on the team was notified.')
    if (body) formElement.reset()
  }
  return <section className="pt-card" aria-labelledby="pt-feed">
    <div className="pt-card-head"><h2 id="pt-feed">Team feed</h2><span className="portal-muted">Private to the team and officers</span></div>
    {team.posts.length ? <ul className="pt-feed">{team.posts.map(post => <li className="pt-post" key={post.id}>
      <header><strong>{post.authorName}</strong>{post.officer && <span className="pt-pill">Officer</span>}<span className={`pt-pill ${post.kind === 'BLOCKER' ? 'pt-pill--bad' : post.kind === 'WIN' ? 'pt-pill--good' : post.kind === 'QUESTION' ? 'pt-pill--warn' : ''}`}>{postKindLabels[post.kind as keyof typeof postKindLabels] ?? post.kind}</span><time dateTime={post.createdAt} suppressHydrationWarning>{relativeTime(post.createdAt)}</time></header>
      <p>{post.body}</p>
    </li>)}</ul> : <p className="pt-hint">No team posts yet. Members share progress, wins, blockers, and questions here.</p>}
    <form className="pt-form" onSubmit={submit} style={{ marginTop: 14 }}>
      <ActionNotice error={action.error} message={action.message}/>
      <label>Message the team<textarea name="body" rows={3} minLength={2} maxLength={4000} required placeholder="Encouragement, a reminder, or a question for the team"/></label>
      <div className="pt-actions"><select name="kind" aria-label="Post type" defaultValue="UPDATE" style={{ minHeight: 40 }}><option value="UPDATE">Note</option><option value="WIN">Shout-out</option></select><button className="button--cardinal" disabled={action.busy}><Send size={16}/>{action.busy ? 'Posting...' : 'Post to team'}</button></div>
    </form>
  </section>
}

function ManagePanel({ team }: { team: Team }) {
  const archive = useProjectTeamAction(), remove = useProjectTeamAction()
  const [confirming, setConfirming] = useState(false), [typed, setTyped] = useState('')
  const { project, roster } = team
  const hidden = project.publicationState === 'archived'
  function toggleArchive() {
    if (!hidden && !window.confirm(`Hide "${project.title}" from the website? The team, its workspace and history stay intact, and you can show it again later.`)) return
    void archive.run({ action: 'archive', projectId: project.id, archived: !hidden }, () => hidden ? 'The project is back. Published projects show on the website again.' : 'The project is hidden from the website.')
  }
  async function destroy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = await remove.run({ action: 'delete', projectId: project.id, confirmTitle: typed }, () => 'Project deleted.', { refresh: false })
    if (body) remove.router.push('/admin/project-teams')
  }
  const matches = typed.trim().toLowerCase() === project.title.trim().toLowerCase()
  return <section className="pt-card pt-card--danger" aria-labelledby="pt-manage">
    <h2 id="pt-manage">Remove this project</h2>
    <p className="pt-hint">Hiding is reversible. Deleting is permanent.</p>
    <div className="pt-stack" style={{ gap: 18 }}>
      <div>
        <ActionNotice error={archive.error} message={archive.message}/>
        <div className="pt-actions" style={{ marginTop: 8 }}><button type="button" disabled={archive.busy} onClick={toggleArchive}>{hidden ? <><Eye size={16}/>Show on website again</> : <><EyeOff size={16}/>Hide from website</>}</button></div>
        <p className="pt-hint" style={{ marginTop: 6 }}>{hidden ? 'Hidden projects stay in Project teams under the Hidden filter.' : 'Removes it from the public site and the member project list. The team keeps its workspace.'}</p>
      </div>
      <div>
        {!confirming ? <div className="pt-actions"><button type="button" className="pt-btn--danger" onClick={() => setConfirming(true)}><Trash2 size={16}/>Delete permanently</button></div>
          : <form className="pt-form" onSubmit={destroy}>
            <p className="pt-hint"><strong>This permanently deletes the project, its roster, applications, milestones, team feed, links and its published updates.</strong> {roster.length ? `The ${roster.length} ${roster.length === 1 ? 'person' : 'people'} on the team will get a notice.` : 'Nobody is on this team.'}</p>
            <label>Type <strong>{project.title}</strong> to confirm<input value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off"/></label>
            <ActionNotice error={remove.error} message={remove.message}/>
            <div className="pt-actions"><button className="pt-btn--danger" disabled={!matches || remove.busy}><Trash2 size={16}/>{remove.busy ? 'Deleting...' : 'Delete project'}</button><button type="button" disabled={remove.busy} onClick={() => { setConfirming(false); setTyped('') }}>Cancel</button></div>
          </form>}
      </div>
    </div>
  </section>
}
