'use client'
import { FormEvent, useState } from 'react'
import type { DirectoryMember } from '@/lib/members/directory'
import type { ProjectApplication } from '@/lib/projects/applications'
import type { ProjectWorkspace } from '@/lib/projects/workspace'
import { workspaceErrorMessage } from '@/lib/projects/workspaceInput'

async function jsonFetch(url: string, init: RequestInit) {
  const response = await fetch(url, init)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(workspaceErrorMessage(body.error ?? ''))
  return body
}
const put = (body: unknown): RequestInit => ({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const failure = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback

export function RosterManager({ projectId, roster }: { projectId: string; roster: ProjectWorkspace['roster'] }) {
  const [busy, setBusy] = useState(''), [error, setError] = useState('')
  async function remove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the project team?`)) return
    setBusy(userId); setError('')
    try { await jsonFetch(`/api/member/projects/${projectId}`, put({ action: 'remove-member', userId })); window.location.reload() }
    catch (reason) { setError(failure(reason, 'Could not remove this member.')) }
    finally { setBusy('') }
  }
  return <section className="pt-card" aria-labelledby="ws-roster">
    <div className="pt-card-head"><h2 id="ws-roster">Team</h2><span className="portal-muted">{roster.length} {roster.length === 1 ? 'person' : 'people'}</span></div>
    {error && <p className="portal-form-error" role="alert">{error}</p>}
    <ul className="pt-roster">{roster.map(member => <li key={member.userId}>
      <span className={`pt-avatar ${member.role === 'LEAD' ? 'pt-avatar--lead' : ''}`} aria-hidden="true">{member.displayName.slice(0, 1).toUpperCase()}</span>
      <span className="pt-person"><strong>{member.displayName}</strong><small>{member.role === 'LEAD' ? 'Project lead' : 'Team member'}</small></span>
      {member.role !== 'LEAD' && <span className="pt-person-actions pt-actions"><button type="button" className="pt-btn--small" disabled={busy === member.userId} onClick={() => void remove(member.userId, member.displayName)}>Remove</button></span>}
    </li>)}</ul>
  </section>
}

export function ApplicationReviewList({ applications }: { applications: ProjectApplication[] }) {
  const [busy, setBusy] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('')
  async function decide(id: string, decision: 'ACCEPT' | 'REJECT') {
    setBusy(id); setError(''); setMessage('')
    try {
      await jsonFetch('/api/member/project-applications', put({ applicationId: id, decision }))
      setMessage(decision === 'ACCEPT' ? 'Applicant added to the team.' : 'Application declined.')
      window.setTimeout(() => window.location.reload(), 400)
    } catch (reason) { setError(failure(reason, 'Decision failed.')) }
    finally { setBusy('') }
  }
  if (!applications.length) return null
  return <section className="pt-card" aria-labelledby="ws-applications">
    <div className="pt-card-head"><h2 id="ws-applications">Waiting to join</h2><span className="pt-pill pt-pill--accent">{applications.length}</span></div>
    {message && <p className="pt-notice" role="status">{message}</p>}
    {error && <p className="portal-form-error" role="alert">{error}</p>}
    <ul className="pt-roster pt-roster--stacked">{applications.map(app => <li key={app.id} style={{ gridTemplateColumns: '36px minmax(0,1fr)' }}>
      <span className="pt-avatar" aria-hidden="true">{(app.applicantName ?? 'M').slice(0, 1).toUpperCase()}</span>
      <div className="pt-person">
        <strong>{app.applicantName ?? 'OEC member'}</strong>
        <p style={{ margin: '6px 0' }}>{app.motivation}</p>
        {app.skills.length > 0 && <div className="tag-row">{app.skills.map(skill => <span key={skill}>{skill}</span>)}</div>}
        <div className="pt-actions" style={{ marginTop: 8 }}><button className="button--cardinal" disabled={busy === app.id} onClick={() => void decide(app.id, 'ACCEPT')}>Add to team</button><button disabled={busy === app.id} onClick={() => void decide(app.id, 'REJECT')}>Decline</button></div>
      </div>
    </li>)}</ul>
  </section>
}

export function TeamInviteForm({ projectId, members, roster }: { projectId: string; members: DirectoryMember[]; roster: ProjectWorkspace['roster'] }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const existing = new Set(roster.map(r => r.userId))
  const options = members.filter(m => m.displayName && !existing.has(m.userId))
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setBusy(true); setMessage(''); setError('')
    const form = new FormData(formElement)
    try {
      await jsonFetch('/api/member/project-invitations', post({ projectId, invitedUserId: form.get('memberId'), message: form.get('message') }))
      setMessage('Invitation sent. The member must accept before joining.')
      formElement.reset()
    } catch (reason) { setError(failure(reason, 'Could not send invitation.')) }
    finally { setBusy(false) }
  }
  return <section className="pt-card" aria-labelledby="ws-invite">
    <h2 id="ws-invite">Invite a member</h2>
    <p className="pt-hint">Only members who chose to appear in the member directory are listed.</p>
    {options.length ? <form className="pt-form" onSubmit={submit}>
      <label>Member<select name="memberId" required defaultValue=""><option value="" disabled>Select a member</option>{options.map(m => <option key={m.userId} value={m.userId}>{m.displayName}{m.major ? ` · ${m.major}` : ''}</option>)}</select></label>
      <label>Message<textarea name="message" rows={2} placeholder="What would you like them to work on?"/></label>
      <div className="pt-actions"><button className="button--cardinal" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</button></div>
      {message && <span role="status">{message}</span>}
      {error && <p className="portal-form-error" role="alert">{error}</p>}
    </form> : <p className="pt-hint">No additional visible members to invite right now.</p>}
  </section>
}

export function TeamUpdateForm({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Keep the element: React clears event.currentTarget once the handler awaits.
    const formElement = event.currentTarget
    setBusy(true); setMessage(''); setError('')
    const form = new FormData(formElement)
    try {
      await jsonFetch(`/api/member/projects/${projectId}/updates`, post({ title: form.get('title'), summary: form.get('summary'), body: form.get('body'), milestone: form.get('milestone'), updateDate: form.get('updateDate') }))
      setMessage('Update sent to the officers for review. It is not public yet.')
      formElement.reset()
      window.setTimeout(() => window.location.reload(), 800)
    } catch (reason) { setError(failure(reason, 'Could not submit update.')) }
    finally { setBusy(false) }
  }
  return <form className="pt-form" onSubmit={submit}>
    <div className="pt-form-row"><label>Title<input name="title" minLength={3} maxLength={180} required/></label><label>Date<input name="updateDate" type="date"/></label></div>
    <label>Summary <small>One or two sentences for the project page</small><textarea name="summary" rows={3} maxLength={700}/></label>
    <label>Full update <small>Optional</small><textarea name="body" rows={5} maxLength={8000}/></label>
    <label>Milestone label <small>Optional</small><input name="milestone" maxLength={180}/></label>
    {message && <p className="pt-notice" role="status">{message}</p>}
    {error && <p className="portal-form-error" role="alert">{error}</p>}
    <div className="pt-actions"><button className="button--cardinal" disabled={busy}>{busy ? 'Submitting…' : 'Send for review'}</button></div>
  </form>
}
