import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ProjectPage from '@/app/(public)/projects/[slug]/page'

const fixture = vi.hoisted(() => ({ project: {} as Record<string, unknown> }))
vi.mock('@/lib/content/projects', () => ({ getPublishedProject: async () => fixture.project }))
vi.mock('@/lib/auth/memberSession', () => ({ getCurrentMember: async () => null }))
vi.mock('@/lib/members/saves', () => ({ isSavedItem: async () => false }))
vi.mock('@/components/public/CoverImage', () => ({ CoverImage: () => <div role="img" aria-label="Legacy project cover"/> }))

beforeEach(() => {
  fixture.project = {
    id: 'printer', slug: 'ender-3-klipper-upgrade', title: 'Ender 3 Repair & Klipper Upgrade',
    summary: 'Upgrade the controller and install Klipper.', status: 'open_for_interest',
    disciplines: ['Electrical'], skills: ['Firmware', 'Electronics'], cover_media_id: 'legacy-cover',
    problem: '', goal: '', timeline: [], updates: [], recruiting: true
  }
})
afterEach(cleanup)

it('shows the published difficulty alongside the existing project details', async () => {
  fixture.project.difficulty = 'Intermediate'
  render(await ProjectPage({ params: Promise.resolve({ slug: 'ender-3-klipper-upgrade' }) }))
  expect(screen.getByText('Difficulty', { selector: 'dt' })).toBeVisible()
  expect(screen.getByText('Intermediate', { selector: 'dd' })).toBeVisible()
})

it('replaces the hidden legacy photo frame with the published brief and skills', async () => {
  const { container } = render(await ProjectPage({ params: Promise.resolve({ slug: 'ender-3-klipper-upgrade' }) }))
  expect(container.querySelector('.project-detail-photo')).toBeNull()
  expect(screen.getByRole('heading', { name: 'Project brief' })).toBeVisible()
  expect(container.querySelector('.prose')).toHaveTextContent('Upgrade the controller and install Klipper.')
  expect(screen.getByRole('heading', { name: 'Skills you can contribute' })).toBeVisible()
  expect(screen.getByRole('list', { name: 'Project skills' })).toHaveTextContent('Firmware')
  expect(screen.getByRole('link', { name: 'Express interest' })).toHaveAttribute('href', '/get-involved?type=join_project&project=Ender%203%20Repair%20%26%20Klipper%20Upgrade')
  expect(screen.getByRole('link', { name: 'Sign in to save' })).toHaveAttribute('href', '/member/login')
})

it('preserves detailed proposals without repeating their summary in the brief', async () => {
  fixture.project = { ...fixture.project, problem: 'The probe produces a small signal.', goal: 'Validate an amplifier.', skills: [] }
  render(await ProjectPage({ params: Promise.resolve({ slug: 'ender-3-klipper-upgrade' }) }))
  expect(screen.getByRole('heading', { name: 'Problem' })).toBeVisible()
  expect(screen.getByText('The probe produces a small signal.')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Goal' })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Project brief' })).not.toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Project skills' })).not.toBeInTheDocument()
})
