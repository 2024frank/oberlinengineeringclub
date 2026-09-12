import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { SubmissionInbox } from '@/components/admin/submissions/SubmissionInbox'

vi.mock('@/components/ui/Toast', () => ({ useToast: () => vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const rows = [
  { id: 'new', type: 'join_club', full_name: 'Ada Student', email: 'ada@example.com', payload: { message: 'Interested in robotics' }, status: 'new', created_at: '2026-09-05T12:00:00Z' },
  { id: 'old', type: 'contact', full_name: 'Alex Student', email: 'alex@example.com', payload: {}, status: 'reviewed', created_at: '2026-09-04T12:00:00Z' },
]
it('opens the requested inbox status and lets officers search or recover an empty result', async () => {
  const user = userEvent.setup()
  render(<SubmissionInbox initialRows={rows} initialStatus="new"/>)
  expect(screen.getByText('Ada Student')).toBeInTheDocument()
  expect(screen.queryByText('Alex Student')).not.toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Request status'), '')
  await user.type(screen.getByRole('searchbox'), 'alex')
  expect(screen.getByText('Alex Student')).toBeInTheDocument()
  await user.type(screen.getByRole('searchbox'), ' missing')
  await user.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByText('Ada Student')).toBeInTheDocument()
})
it('keeps the request available and shows a useful error when updating fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  render(<SubmissionInbox initialRows={[rows[0]]}/>)
  await userEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not update')
  expect(screen.getByRole('button', { name: 'Mark reviewed' })).toBeEnabled()
})
it('allows membership approval for leadership interest without implying staff access', () => {
  render(<SubmissionInbox initialRows={[{ ...rows[0], type: 'leadership_interest' }]}/>)
  expect(screen.getByRole('button', { name: 'Approve membership & send email' })).toBeInTheDocument()
  expect(screen.getByText('Membership only. Officer roles are managed separately.')).toBeInTheDocument()
})
it('requires confirmation before approving project interest as a lead', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, emailSent: true, result: { projectTitle: 'Printer repair', alreadyApproved: false } }) })
  vi.stubGlobal('fetch', fetchMock)
  render(<SubmissionInbox initialRows={[{ ...rows[0], type: 'join_project', payload: { project: 'Printer repair' } }]} projects={[{ id: 'project-1', title: 'Printer repair' }]}/>)
  await userEvent.click(screen.getByRole('button', { name: 'Approve as project lead' }))
  expect(fetchMock).not.toHaveBeenCalled()
  expect(screen.getByText(/Existing leads keep their access/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Confirm project lead' }))
  expect(fetchMock).toHaveBeenCalledWith('/api/admin/project-interest/approve-lead', expect.objectContaining({ body: JSON.stringify({ source: 'submission', requestId: 'new', projectId: 'project-1' }) }))
  expect(await screen.findByText('Project lead approved.')).toBeInTheDocument()
})
it('does not guess the project for unmatched interest and keeps failed approvals available', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'ACTIVE_MEMBER_REQUIRED' }) }))
  render(<SubmissionInbox initialRows={[{ ...rows[0], type: 'join_project', payload: { project: 'A printer idea' } }]} projects={[{ id: 'project-1', title: 'Printer repair' }]}/>)
  await userEvent.click(screen.getByRole('button', { name: 'Approve as project lead' }))
  expect(screen.getByRole('button', { name: 'Confirm project lead' })).toBeDisabled()
  await userEvent.selectOptions(screen.getByLabelText('Project for Ada Student'), 'project-1')
  await userEvent.click(screen.getByRole('button', { name: 'Confirm project lead' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('finish setting up an approved membership account')
  expect(screen.getByRole('button', { name: 'Confirm project lead' })).toBeEnabled()
})
