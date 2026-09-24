'use client'
import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { ActionNotice, useProjectTeamAction } from './useProjectTeamAction'

// Permanent delete from the project editor. Uses the same confirmed action as Project teams.
export function ProjectDeleteForm({ projectId, title, members = 0, onDeleted }: { projectId: string; title: string; members?: number; onDeleted: () => void }) {
  const remove = useProjectTeamAction()
  const [confirming, setConfirming] = useState(false), [typed, setTyped] = useState('')
  const matches = typed.trim().toLowerCase() === title.trim().toLowerCase()
  async function destroy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await remove.run({ action: 'delete', projectId, confirmTitle: typed }, () => 'Project deleted.')) onDeleted()
  }
  return <section className="project-delete" aria-label="Delete project">
    {!confirming ? <div className="pt-actions"><button type="button" className="pt-btn--danger" onClick={() => setConfirming(true)}><Trash2 size={16}/>Delete project</button></div>
      : <form className="pt-form" onSubmit={destroy}>
        {members > 0 && <p className="portal-form-error" role="alert"><strong>{members} {members === 1 ? 'member is' : 'members are'} on this team right now.</strong> Deleting removes them from the project and they lose its team page, milestones and feed.</p>}
        <p className="pt-hint"><strong>This permanently deletes the project, its team roster, applications, milestones, team feed, links and published updates.</strong> It cannot be undone.</p>
        <label>Type <strong>{title}</strong> to confirm<input value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off"/></label>
        <ActionNotice error={remove.error} message={remove.message}/>
        <div className="pt-actions"><button className="pt-btn--danger" disabled={!matches || remove.busy}><Trash2 size={16}/>{remove.busy ? 'Deleting...' : 'Delete permanently'}</button><button type="button" disabled={remove.busy} onClick={() => { setConfirming(false); setTyped('') }}>Cancel</button></div>
      </form>}
  </section>
}
