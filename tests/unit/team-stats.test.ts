import { expect, it } from 'vitest'
import { computeTeamStats, teamPhase } from '@/lib/content/teamStatsModel'
import { officerLoginNext } from '@/lib/leadership/input'

it('counts the same people the workspace roster does', () => {
  const stats = computeTeamStats({
    projects: [{ id: 'p', started_at: null }, { id: 'empty', started_at: null }],
    memberships: [
      { project_id: 'p', user_id: 'ada', status: 'ACTIVE' },
      { project_id: 'p', user_id: 'ben', status: 'REMOVED' },
      { project_id: 'p', user_id: 'sus', status: 'ACTIVE' },
    ],
    milestones: [{ project_id: 'p', status: 'DONE' }, { project_id: 'p', status: 'TODO' }],
    teamLinks: [{ team_id: 't', project_id: 'p' }],
    teamMembers: [{ team_id: 't', user_id: 'ada' }, { team_id: 't', user_id: 'ben' }, { team_id: 't', user_id: 'cy' }],
    activeUserIds: ['ada', 'ben', 'cy'],
  })
  // ada counted once; ben removed from the project despite team access; sus is suspended.
  expect(stats.p).toEqual({ memberCount: 2, milestonesTotal: 2, milestonesDone: 1, startedAt: null })
  expect(stats.empty).toEqual({ memberCount: 0, milestonesTotal: 0, milestonesDone: 0, startedAt: null })
})

it('describes where each team stands', () => {
  const base = { memberCount: 0, milestonesTotal: 0, milestonesDone: 0, startedAt: null }
  expect(teamPhase(undefined, { status: 'open_for_interest', recruiting: true })).toBe('recruiting')
  expect(teamPhase(base, { status: 'proposed', recruiting: false })).toBe('closed')
  expect(teamPhase({ ...base, memberCount: 2 }, { status: 'open_for_interest', recruiting: true })).toBe('forming')
  expect(teamPhase({ ...base, memberCount: 2, startedAt: '2026-09-12' }, { status: 'open_for_interest', recruiting: true })).toBe('underway')
  expect(teamPhase(base, { status: 'complete', recruiting: false })).toBe('complete')
})

it('returns members to the project they were applying to after sign-in, and nowhere else', () => {
  const project = '00000000-0000-4000-8000-000000000020'
  expect(officerLoginNext(`/member/applications?project=${project}`)).toBe(`/member/applications?project=${project}`)
  expect(officerLoginNext(`/member/teams/${project}`)).toBe(`/member/teams/${project}`)
  expect(officerLoginNext('/member/applications?project=https://evil.example')).toBe('/member')
  expect(officerLoginNext(`//evil.example/member/teams/${project}`)).toBe('/member')
  expect(officerLoginNext('/member/leadership')).toBe('/member/leadership')
})
