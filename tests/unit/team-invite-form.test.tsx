import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { TeamInviteForm } from '@/components/member/ProjectWorkspaceActions'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('reports a successful invitation and resets the form after the asynchronous response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }))
  render(<TeamInviteForm projectId="printer" roster={[]} members={[{ userId: 'ada', displayName: 'Ada', skills: [], disciplines: [], projectInterests: [] }]}/>)
  await userEvent.selectOptions(screen.getByLabelText('Member'), 'ada')
  await userEvent.type(screen.getByLabelText('Message'), 'Join the printer team')
  await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Invitation sent. The member must accept before joining.')
  expect(screen.getByLabelText('Message')).toHaveValue('')
})
