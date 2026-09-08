'use client'

import { useState } from 'react'
import { Check, Mail, Plus, RefreshCw, Search, X } from 'lucide-react'
import type { MembershipRequestSummary } from '@/lib/auth/memberServer'
import { memberStatusLabel, membershipErrorMessage, parseMemberEmails } from '@/lib/members/invitations'
import { formatPortalDate } from '@/lib/format/portalDate'
import { useFormReady } from '@/components/member/useFormReady'

type Filter = 'all' | 'review' | 'setup' | 'active' | 'inactive'
type BatchResult = { email: string; outcome: 'sent' | 'failed' | 'already_active'; error?: string }
const needsApproval = (row: MembershipRequestSummary) => row.status === 'PENDING_APPROVAL' || (['REQUESTED', 'EMAIL_VERIFIED'].includes(row.status) && !row.preapprovedAt)

export function MemberApplicationQueue({ initial, initialFilter = 'review' }: { initial: MembershipRequestSummary[]; initialFilter?: Filter }) {
  const [rows, setRows] = useState(initial)
  const [busy, setBusy] = useState('')
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [emails, setEmails] = useState('')
  const [recipients, setRecipients] = useState<string[]>([])
  const [results, setResults] = useState<BatchResult[]>([])
  const ready = useFormReady()
  const groups: Record<Filter, MembershipRequestSummary[]> = {
    all: rows,
    review: rows.filter(needsApproval),
    setup: rows.filter(row => row.status === 'APPROVED' || (['REQUESTED', 'EMAIL_VERIFIED'].includes(row.status) && row.preapprovedAt)),
    active: rows.filter(row => row.status === 'ACTIVE'),
    inactive: rows.filter(row => ['REJECTED', 'SUSPENDED'].includes(row.status)),
  }
  const visible = groups[filter].filter(row => `${row.displayName} ${row.email}`.toLowerCase().includes(query.trim().toLowerCase()))

  async function refresh() {
    setBusy('refresh'); setError('')
    try {
      const response = await fetch('/api/admin/members?status=ALL', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      setRows((await response.json()).requests)
    } catch { setError('Could not refresh members. Check your connection and try again.') }
    finally { setBusy('') }
  }

  async function act(row: MembershipRequestSummary, action: 'APPROVE' | 'REJECT' | 'resend', note = '') {
    if (busy) return
    setBusy(row.id); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/members', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: row.id, ...(action === 'resend' ? { action } : { decision: action, note }) }) })
      const body = await response.json()
      if (!response.ok) { setError(membershipErrorMessage(body.error ?? '')); return }
      setRows(body.requests)
      if (!body.result.emailSent && !body.result.skipped) setError('The change is saved, but the email was not sent. Use Resend email to try again.')
      else setNotice(action === 'resend' ? `Setup email sent to ${row.email}.` : action === 'REJECT' ? `${row.displayName}'s request was declined.` : `Membership approved for ${row.displayName}.${body.result.skipped ? ' Their account is already active.' : ' Setup email sent.'}`)
    } catch { setError('Could not confirm the result. Refresh the list before retrying; the change may already be saved.') }
    finally { setBusy('') }
  }

  async function sendInvitations() {
    if (busy) return
    setBusy('batch'); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/members', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ emails: recipients.join(',') }) })
      const body = await response.json()
      if (!response.ok) { setError(body.error ?? 'Could not add members.'); return }
      setResults(body.results); setRows(body.requests); setRecipients([]); setEmails(''); setFilter('all')
    } catch { setError('Could not confirm every invitation. Refresh members before retrying; some invitations may already have been sent.') }
    finally { setBusy('') }
  }

  return <>
    <div className="member-list-toolbar"><div className="member-list-tabs" aria-label="Membership status">
      {([['all', 'Everyone'], ['review', 'Needs approval'], ['setup', 'Finishing setup'], ['active', 'Active'], ['inactive', 'Inactive']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<span>{groups[key].length}</span></button>)}
    </div><button className="button button--cardinal" disabled={Boolean(busy)} onClick={() => { setAdding(true); setResults([]) }}><Plus size={17}/>Add members</button></div>
    {adding && <section className="member-invite-panel" aria-labelledby="member-invite-title">
      <div className="member-invite-heading"><h2 id="member-invite-title">Add members</h2><button type="button" aria-label="Close invitations" title="Close invitations" disabled={Boolean(busy)} onClick={() => { setAdding(false); setRecipients([]); setResults([]) }}><X size={18}/></button></div>
      {!recipients.length && !results.length && <form onSubmit={event => { event.preventDefault(); setError(''); try { setRecipients(parseMemberEmails(emails)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the email addresses.') } }}>
        <fieldset disabled={!ready || Boolean(busy)}><label htmlFor="member-invite-emails">Oberlin email addresses</label><textarea id="member-invite-emails" value={emails} onChange={event => setEmails(event.target.value)} rows={3} placeholder="name@oberlin.edu, another@oberlin.edu" required/><p className="member-list-muted">Up to 25 addresses, separated by commas or new lines.</p><button type="submit" className="button button--cardinal">Review invitations</button></fieldset>
      </form>}
      {recipients.length > 0 && <div><h3>Approve {recipients.length} {recipients.length === 1 ? 'member' : 'members'}</h3><ul className="member-recipient-list">{recipients.map(email => <li key={email}>{email}</li>)}</ul><p>Each person receives their own setup email. They must verify their Oberlin address before they can enter the member portal. No officer access is granted.</p><div className="system-actions"><button className="button--cardinal" disabled={Boolean(busy)} onClick={() => void sendInvitations()}><Mail size={16}/>{busy === 'batch' ? 'Sending invitations...' : `Approve & email ${recipients.length} ${recipients.length === 1 ? 'member' : 'members'}`}</button><button disabled={Boolean(busy)} onClick={() => setRecipients([])}>Edit recipients</button></div></div>}
      {results.length > 0 && <div role="status"><ul className="member-batch-results">{results.map(result => <li key={result.email}><span>{result.email}</span><strong>{result.outcome === 'sent' ? 'Email sent' : result.outcome === 'already_active' ? 'Already active; no email sent' : 'Not sent'}</strong>{result.error && <p>{membershipErrorMessage(result.error)}</p>}</li>)}</ul><button onClick={() => setResults([])}>Add more members</button></div>}
    </section>}
    {error && <p className="portal-form-error" role="alert">{error}</p>}
    {notice && <p className="portal-form-success" role="status">{notice}</p>}
    <div className="member-list-search"><label><Search size={18}/><input type="search" aria-label="Search members" placeholder="Search name or email" value={query} onChange={event => setQuery(event.target.value)}/></label><span>{visible.length} shown</span><button disabled={Boolean(busy)} onClick={() => void refresh()} aria-label="Refresh members" title="Refresh members"><RefreshCw size={17}/></button></div>
    <div className="member-review-list">{visible.map(row => <MemberReviewRow key={row.id} row={row} busy={Boolean(busy)} onAction={act}/>)}</div>
    {!visible.length && <div className="portal-empty"><div><h2>{filter === 'review' ? 'No members need approval' : 'No members in this view'}</h2>{(filter !== 'all' || query) && <button onClick={() => { setFilter('all'); setQuery('') }}>Show everyone</button>}</div></div>}
  </>
}

function MemberReviewRow({ row, busy, onAction }: { row: MembershipRequestSummary; busy: boolean; onAction: (row: MembershipRequestSummary, action: 'APPROVE' | 'REJECT' | 'resend', note?: string) => Promise<void> }) {
  const [declining, setDeclining] = useState(false)
  const [note, setNote] = useState('')
  const blocked = ['REJECTED', 'SUSPENDED'].includes(row.status)
  return <article className="member-review-row">
    <div className="member-review-identity"><h2>{row.displayName}</h2><a href={`mailto:${row.email}`}>{row.email}</a><p className="member-list-muted">Added {formatPortalDate(row.createdAt)}{row.emailVerifiedAt ? ' · Email verified' : ' · Email not yet verified'}</p></div>
    <div className="member-review-state"><span className={`status-pill member-state--${row.status.toLowerCase()}`}>{memberStatusLabel(row)}</span><p className={row.lastEmailError ? 'member-email-failed' : 'member-list-muted'}>{row.lastEmailError ? 'Last email attempt failed' : row.lastEmailSentAt ? `Last email sent ${formatPortalDate(row.lastEmailSentAt)}` : 'No email send recorded'}</p></div>
    <div className="member-review-actions">
      {needsApproval(row) && <button className="button--cardinal" disabled={busy} onClick={() => void onAction(row, 'APPROVE')}><Check size={16}/>Approve & send email</button>}
      {!needsApproval(row) && !blocked && <button disabled={busy} onClick={() => void onAction(row, 'resend')}><Mail size={16}/>{row.status === 'ACTIVE' ? 'Send sign-in email' : 'Resend setup email'}</button>}
      {row.status === 'PENDING_APPROVAL' && <button disabled={busy} onClick={() => setDeclining(!declining)}>Decline</button>}
    </div>
    {declining && <div className="member-decline"><label>Reason (optional)<textarea value={note} onChange={event => setNote(event.target.value)} rows={2}/></label><div className="system-actions"><button disabled={busy} onClick={() => void onAction(row, 'REJECT', note)}>Decline & email member</button><button onClick={() => setDeclining(false)}>Cancel</button></div></div>}
  </article>
}
