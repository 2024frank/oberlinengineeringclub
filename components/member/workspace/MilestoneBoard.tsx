'use client'
import { useState, type FormEvent } from 'react'
import { Hand, Pencil, Plus, Trash2 } from 'lucide-react'
import type { MilestoneStatus, ProjectWorkspace } from '@/lib/projects/workspace'
import { formatDueDate, isOverdue, milestoneStatusLabels } from '@/lib/projects/labels'
import { useWorkspaceAction, WorkspaceNotice } from './useWorkspaceAction'

type Milestone = ProjectWorkspace['milestones'][number]
type Roster = ProjectWorkspace['roster']
const statuses = Object.keys(milestoneStatusLabels) as MilestoneStatus[]

export function MilestoneBoard({ projectId, milestones, roster, me, isLead }: { projectId: string; milestones: Milestone[]; roster: Roster; me: string; isLead: boolean }) {
  const action = useWorkspaceAction(projectId)
  const [editing, setEditing] = useState(''), [adding, setAdding] = useState(false)
  const done = milestones.filter(m => m.status === 'DONE').length
  const mine = milestones.filter(m => m.assigneeUserId === me && m.status !== 'DONE').length
  function setStatus(milestone: Milestone, status: MilestoneStatus) {
    void action.run({ action: 'milestone-status', milestoneId: milestone.id, status }, status === 'DONE' ? `Nice work. "${milestone.title}" is done and your team was notified.` : `"${milestone.title}" moved to ${milestoneStatusLabels[status].toLowerCase()}.`)
  }
  function remove(milestone: Milestone) {
    if (window.confirm(`Delete the milestone "${milestone.title}"?`)) void action.run({ action: 'milestone-delete', milestoneId: milestone.id }, 'Milestone deleted.')
  }
  return <section className="pt-card" aria-labelledby="ws-milestones">
    <div className="pt-card-head"><h2 id="ws-milestones">Milestones</h2>{milestones.length > 0 && <span className="portal-muted">{done} of {milestones.length} done{mine ? ` · ${mine} yours` : ''}</span>}</div>
    {milestones.length > 0 && <div className="pt-progress" style={{ marginBottom: 12 }}><div className="pt-progress__bar" role="img" aria-label={`${done} of ${milestones.length} milestones done`}><span style={{ width: `${Math.round(done / milestones.length * 100)}%` }}/></div></div>}
    <WorkspaceNotice error={action.error} message={action.message}/>
    {milestones.length ? <ul className="pt-milestones">{milestones.map(milestone => {
      const overdue = isOverdue(milestone.dueDate, milestone.status)
      const canHandBack = milestone.assigneeUserId === me || (isLead && milestone.assigneeUserId)
      return <li key={milestone.id} className={`pt-milestone ${milestone.status === 'DONE' ? 'pt-milestone--done' : ''}`}>
        <div>
          <h3>{milestone.title}</h3>
          {milestone.description && <p>{milestone.description}</p>}
          <div className="pt-meta">
            <span>{milestone.assigneeUserId === me ? 'You own this' : milestone.assigneeName ? `Owner: ${milestone.assigneeName}` : 'No owner yet'}</span>
            {milestone.dueDate && <span className={overdue ? 'pt-overdue' : ''}>{overdue ? 'Overdue: ' : 'Due '}{formatDueDate(milestone.dueDate)}</span>}
          </div>
        </div>
        <div className="pt-milestone-controls pt-actions">
          <select aria-label={`Status of ${milestone.title}`} value={milestone.status} disabled={action.busy} onChange={event => setStatus(milestone, event.target.value as MilestoneStatus)}>{statuses.map(status => <option key={status} value={status}>{milestoneStatusLabels[status]}</option>)}</select>
          {!milestone.assigneeUserId && milestone.status !== 'DONE' && <button type="button" className="pt-btn--small" disabled={action.busy} onClick={() => void action.run({ action: 'milestone-claim', milestoneId: milestone.id, claim: true }, `You took "${milestone.title}".`)}><Hand size={14}/>I&apos;ll take it</button>}
          {canHandBack && milestone.status !== 'DONE' && <button type="button" className="pt-btn--small" disabled={action.busy} onClick={() => void action.run({ action: 'milestone-claim', milestoneId: milestone.id, claim: false }, 'Owner cleared.')}>Hand back</button>}
          {isLead && <button type="button" className="pt-btn--small" aria-label={`Edit ${milestone.title}`} onClick={() => setEditing(editing === milestone.id ? '' : milestone.id)}><Pencil size={14}/>Edit</button>}
          {isLead && <button type="button" className="pt-btn--small pt-btn--danger" aria-label={`Delete ${milestone.title}`} disabled={action.busy} onClick={() => remove(milestone)}><Trash2 size={14}/></button>}
        </div>
        {isLead && editing === milestone.id && <div className="pt-milestone-edit"><MilestoneForm projectId={projectId} roster={roster} milestone={milestone} onDone={() => setEditing('')}/></div>}
      </li>
    })}</ul> : <p className="pt-hint">{isLead ? 'Break the project into a few concrete steps so everyone knows what to pick up.' : 'Your project lead has not added milestones yet. Ask in the team feed what you can start on.'}</p>}
    {isLead && (adding ? <div style={{ marginTop: 16 }}><MilestoneForm projectId={projectId} roster={roster} onDone={() => setAdding(false)}/></div>
      : <div className="pt-actions" style={{ marginTop: 14 }}><button type="button" onClick={() => setAdding(true)}><Plus size={16}/>Add a milestone</button></div>)}
  </section>
}

function MilestoneForm({ projectId, roster, milestone, onDone }: { projectId: string; roster: Roster; milestone?: Milestone; onDone: () => void }) {
  const action = useWorkspaceAction(projectId)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const saved = await action.run({
      action: 'milestone', id: milestone?.id ?? null, title: String(form.get('title') ?? ''), description: String(form.get('description') ?? ''),
      status: (String(form.get('status') ?? 'TODO') as MilestoneStatus), dueDate: String(form.get('dueDate') ?? '') || null,
      sortOrder: milestone?.sortOrder ?? 100, assigneeUserId: String(form.get('assigneeUserId') ?? '') || null,
    }, milestone ? 'Milestone saved.' : 'Milestone added.')
    if (saved) onDone()
  }
  return <form className="pt-form" onSubmit={submit}>
    <label>Milestone<input name="title" required minLength={2} maxLength={160} defaultValue={milestone?.title} placeholder="Order parts, first prototype, test run..."/></label>
    <div className="pt-form-row">
      <label>Owner<select name="assigneeUserId" defaultValue={milestone?.assigneeUserId ?? ''}><option value="">No owner yet</option>{roster.map(person => <option key={person.userId} value={person.userId}>{person.displayName}</option>)}</select></label>
      <label>Due date<input name="dueDate" type="date" defaultValue={milestone?.dueDate ?? ''}/></label>
      <label>Status<select name="status" defaultValue={milestone?.status ?? 'TODO'}>{statuses.map(status => <option key={status} value={status}>{milestoneStatusLabels[status]}</option>)}</select></label>
    </div>
    <label>Details <small>Optional</small><textarea name="description" rows={2} maxLength={2000} defaultValue={milestone?.description}/></label>
    <WorkspaceNotice error={action.error} message=""/>
    <div className="pt-actions"><button className="button--cardinal" disabled={action.busy}>{action.busy ? 'Saving...' : milestone ? 'Save milestone' : 'Add milestone'}</button><button type="button" onClick={onDone}>Cancel</button></div>
  </form>
}
