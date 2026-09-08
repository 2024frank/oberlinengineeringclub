import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, expect, it } from 'vitest'
import { ProjectForm } from '@/components/admin/content/ProjectForm'
import { EventForm } from '@/components/admin/content/EventForm'
import { formRegistry } from '@/components/admin/content/formRegistry'
import type { ContentEntityType } from '@/lib/cms/contentDrafts'
import type { MediaAsset } from '@/lib/cms/media'

afterEach(cleanup)
const media: MediaAsset = {
  id: '00000000-0000-4000-8000-000000000001', fileName: 'workbench.jpg',
  storagePath: 'workbench.jpg', publicUrl: '/workbench.jpg', mimeType: 'image/jpeg',
  sizeBytes: 1024, altText: 'Club workbench', caption: '', tags: [], width: 800, height: 600,
  protected: false, contentHash: null, sourceType: 'original', rightsNote: null,
  focalX: null, focalY: null, visualQaApproved: false
}
function ContentEditor({ type }: { type: ContentEntityType }) {
  const [value, setValue] = useState<Record<string, unknown>>({ coverMediaId: null })
  const Form = formRegistry[type]
  return <><Form value={value} mediaAssets={[media, { ...media, id: 'unapproved', fileName: 'generated.jpg', sourceType: 'generated' }]} onChange={(name, next) => setValue(old => ({ ...old, [name]: next }))}/><output>{JSON.stringify(value)}</output></>
}
it.each(['projects', 'events', 'news_posts'] as const)('selects and clears %s cover media while blocking unapproved generated images', async type => {
  const user = userEvent.setup()
  render(<ContentEditor type={type}/>)
  expect(screen.getByRole('button', { name: /generated\.jpg/ })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: /workbench\.jpg/ }))
  expect(JSON.parse(screen.getByRole('status').textContent!)).toMatchObject({ coverMediaId: media.id })
  await user.click(screen.getByRole('button', { name: 'Clear selection' }))
  expect(JSON.parse(screen.getByRole('status').textContent!)).toMatchObject({ coverMediaId: null })
})
it('updates project difficulty in the editor payload', async () => {
  const user = userEvent.setup()
  render(<ContentEditor type="projects"/>)
  await user.selectOptions(screen.getByLabelText('Difficulty'), 'Advanced')
  expect(JSON.parse(screen.getByRole('status').textContent!)).toMatchObject({ difficulty: 'Advanced' })
})
function Editor({ initial, autoSlug }: { initial: Record<string, unknown>; autoSlug: boolean }) {
  const [value, setValue] = useState(initial)
  return <ProjectForm value={value} autoSlug={autoSlug} onChange={(name, next) => setValue(old => ({ ...old, [name]: next }))}/>
}
it('generates a page address for a new project without making the officer type one', async () => {
  const user = userEvent.setup()
  render(<Editor initial={{ title: '', slug: '' }} autoSlug/>)
  await user.type(screen.getByLabelText('Title'), 'Robot Arm Build')
  await user.click(screen.getByText('More project details'))
  expect(screen.getByLabelText('Page address')).toHaveValue('robot-arm-build')
})
it('keeps an existing project address stable when its title changes', async () => {
  const user = userEvent.setup()
  render(<Editor initial={{ title: 'Robot Arm', slug: 'robot-arm' }} autoSlug={false}/>)
  await user.type(screen.getByLabelText('Title'), ' Build')
  await user.click(screen.getByText('More project details'))
  expect(screen.getByLabelText('Page address')).toHaveValue('robot-arm')
})
it('keeps event times in the officer local timezone while storing an ISO instant', () => {
  function EventEditor() {
    const [value, setValue] = useState<Record<string, unknown>>({ startAt: new Date(2026, 8, 10, 14, 30).toISOString() })
    return <><EventForm value={value} onChange={(name, next) => setValue(old => ({ ...old, [name]: next }))}/><output>{String(value.startAt)}</output></>
  }
  render(<EventEditor/>)
  expect(screen.getByLabelText('Start time')).toHaveValue('2026-09-10T14:30')
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '2026-09-10T16:00' } })
  expect(screen.getByLabelText('Start time')).toHaveValue('2026-09-10T16:00')
  expect(screen.getByRole('status')).toHaveTextContent(new Date(2026, 8, 10, 16, 0).toISOString())
})
