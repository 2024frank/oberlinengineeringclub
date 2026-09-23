'use client'
import Link from 'next/link'
import { useId, useState } from 'react'
import { Crown, UserPlus, X } from 'lucide-react'
import { projectTeamErrorMessage } from '@/lib/projects/teamAdminInput'
import { useToast } from '@/components/ui/Toast'

type ProjectChoice = { id: string; title: string }
type Role = 'MEMBER' | 'LEAD'
type Props = {
  source: 'application' | 'submission'; requestId: string; memberName: string; memberEmail?: string
  projectId?: string; projectTitle?: string; projects?: ProjectChoice[]; initialApproved?: boolean
  onDone?: (outcome: 'MEMBER' | 'LEAD' | 'DECLINED') => void
}

// Approving interest adds a regular team member. Appointing a lead is a separate, confirmed choice.
export function ProjectInterestDecision({ source, requestId, memberName, memberEmail, projectId, projectTitle = '', projects = [], initialApproved = false, onDone }: Props) {
  const selectId = useId()
  const toast = useToast()
  const [selected, setSelected] = useState(() => {
    if (projectId) return projectId
    const matches = projects.filter(p => p.title.toLowerCase() === projectTitle.trim().toLowerCase())
    return matches.length === 1 ? matches[0].id : ''
  })
  const [step, setStep] = useState<'choose' | 'lead' | 'decline'>('choose')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [done, setDone] = useState<null | { outcome: 'MEMBER' | 'LEAD' | 'DECLINED' | 'EARLIER'; projectId?: string; emailWarning: boolean }>(initialApproved ? { outcome: 'EARLIER', emailWarning: false } : null)
  const title = source === 'application' ? projectTitle : projects.find(p => p.id === selected)?.title

  async function approve(role: Role) {
    if (busy || !selected) return
    setBusy(true); setError('')
    try {
      const body = source === 'application' ? { source, requestId, role } : { source, requestId, projectId: selected, role }
      const response = await fetch('/api/admin/project-interest/approve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(projectTeamErrorMessage(data.error ?? '')); return }
      const outcome: Role = data.result?.role === 'LEAD' ? 'LEAD' : 'MEMBER'
      const emailWarning = !data.emailSent && !data.result?.alreadyApproved
      setDone({ outcome, projectId: data.result?.projectId, emailWarning })
      toast(emailWarning ? 'Saved. They have an in-app notice, but the email was not sent.' : outcome === 'LEAD' ? `${memberName} now leads ${title ?? 'the project'}.` : `${memberName} joined the ${title ?? 'project'} team.`, emailWarning ? 'error' : 'success')
      onDone?.(outcome)
    } catch { setError('Could not reach the server. The request is still here; please try again.') }
    finally { setBusy(false) }
  }
  async function decline() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/project-teams', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'decline-application', applicationId: requestId, note }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(projectTeamErrorMessage(data.error ?? '')); return }
      setDone({ outcome: 'DECLINED', emailWarning: false })
      toast('Application declined. The member was notified.')
      onDone?.('DECLINED')
    } catch { setError('Could not reach the server. The application is still here; please try again.') }
    finally { setBusy(false) }
  }

  if (done) return <div className="project-lead-approval" role="status">
    <strong>{done.outcome === 'DECLINED' ? 'Application declined.' : done.outcome === 'LEAD' ? 'Appointed as project lead.' : done.outcome === 'EARLIER' ? 'This request was already approved.' : 'Added to the project team.'}</strong>
    {(done.outcome === 'MEMBER' || done.outcome === 'LEAD') && <p>{memberName} can open this project under My teams.{done.projectId && <> <Link className="portal-text-link" href={`/admin/project-teams/${done.projectId}`}>Manage team</Link></>}</p>}
    {done.emailWarning && <p role="alert">Saved, and an in-app notification is waiting for them, but the email was not sent.</p>}
  </div>
  return <div className="project-lead-approval">
    {source === 'submission' && <label htmlFor={selectId}>Project for {memberName}<select id={selectId} value={selected} disabled={busy} onChange={event => { setSelected(event.target.value); setError('') }}><option value="">Choose a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}
    {step === 'choose' && <div className="system-actions">
      <button type="button" className="button--cardinal" disabled={busy || !selected} onClick={() => void approve('MEMBER')}><UserPlus size={17}/>{busy ? 'Adding...' : 'Add to team'}</button>
      <button type="button" disabled={busy || !selected} onClick={() => { setStep('lead'); setError('') }}><Crown size={17}/>Make lead</button>
      {source === 'application' && <button type="button" disabled={busy} onClick={() => { setStep('decline'); setError('') }}><X size={17}/>Decline</button>}
    </div>}
    {step === 'lead' && <>
      <p><strong>{memberName}</strong>{memberEmail ? ` (${memberEmail})` : ''} will lead {title ?? 'this project'}: they can invite teammates, review applications, and plan milestones. Existing leads keep their access. Most people who ask to join should be added as team members instead.</p>
      <div className="system-actions"><button type="button" className="button--cardinal" disabled={busy || !selected} onClick={() => void approve('LEAD')}><Crown size={17}/>{busy ? 'Saving...' : 'Confirm lead'}</button><button type="button" disabled={busy} onClick={() => setStep('choose')}>Cancel</button></div>
    </>}
    {step === 'decline' && <>
      <label>Note to {memberName} <small>Optional, included in their email</small><textarea rows={2} maxLength={1000} value={note} onChange={event => setNote(event.target.value)}/></label>
      <div className="system-actions"><button type="button" className="button--cardinal" disabled={busy} onClick={() => void decline()}>{busy ? 'Declining...' : 'Decline application'}</button><button type="button" disabled={busy} onClick={() => setStep('choose')}>Cancel</button></div>
    </>}
    {error && <p className="portal-form-error" role="alert">{error}</p>}
  </div>
}
