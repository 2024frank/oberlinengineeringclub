'use client'
import { formatPortalDate } from '@/lib/format/portalDate'
import { useState } from 'react'
import { Archive, Check, Mail, Search } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'
export type SubmissionRow = { id: string; type: string; full_name: string; email: string; payload: Record<string, unknown>; status: string; created_at: string }
function approveErrorMessage(code: string) {
  if (code === 'OBERLIN_EMAIL_REQUIRED') return 'An @oberlin.edu email is required to start member sign-up.'
  if (code.startsWith('ALREADY_MEMBER')) return 'This person is already an approved member.'
  if (code.startsWith('MEMBERSHIP_REQUEST_BLOCKED')) return 'This person has a rejected or suspended request. Check Member requests.'
  return 'Could not start membership. Please try again.'
}
export function SubmissionInbox({ initialRows, initialStatus = '' }: { initialRows: SubmissionRow[]; initialStatus?: string }) {
  const [rows, setRows] = useState(initialRows), [busyId, setBusyId] = useState('')
  const [query, setQuery] = useState(''), [status, setFilter] = useState(initialStatus), [error, setError] = useState('')
  const toast = useToast()
  const visible = rows.filter(row => (!status || row.status === status) && [row.full_name, row.email, row.type.replaceAll('_', ' ')].some(value => value.toLowerCase().includes(query.trim().toLowerCase())))
  async function update(id: string, nextStatus: string, membership = false) {
    if (busyId) return
    setBusyId(id); setError('')
    try {
      const response = await fetch(membership ? '/api/admin/submissions/approve-membership' : '/api/admin/submissions', { method: membership ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(membership ? { id } : { id, status: nextStatus }) })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = membership ? approveErrorMessage(body.error ?? '') : 'Could not update this request. Please try again.'
        setError(message); toast(message, 'error'); return
      }
      const body = await response.json()
      setRows(previous => previous.map(row => row.id === id ? { ...row, status: nextStatus } : row))
      if (membership && !body.emailSent && !body.skipped) {
        setError('Membership approval is saved, but the email was not sent. Open Members to resend it.')
      } else toast(membership ? body.skipped ? 'This member already has an active account.' : 'Membership approved and setup email sent. They are now listed in Members.' : nextStatus === 'archived' ? 'Request archived.' : 'Marked as reviewed.')
    } catch {
      const message = 'Could not update this request. Check your connection and try again.'
      setError(message); toast(message, 'error')
    } finally { setBusyId('') }
  }
  return <>
    <div className="portal-inbox-filters"><div className="content-search"><label><Search size={18}/><input type="search" aria-label="Search requests" placeholder="Search by name or email" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="Request status" value={status} onChange={event => setFilter(event.target.value)}><option value="">All requests</option>{['new', 'reviewed', 'approved', 'archived'].map(value => <option value={value} key={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select><span role="status">{visible.length} shown</span></div></div>
    {error && <p className="portal-form-error" role="alert">{error}</p>}
    <div className="submission-inbox">{visible.map(row => <article key={row.id}><header><div><span className="status-pill">{row.status === 'new' ? 'New request' : row.status[0].toUpperCase() + row.status.slice(1)}</span><strong>{row.full_name}</strong><a href={`mailto:${row.email}`}>{row.email}</a></div><time dateTime={row.created_at}>{formatPortalDate(row.created_at)}</time></header><p className="eyebrow">{row.type.replaceAll('_', ' ')}</p><details open={row.status === 'new'}><summary>Request details</summary><dl>{Object.entries(row.payload ?? {}).filter(([, value]) => String(value ?? '').trim()).map(([key, value]) => <div key={key}><dt>{key.replaceAll(/([A-Z])/g, ' $1').replaceAll('_', ' ')}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl></details><footer>
      {['join_club', 'leadership_interest'].includes(row.type) && !['approved', 'archived'].includes(row.status) && <button className="button--cardinal" disabled={Boolean(busyId)} onClick={() => void update(row.id, 'approved', true)}><Mail size={16}/>{busyId === row.id ? 'Updating...' : 'Approve membership & send email'}</button>}
      {['join_club', 'leadership_interest'].includes(row.type) && row.status === 'approved' && <Link className="button button--ghost" href="/admin/members">View member & email status</Link>}
      {row.type === 'leadership_interest' && row.status !== 'archived' && <span className="member-list-muted">Membership only. Officer roles are managed separately.</span>}
      {row.status === 'new' && <button disabled={Boolean(busyId)} onClick={() => void update(row.id, 'reviewed')}><Check size={16}/>Mark reviewed</button>}
      {row.status !== 'archived' && <button disabled={Boolean(busyId)} onClick={() => void update(row.id, 'archived')}><Archive size={16}/>Archive</button>}
    </footer></article>)}</div>
    {!visible.length && <div className="portal-empty"><div><h2>{rows.length ? 'No matching requests' : 'No requests yet'}</h2>{(query || status) && <button className="button button--ghost" onClick={() => { setQuery(''); setFilter('') }}>Clear filters</button>}</div></div>}
  </>
}
