'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Send, Undo2 } from 'lucide-react'
import type { OfficerApplication, OfficerPosition } from '@/lib/leadership/types'
import { OfficerPositions } from './OfficerPositions'
import { ApplicationStatus, isPositionOpen, LeadershipDate, memberPositionHref } from './shared'
import { useLeadershipAction } from './useLeadershipAction'

function ApplicationForm({ position, application }: { position: OfficerPosition; application?: OfficerApplication }) {
  const [statement, setStatement] = useState(application?.statement ?? '')
  const [experience, setExperience] = useState(application?.experience ?? '')
  const [validation, setValidation] = useState('')
  const [saved, setSaved] = useState<'applied' | 'withdrawn' | null>(null)
  const { run, busy, error } = useLeadershipAction('/api/member/leadership')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || saved) return
    if (!isPositionOpen(position)) { setValidation('This position is no longer accepting applications.'); return }
    if (statement.trim().length < 20 || statement.length > 3000) {
      setValidation('Your statement must be between 20 and 3,000 characters.'); return
    }
    if (experience.length > 2000) { setValidation('Relevant experience must be 2,000 characters or fewer.'); return }
    setValidation('')
    if (await run({ action: 'apply', positionId: position.id, statement: statement.trim(), experience: experience.trim() })) setSaved('applied')
  }

  if (saved) return <div className="leadership-notice"><p role="status">{saved === 'withdrawn' ? 'Application withdrawn.' : 'Application saved.'}</p><Link className="portal-text-link" href="/member/leadership">My applications<ArrowRight size={17} aria-hidden="true"/></Link></div>
  return <form className="leadership-form" onSubmit={submit} noValidate aria-label={`Application for ${position.roleTitle}`}>
    <fieldset disabled={busy}>
      <label>Statement of interest<textarea name="statement" rows={6} required minLength={20} maxLength={3000} value={statement} onChange={event => setStatement(event.target.value)}/></label>
      <label>Relevant experience<textarea name="experience" rows={4} maxLength={2000} value={experience} onChange={event => setExperience(event.target.value)}/></label>
      {(validation || error) && <p className="portal-form-error" role="alert">{validation || error}</p>}
      <div className="leadership-actions"><button className="button button--primary" type="submit" disabled={busy}><Send size={17} aria-hidden="true"/>{busy ? 'Saving...' : application?.status === 'WITHDRAWN' ? 'Resubmit application' : application ? 'Save changes' : 'Submit application'}</button>
        {application?.status === 'PENDING' && <button type="button" className="button button--ghost" disabled={busy} onClick={async () => { setValidation(''); if (await run({ action: 'withdraw', positionId: position.id })) setSaved('withdrawn') }}><Undo2 size={17} aria-hidden="true"/>Withdraw application</button>}
      </div>
    </fieldset>
  </form>
}

function MemberApplication({ application, open, editing }: { application: OfficerApplication; open: boolean; editing: boolean }) {
  const [withdrawn, setWithdrawn] = useState(false)
  const { run, busy, error } = useLeadershipAction('/api/member/leadership')
  const status = withdrawn ? 'WITHDRAWN' : application.status
  const canWithdraw = !editing && (status === 'PENDING' || status === 'SHORTLISTED')
  const canEdit = !editing && open && application.reviewedAt === null && (status === 'PENDING' || status === 'WITHDRAWN')
  return <article className="leadership-application" aria-label={`${application.roleTitle} application`}>
    <header><div><h3>{application.roleTitle}</h3><p className="leadership-meta">{application.term}</p></div><ApplicationStatus status={status}/></header>
    <p className="leadership-meta">Submitted <LeadershipDate value={application.submittedAt}/></p>
    <h4>Statement of interest</h4><p className="leadership-copy">{application.statement}</p>
    {application.experience && <><h4>Relevant experience</h4><p className="leadership-copy">{application.experience}</p></>}
    {application.feedback && <div className="leadership-feedback"><h4>Feedback</h4><p className="leadership-copy">{application.feedback}</p>{application.reviewedAt && <p className="leadership-meta">Reviewed <LeadershipDate value={application.reviewedAt}/></p>}</div>}
    <div className="leadership-actions">
      {canEdit && !busy && <Link className="portal-text-link" href={memberPositionHref(application.positionId)}>{status === 'WITHDRAWN' ? 'Resubmit application' : 'Edit application'}<ArrowRight size={17} aria-hidden="true"/></Link>}
      {canWithdraw && <button type="button" className="button button--ghost" disabled={busy} onClick={async () => { if (await run({ action: 'withdraw', positionId: application.positionId })) setWithdrawn(true) }}><Undo2 size={17} aria-hidden="true"/>{busy ? 'Withdrawing...' : 'Withdraw application'}</button>}
    </div>
    {error && <p className="portal-form-error" role="alert">{error}</p>}
    {withdrawn && <p role="status">Application withdrawn.</p>}
  </article>
}

export function MemberOfficerOpenings({ positions, applications, positionId }: { positions: OfficerPosition[]; applications: OfficerApplication[]; positionId?: string }) {
  const openPositions = positions.filter(isPositionOpen)
  const selected = openPositions.find(position => position.id === positionId)
  const existing = applications.find(application => application.positionId === positionId)
  const canEdit = Boolean(selected && (!existing || (existing.reviewedAt === null && (existing.status === 'PENDING' || existing.status === 'WITHDRAWN'))))
  return <div className="leadership-workspace">
    {positionId && <Link className="portal-text-link" href="/member/leadership"><ArrowLeft size={17} aria-hidden="true"/>All open positions</Link>}
    {positionId && !selected && <p className="leadership-notice">This position is no longer accepting applications.</p>}
    {selected && <section className="leadership-selected" aria-label={selected.roleTitle}>
      <h2>{existing ? `Application for ${selected.roleTitle}` : `Apply for ${selected.roleTitle}`}</h2>
      <p className="leadership-meta">{selected.term}</p><p className="leadership-copy">{selected.bio}</p>
      {selected.closesAt && <p className="leadership-deadline">Apply by <LeadershipDate value={selected.closesAt}/></p>}
      {canEdit && <ApplicationForm key={`${selected.id}:${existing?.status ?? 'new'}:${existing?.submittedAt ?? ''}`} position={selected} application={existing}/>}
    </section>}
    {!positionId && <OfficerPositions positions={openPositions} signedIn/>}
    <section className="leadership-history" aria-labelledby="officer-application-history"><h2 id="officer-application-history">My applications</h2>
      {applications.length ? applications.map(application => <MemberApplication key={`${application.positionId}:${application.status}:${application.submittedAt}`} application={application} open={openPositions.some(position => position.id === application.positionId)} editing={canEdit && application.positionId === positionId}/>) : <p className="leadership-empty">No officer applications yet.</p>}
    </section>
  </div>
}
