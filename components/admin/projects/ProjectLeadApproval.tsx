'use client'
import { useId, useState } from 'react'
import { UserCheck } from 'lucide-react'
import { projectLeadApprovalError } from '@/lib/projects/leadApprovalInput'
import { useToast } from '@/components/ui/Toast'

type ProjectChoice = { id: string; title: string }
type Props = {
  source: 'application' | 'submission'; requestId: string; memberName: string; memberEmail?: string;
  projectId?: string; projectTitle?: string; projects?: ProjectChoice[]; initialApproved?: boolean; onApproved?: () => void;
}

export function ProjectLeadApproval({ source, requestId, memberName, memberEmail, projectId, projectTitle = '', projects = [], initialApproved = false, onApproved }: Props) {
  const selectId = useId()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [selected, setSelected] = useState(() => {
    if (projectId) return projectId
    const matches = projects.filter(p => p.title.toLowerCase() === projectTitle.trim().toLowerCase())
    return matches.length === 1 ? matches[0].id : ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [approved, setApproved] = useState(initialApproved)
  const [emailWarning, setEmailWarning] = useState(false)
  const title = source === 'application' ? projectTitle : projects.find(p => p.id === selected)?.title

  async function approve() {
    if (busy || !selected) return
    setBusy(true); setError('')
    try {
      const body = source === 'application' ? { source, requestId } : { source, requestId, projectId: selected }
      const response = await fetch('/api/admin/project-interest/approve-lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) { setError(projectLeadApprovalError(data.error)); return }
      setApproved(true)
      setEmailWarning(!data.emailSent && !data.result.alreadyApproved)
      toast(!data.emailSent && !data.result.alreadyApproved ? 'Project lead appointed. Their in-app notification is available, but the email was not sent.' : 'Project lead appointed. They can open the project under My teams.', !data.emailSent && !data.result.alreadyApproved ? 'error' : 'success')
      onApproved?.()
    } catch { setError('Could not reach the server. Your request is still here; please try again.') }
    finally { setBusy(false) }
  }

  if (approved) return <div className="project-lead-approval" role="status"><strong>Project lead approved.</strong><p>{memberName} can manage this project under My teams.</p>{emailWarning && <p role="alert">The appointment is saved and an in-app notification is available, but the email was not sent.</p>}</div>
  return <div className="project-lead-approval">
    {!confirming ? <button className="button--cardinal" type="button" onClick={() => setConfirming(true)}><UserCheck size={17}/>Approve as project lead</button> : <>
      {source === 'submission' && <label htmlFor={selectId}>Project for {memberName}<select id={selectId} value={selected} disabled={busy} onChange={event => { setSelected(event.target.value); setError('') }}><option value="">Choose a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}
      <p><strong>{memberName}</strong>{memberEmail ? ` (${memberEmail})` : ''} will become a lead{title ? ` of ${title}` : ''}, with access to invite teammates and review applications. Existing leads keep their access.</p>
      <div className="system-actions"><button type="button" className="button--cardinal" disabled={busy || !selected} onClick={() => void approve()}><UserCheck size={17}/>{busy ? 'Approving...' : 'Confirm project lead'}</button><button type="button" disabled={busy} onClick={() => { setConfirming(false); setError('') }}>Cancel</button></div>
      {error && <p className="portal-form-error" role="alert">{error}</p>}
    </>}
  </div>
}
