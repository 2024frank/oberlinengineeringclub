import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConceptJoinFlow } from '@/components/concepts/ConceptJoinFlow'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('Concept-only joining', () => {
  it('keeps choices across steps and finishes without a network submission', async () => {
    const user = userEvent.setup(), fetch = vi.fn(), onProgress = vi.fn(), onDone = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<ConceptJoinFlow project="Workshop project" onProgress={onProgress} onDone={onDone}/>)
    await user.click(screen.getByRole('checkbox', { name: 'Robotics' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Preview Student')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'preview@example.com')
    await user.click(screen.getByRole('button', { name: 'Previous step' }))
    expect(screen.getByRole('checkbox', { name: 'Robotics' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Preview Student')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('preview@example.com')).toBeInTheDocument()
    expect(screen.getByText('Robotics')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Finish preview' }))
    expect(screen.getByText(/Nothing has been sent to the club/)).toBeInTheDocument()
    expect(onProgress).toHaveBeenLastCalledWith(4)
    expect(fetch).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Back to exploring' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('requires valid contact fields before the review', async () => {
    const user = userEvent.setup()
    render(<ConceptJoinFlow project="" onProgress={vi.fn()} onDone={vi.fn()}/>)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Make yourself at home.' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), '   ')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'preview@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your name.')
  })
})
