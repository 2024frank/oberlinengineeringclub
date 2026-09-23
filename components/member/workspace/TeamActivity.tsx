'use client'
import { useState, type FormEvent } from 'react'
import { ArrowUpRight, CalendarClock, LogOut, MapPin, Plus, Send, Trash2 } from 'lucide-react'
import type { ProjectWorkspace, TeamPostKind } from '@/lib/projects/workspace'
import { postKindLabels, relativeTime } from '@/lib/projects/labels'
import { useWorkspaceAction, WorkspaceNotice } from './useWorkspaceAction'

const kindHints: Record<TeamPostKind, string> = {
  UPDATE: 'What did you work on, and what is next?',
  WIN: 'Something worked! Share it with the team.',
  BLOCKER: 'What is stuck, and what would unblock it?',
  QUESTION: 'What do you need to know from the team?',
}
const kindTone = (kind: string) => kind === 'BLOCKER' ? 'pt-pill--bad' : kind === 'WIN' ? 'pt-pill--good' : kind === 'QUESTION' ? 'pt-pill--warn' : ''

export function KickoffBanner({ kickoff }: { kickoff: NonNullable<ProjectWorkspace['kickoff']> }) {
  const when = kickoff.meetingAt ? new Date(kickoff.meetingAt).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
  return <section className="pt-kickoff" aria-labelledby="ws-kickoff">
    <h2 id="ws-kickoff">Your project has started</h2>
    {kickoff.message && <p>{kickoff.message}</p>}
    {(when || kickoff.meetingLocation) && <div className="pt-meta">{when && <span><CalendarClock size={14} aria-hidden="true"/> {when} (Eastern)</span>}{kickoff.meetingLocation && <span><MapPin size={14} aria-hidden="true"/> {kickoff.meetingLocation}</span>}</div>}
  </section>
}

export function TeamFeed({ projectId, posts, me, isLead }: { projectId: string; posts: ProjectWorkspace['posts']; me: string; isLead: boolean }) {
  const action = useWorkspaceAction(projectId)
  const [kind, setKind] = useState<TeamPostKind>('UPDATE')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const body = String(new FormData(formElement).get('body') ?? '')
    if (await action.run({ action: 'post', kind, body }, 'Posted. Your teammates were notified.')) { formElement.reset(); setKind('UPDATE') }
  }
  return <section className="pt-card" id="team-feed" aria-labelledby="ws-feed">
    <div className="pt-card-head"><h2 id="ws-feed">Team feed</h2><span className="portal-muted">Only your team and club officers see this</span></div>
    <form className="pt-form" onSubmit={submit}>
      <fieldset className="pt-kinds"><legend>Post type</legend>{(Object.keys(postKindLabels) as TeamPostKind[]).map(value => <label key={value}><input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)}/>{postKindLabels[value]}</label>)}</fieldset>
      <label className="sr-only" htmlFor="ws-feed-body">Message</label>
      <textarea id="ws-feed-body" name="body" rows={3} minLength={2} maxLength={4000} required placeholder={kindHints[kind]}/>
      <WorkspaceNotice error={action.error} message={action.message}/>
      <div className="pt-actions"><button className="button--cardinal" disabled={action.busy}><Send size={16}/>{action.busy ? 'Posting...' : 'Post to team'}</button></div>
    </form>
    {posts.length ? <ul className="pt-feed" style={{ marginTop: 10 }}>{posts.map(post => <li className="pt-post" key={post.id}>
      <header><strong>{post.authorUserId === me ? 'You' : post.authorName}</strong>{post.officer && <span className="pt-pill">Officer</span>}<span className={`pt-pill ${kindTone(post.kind)}`}>{postKindLabels[post.kind] ?? post.kind}</span><time dateTime={post.createdAt} suppressHydrationWarning>{relativeTime(post.createdAt)}</time></header>
      <p>{post.body}</p>
      {(post.authorUserId === me || isLead) && <footer><button type="button" className="pt-btn pt-btn--small" disabled={action.busy} onClick={() => { if (window.confirm('Delete this post?')) void action.run({ action: 'post-delete', postId: post.id }, 'Post deleted.') }}><Trash2 size={14}/>Delete</button></footer>}
    </li>)}</ul> : <p className="pt-hint" style={{ marginTop: 12 }}>No posts yet. A short weekly note on what you did and what is next keeps everyone moving.</p>}
  </section>
}

export function TeamLinks({ projectId, links, me, isLead, githubUrl, externalUrl }: { projectId: string; links: ProjectWorkspace['links']; me: string; isLead: boolean; githubUrl?: string; externalUrl?: string }) {
  const action = useWorkspaceAction(projectId)
  const [adding, setAdding] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    if (await action.run({ action: 'link-add', label: String(form.get('label') ?? ''), url: String(form.get('url') ?? '') }, 'Link added.')) { formElement.reset(); setAdding(false) }
  }
  const fixed = [githubUrl && { id: 'github', label: 'GitHub repository', url: githubUrl }, externalUrl && { id: 'site', label: 'Project website', url: externalUrl }].filter(Boolean) as { id: string; label: string; url: string }[]
  return <section className="pt-card" aria-labelledby="ws-links">
    <div className="pt-card-head"><h2 id="ws-links">Team links</h2></div>
    <WorkspaceNotice error={action.error} message={action.message}/>
    {fixed.length + links.length ? <ul className="pt-links">
      {fixed.map(link => <li key={link.id}><a href={link.url} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={14}/></a></li>)}
      {links.map(link => <li key={link.id}><a href={link.url} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={14}/></a>{(link.addedBy === me || isLead) && <button type="button" className="pt-btn pt-btn--small" aria-label={`Remove ${link.label}`} disabled={action.busy} onClick={() => void action.run({ action: 'link-remove', linkId: link.id }, 'Link removed.')}><Trash2 size={14}/></button>}</li>)}
    </ul> : <p className="pt-hint" style={{ marginBottom: 12 }}>Keep your shared drive, CAD files, parts list, or code in one place.</p>}
    {adding ? <form className="pt-form" onSubmit={submit}>
      <label>Name<input name="label" required maxLength={120} placeholder="Shared drive folder"/></label>
      <label>Web address<input name="url" type="url" required maxLength={2000} placeholder="https://"/></label>
      <div className="pt-actions"><button className="button--cardinal" disabled={action.busy}>{action.busy ? 'Adding...' : 'Add link'}</button><button type="button" onClick={() => setAdding(false)}>Cancel</button></div>
    </form> : <div className="pt-actions"><button type="button" onClick={() => setAdding(true)}><Plus size={16}/>Add a link</button></div>}
  </section>
}

export function LeaveProject({ projectId, projectTitle, soleLead }: { projectId: string; projectTitle: string; soleLead: boolean }) {
  const action = useWorkspaceAction(projectId)
  async function leave() {
    if (!window.confirm(`Leave "${projectTitle}"? You will lose access to this workspace. Your posts stay for the team.`)) return
    if (await action.run({ action: 'leave' }, 'You left the project.', { refresh: false })) action.router.push('/member/teams')
  }
  return <section className="pt-card" aria-labelledby="ws-leave">
    <h2 id="ws-leave" style={{ fontSize: 16 }}>Leave this project</h2>
    <p className="pt-hint" style={{ margin: '4px 0 12px' }}>{soleLead ? 'You are the only lead. Ask a club officer to appoint another lead before you leave, so the team is not stranded.' : 'If you can no longer take part, let your team know in the feed, then leave.'}</p>
    <WorkspaceNotice error={action.error} message=""/>
    <div className="pt-actions"><button type="button" className="pt-btn--danger" disabled={action.busy || soleLead} onClick={() => void leave()}><LogOut size={16}/>{action.busy ? 'Leaving...' : 'Leave project'}</button></div>
  </section>
}

const reviewLabels: Record<string, string> = { PENDING_REVIEW: 'Waiting for officer review', APPROVED_FOR_PUBLISH: 'Approved for the website', CHANGES_REQUESTED: 'Changes requested', REJECTED: 'Not published' }
export function UpdateHistory({ projectId, updates, me, isLead }: { projectId: string; updates: ProjectWorkspace['updates']; me: string; isLead: boolean }) {
  const [revising, setRevising] = useState('')
  if (!updates.length) return <p className="pt-hint">No website updates submitted yet.</p>
  return <ul className="pt-feed">{updates.map(update => <li className="pt-post" key={update.id}>
    <header><strong>{update.title}</strong><span className={`pt-pill ${update.reviewStatus === 'APPROVED_FOR_PUBLISH' ? 'pt-pill--good' : update.reviewStatus === 'CHANGES_REQUESTED' ? 'pt-pill--warn' : update.reviewStatus === 'REJECTED' ? 'pt-pill--bad' : ''}`}>{update.publicationState === 'published' ? 'Published' : reviewLabels[update.reviewStatus] ?? update.reviewStatus}</span><time dateTime={update.submittedAt} suppressHydrationWarning>{relativeTime(update.submittedAt)}</time></header>
    {update.summary && <p>{update.summary}</p>}
    {update.reviewFeedback && <p><strong>Officer note:</strong> {update.reviewFeedback}</p>}
    {update.reviewStatus === 'CHANGES_REQUESTED' && (update.submittedBy === me || isLead) && (revising === update.id
      ? <ReviseUpdate projectId={projectId} update={update} onDone={() => setRevising('')}/>
      : <footer><button type="button" className="pt-btn pt-btn--small" onClick={() => setRevising(update.id)}>Revise and resubmit</button></footer>)}
  </li>)}</ul>
}

function ReviseUpdate({ projectId, update, onDone }: { projectId: string; update: ProjectWorkspace['updates'][number]; onDone: () => void }) {
  const action = useWorkspaceAction(projectId)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const saved = await action.run({ action: 'resubmit-update', updateId: update.id, title: String(form.get('title') ?? ''), summary: String(form.get('summary') ?? ''), body: String(form.get('body') ?? ''), milestone: String(form.get('milestone') ?? ''), updateDate: String(form.get('updateDate') ?? '') || null }, 'Sent back for officer review.')
    if (saved) onDone()
  }
  return <form className="pt-form" onSubmit={submit}>
    <label>Title<input name="title" required minLength={3} maxLength={180} defaultValue={update.title}/></label>
    <label>Summary<textarea name="summary" rows={3} maxLength={700} defaultValue={update.summary}/></label>
    <label>Full update<textarea name="body" rows={5} maxLength={8000} defaultValue={update.body}/></label>
    <div className="pt-form-row"><label>Milestone label<input name="milestone" maxLength={180} defaultValue={update.milestone}/></label><label>Date<input name="updateDate" type="date" defaultValue={update.updateDate ?? ''}/></label></div>
    <WorkspaceNotice error={action.error} message=""/>
    <div className="pt-actions"><button className="button--cardinal" disabled={action.busy}>{action.busy ? 'Sending...' : 'Resubmit for review'}</button><button type="button" onClick={onDone}>Cancel</button></div>
  </form>
}
