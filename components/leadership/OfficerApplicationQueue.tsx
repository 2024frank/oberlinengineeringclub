'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { OfficerApplication } from '@/lib/leadership/types'
import { applicationLabels, ApplicationStatus, LeadershipDate } from './shared'
import { useLeadershipAction } from './useLeadershipAction'

export function OfficerApplicationQueue({ applications }: { applications: OfficerApplication[] }) {
  const [status, setStatus] = useState('ALL')
  const [role, setRole] = useState('ALL')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [decisions, setDecisions] = useState<Record<string, { source: OfficerApplication; decision: OfficerApplication['status'] }>>({})
  const [message, setMessage] = useState('')
  const { run, busy, error } = useLeadershipAction('/api/admin/officer-applications')
  const keyFor = (application: OfficerApplication) => `${application.positionId}:${application.userId}`
  const statusFor = (application: OfficerApplication) => decisions[keyFor(application)]?.source === application ? decisions[keyFor(application)].decision : application.status
  const roles = Array.from(new Map(applications.map(application => [application.positionId, application])).values())
  const visible = applications.filter(application => (status === 'ALL' || statusFor(application) === status) && (role === 'ALL' || application.positionId === role))

  async function review(application: OfficerApplication, decision: 'SHORTLISTED' | 'NOT_SELECTED') {
    if (busy) return
    setMessage('')
    const key = keyFor(application)
    if (await run({ action: 'review', positionId: application.positionId, userId: application.userId, decision, feedback: drafts[key] ?? application.feedback })) {
      setDecisions(previous => ({ ...previous, [key]: { source: application, decision } }))
      setMessage(`Review saved for ${application.displayName}: ${applicationLabels[decision]}.`)
    }
  }

  return <div className="leadership-queue">
    <div className="leadership-filters">
      <label>Status<select value={status} disabled={busy} onChange={event => setStatus(event.target.value)}><option value="ALL">All statuses</option>{Object.entries(applicationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Role<select value={role} disabled={busy} onChange={event => setRole(event.target.value)}><option value="ALL">All roles</option>{roles.map(application => <option key={application.positionId} value={application.positionId}>{application.roleTitle} - {application.term}</option>)}</select></label>
      <p className="leadership-meta">{visible.length} application{visible.length === 1 ? '' : 's'}</p>
    </div>
    {error && <p className="portal-form-error" role="alert">{error}</p>}
    {message && <p className="leadership-notice" role="status">{message}</p>}
    {!visible.length && <p className="leadership-empty">{applications.length ? 'No applications match these filters.' : 'No officer applications yet.'}</p>}
    {visible.map(application => {
      const key = keyFor(application), currentStatus = statusFor(application)
      return <article className="leadership-review" key={key} aria-label={`${application.displayName} - ${application.roleTitle}`}>
        <header><div><h2>{application.displayName}</h2><p>{application.roleTitle} <span className="leadership-meta">{application.term}</span></p></div><ApplicationStatus status={currentStatus}/></header>
        <p className="leadership-meta">Submitted <LeadershipDate value={application.submittedAt}/>{application.reviewedAt && <>; reviewed <LeadershipDate value={application.reviewedAt}/></>}</p>
        <div className="leadership-review-body"><div><h3>Statement of interest</h3><p className="leadership-copy">{application.statement}</p>{application.experience && <><h3>Relevant experience</h3><p className="leadership-copy">{application.experience}</p></>}</div>
          {currentStatus !== 'WITHDRAWN' ? <div className="leadership-form"><label>Feedback visible to member<textarea rows={4} value={drafts[key] ?? application.feedback} disabled={busy} onChange={event => setDrafts(previous => ({ ...previous, [key]: event.target.value }))}/></label>
            <div className="leadership-actions"><button type="button" className="button button--primary" disabled={busy} onClick={() => review(application, 'SHORTLISTED')}><Check size={17} aria-hidden="true"/>Shortlist</button><button type="button" className="button button--ghost" disabled={busy} onClick={() => review(application, 'NOT_SELECTED')}><X size={17} aria-hidden="true"/>Not selected</button></div>
          </div> : application.feedback && <div className="leadership-feedback"><h3>Feedback</h3><p className="leadership-copy">{application.feedback}</p></div>}
        </div>
      </article>
    })}
  </div>
}
