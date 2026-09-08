import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkbenchJoinForm } from '@/components/concepts/workbench/WorkbenchJoinForm'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Workbench join preview', () => {
  it('starts at interests with the club name and an accessible three-step indicator', async () => {
    const user = userEvent.setup()
    const onProgress = vi.fn()
    render(<WorkbenchJoinForm onProgress={onProgress} onDone={vi.fn()}/>)

    expect(screen.getByRole('heading', { level: 2, name: 'Join the club' })).toBeInTheDocument()
    expect(screen.getByText('Oberlin Engineering Club')).toBeInTheDocument()
    expect(onProgress).toHaveBeenCalledExactlyOnceWith(1)
    const steps = within(screen.getByRole('list', { name: 'Registration steps' })).getAllByRole('listitem')
    expect(steps).toHaveLength(3)
    expect(steps[0]).toHaveAttribute('aria-current', 'step')
    const interests = within(screen.getByRole('group', { name: 'Your interests' }))
    expect(interests.getAllByRole('checkbox')).toHaveLength(6)
    for (const name of ['Robotics', 'Electronics', 'Software', 'Fabrication', 'Materials', 'Energy']) {
      expect(interests.getByRole('checkbox', { name })).not.toBeChecked()
    }
    await user.click(interests.getByRole('checkbox', { name: 'Software' }))
    expect(interests.getByRole('checkbox', { name: 'Software' })).toBeChecked()
    await user.click(interests.getByRole('checkbox', { name: 'Software' }))
    expect(interests.getByRole('checkbox', { name: 'Software' })).not.toBeChecked()
  })

  it.each([
    { reason: 'missing name', name: '', email: '', field: 'Full name', error: /enter your name/i },
    { reason: 'whitespace-only name', name: '   ', email: 'student@example.com', field: 'Full name', error: /enter your name/i },
    { reason: 'missing email', name: 'Preview Student', email: '', field: 'Email', error: /enter.*email/i },
    { reason: 'missing email domain', name: 'Preview Student', email: 'student@', field: 'Email', error: /valid email/i },
    { reason: 'missing email separator', name: 'Preview Student', email: 'student.example.com', field: 'Email', error: /valid email/i },
    { reason: 'spaces within email', name: 'Preview Student', email: 'student name@example.com', field: 'Email', error: /valid email/i }
  ])('keeps details editable for $reason and identifies the invalid field', async ({ name, email, field, error }) => {
    const user = userEvent.setup()
    const onProgress = vi.fn()
    render(<WorkbenchJoinForm onProgress={onProgress} onDone={vi.fn()}/>)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    if (name) await user.type(screen.getByRole('textbox', { name: 'Full name' }), name)
    if (email) await user.type(screen.getByRole('textbox', { name: 'Email' }), email)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Your details' })).toBeInTheDocument()
    const invalidField = screen.getByRole('textbox', { name: field })
    expect(invalidField).toHaveAttribute('aria-invalid', 'true')
    expect(invalidField).toHaveAccessibleDescription(error)
    expect(invalidField).toHaveFocus()
    expect(screen.getAllByRole('alert').some(alert => error.test(alert.textContent ?? ''))).toBe(true)
    expect(onProgress).toHaveBeenLastCalledWith(2)
    expect(onProgress).not.toHaveBeenCalledWith(3)
  })

  it('retains interests and all details when going back, then reviews corrected values', async () => {
    const user = userEvent.setup()
    render(<WorkbenchJoinForm onProgress={vi.fn()} onDone={vi.fn()}/>)
    await user.click(screen.getByRole('checkbox', { name: 'Robotics' }))
    await user.click(screen.getByRole('checkbox', { name: 'Materials' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Preview Student')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'preview@example.com')
    await user.type(screen.getByRole('textbox', { name: /Major/ }), 'Physics')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Review your request' })).toBeInTheDocument()
    expect(screen.getByText('Robotics, Materials')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous step' }))
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Preview Student')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('preview@example.com')
    expect(screen.getByRole('textbox', { name: /Major/ })).toHaveValue('Physics')
    await user.click(screen.getByRole('button', { name: 'Previous step' }))
    expect(screen.getByRole('checkbox', { name: 'Robotics' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Materials' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Robotics' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('textbox', { name: /Major/ })).toHaveValue('Physics')
    await user.clear(screen.getByRole('textbox', { name: 'Email' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'corrected@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('corrected@example.com')).toBeInTheDocument()
    expect(screen.getByText('Physics')).toBeInTheDocument()
    expect(screen.getByText('Materials')).toBeInTheDocument()
    expect(screen.queryByText('Robotics')).not.toBeInTheDocument()
  })

  it('carries the supplied project into review and the receipt without sending or storing anything', async () => {
    const user = userEvent.setup()
    const fetch = vi.fn(() => { throw new Error('A preview must not fetch') })
    vi.stubGlobal('fetch', fetch)
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => { throw new Error('A preview must not send requests') })
    const storage = (['getItem', 'setItem', 'removeItem', 'clear'] as const).map(method => vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error('A preview must not use storage') }))
    const onProgress = vi.fn()
    const onDone = vi.fn()
    const { unmount } = render(<WorkbenchJoinForm project="Printer repair" onProgress={onProgress} onDone={onDone}/>)
    expect(screen.getByText('Printer repair')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Fabrication' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), '  Preview Student  ')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'preview@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Printer repair')).toBeInTheDocument()
    expect(screen.getByText('Preview Student')).toBeInTheDocument()
    expect(screen.getByText('preview@example.com')).toBeInTheDocument()
    const disclosure = screen.getByText(/finishing this preview does not send a request/i)
    const finish = screen.getByRole('button', { name: 'Finish preview' })
    expect(disclosure.compareDocumentPosition(finish) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(finish)

    expect(screen.getByRole('heading', { level: 2, name: 'Preview complete' })).toHaveFocus()
    expect(screen.getByText(/nothing was sent to the club/i)).toBeInTheDocument()
    expect(screen.getByText(/did not register you/i)).toBeInTheDocument()
    expect(screen.getByText('Printer repair')).toBeInTheDocument()
    expect(screen.getByText('Fabrication')).toBeInTheDocument()
    expect(onProgress.mock.calls.map(([step]) => step)).toEqual([1, 2, 3, 4])
    expect(onDone).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Back to exploring' }))
    expect(onDone).toHaveBeenCalledOnce()
    unmount()

    render(<WorkbenchJoinForm onProgress={vi.fn()} onDone={vi.fn()}/>)
    expect(screen.queryByText('Printer repair')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Fabrication' })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('')
    expect(fetch).not.toHaveBeenCalled()
    expect(xhr).not.toHaveBeenCalled()
    for (const method of storage) expect(method).not.toHaveBeenCalled()
  })

  it('scrolls only the nearest workbench surface and focuses each new heading without page scrolling', async () => {
    const user = userEvent.setup()
    const scrollTo = vi.fn()
    const outerScroll = vi.fn()
    const pageScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    const onProgress = vi.fn()
    render(<div className="workbench-surface" ref={node => { if (node) node.scrollTo = outerScroll }}>
      <div className="workbench-surface" ref={node => { if (node) node.scrollTo = scrollTo }}>
        <WorkbenchJoinForm onProgress={onProgress} onDone={vi.fn()}/>
      </div>
    </div>)
    const expectStep = (step: number, title: string) => {
      expect(screen.getByRole('heading', { level: 2, name: title })).toHaveFocus()
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true })
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' })
      expect(onProgress).toHaveBeenLastCalledWith(step)
    }
    expectStep(1, 'Join the club')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expectStep(2, 'Your details')
    await user.click(screen.getByRole('button', { name: 'Previous step' }))
    expectStep(1, 'Join the club')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Preview Student')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'preview@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expectStep(3, 'Review your request')
    expect(screen.getByText('No interests selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Finish preview' }))
    expectStep(4, 'Preview complete')
    expect(onProgress.mock.calls.map(([step]) => step)).toEqual([1, 2, 1, 2, 3, 4])
    expect(scrollTo).toHaveBeenCalledTimes(6)
    expect(outerScroll).not.toHaveBeenCalled()
    expect(pageScroll).not.toHaveBeenCalled()
  })

  it('does not report a new step merely because the parent passes a new callback', async () => {
    const user = userEvent.setup()
    const first = vi.fn()
    const next = vi.fn()
    const onDone = vi.fn()
    const { rerender } = render(<WorkbenchJoinForm onProgress={first} onDone={onDone}/>)
    rerender(<WorkbenchJoinForm onProgress={next} onDone={onDone}/>)
    expect(first).toHaveBeenCalledExactlyOnceWith(1)
    expect(next).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(next).toHaveBeenCalledExactlyOnceWith(2)
  })
})
