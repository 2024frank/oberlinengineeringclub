import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, expect, it } from 'vitest'
import { ProjectForm } from '@/components/admin/content/ProjectForm'
import { EventForm } from '@/components/admin/content/EventForm'

afterEach(cleanup)
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
