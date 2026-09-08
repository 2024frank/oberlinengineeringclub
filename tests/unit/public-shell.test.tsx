import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PublicHeader } from '@/components/public/PublicHeader'

describe('public shell', () => {
  it('keeps all public destinations available through the compact navigation', async () => {
    render(<PublicHeader />)
    expect(screen.getByRole('img', { name: /oberlin engineering club/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Oberlin Engineering Club home' })).toHaveAttribute('href','/')
    expect(screen.getByRole('link', { name: 'Join the club' })).toHaveAttribute('href','/get-involved')
    const user=userEvent.setup()
    await user.click(screen.getByRole('button',{name:'Open navigation'}))
    const menu=within(screen.getByRole('navigation',{name:'All pages'}))
    for (const label of ['About', 'Projects', 'Events', 'Opportunities', 'Resources', '3-2 Pathway', 'News', 'Member Sign In']) {
      expect(menu.getByRole('link', { name: label })).toBeInTheDocument()
    }
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button',{name:'Open navigation'})).toHaveFocus()
    expect(screen.queryByRole('navigation',{name:'All pages'})).not.toBeInTheDocument()
  })
})
