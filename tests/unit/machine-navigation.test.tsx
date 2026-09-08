import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { ConceptExperience } from '@/components/concepts/ConceptExperience'

vi.mock('next/navigation', () => ({ usePathname: () => '/get-involved', useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('next/link', () => ({ default: ({ onClick, scroll, ...props }: ComponentProps<'a'> & { scroll?: boolean }) => { void scroll; return <a {...props} onClick={event => { event.preventDefault(); onClick?.(event) }}/>} }))
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(cleanup)

it.each(['Submit a project idea', 'Explore a capstone'])('dismisses the menu for query-only navigation to %s', async label => {
  const user = userEvent.setup()
  render(<ConceptExperience direction="machine" projects={[]} events={[]} publicMode><h1>Your registration</h1></ConceptExperience>)
  await user.click(screen.getByRole('button', { name: 'Open menu' }))
  await user.click(within(screen.getByRole('navigation', { name: 'All pages' })).getByRole('link', { name: label }))
  expect(screen.queryByRole('navigation', { name: 'All pages' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Your registration' })).toBeVisible()
})
