export type ProjectTeamStats = { memberCount: number; milestonesTotal: number; milestonesDone: number; startedAt: string | null }

type Input = {
  projects: { id: string; started_at: string | null }[]
  memberships: { project_id: string; user_id: string; status: string }[]
  milestones: { project_id: string; status: string }[]
  teamLinks: { team_id: string; project_id: string }[]
  teamMembers: { team_id: string; user_id: string }[]
  activeUserIds: string[]
}

// Mirrors private.effective_project_roster: direct active members plus members of
// approved club teams, minus anyone who left or was removed from that project,
// counting only active accounts.
export function computeTeamStats(input: Input): Record<string, ProjectTeamStats> {
  const active = new Set(input.activeUserIds)
  const stats: Record<string, ProjectTeamStats> = {}
  for (const project of input.projects) {
    const direct = input.memberships.filter(row => row.project_id === project.id)
    const excluded = new Set(direct.filter(row => row.status === 'LEFT' || row.status === 'REMOVED').map(row => row.user_id))
    const roster = new Set(direct.filter(row => row.status === 'ACTIVE').map(row => row.user_id))
    const teams = new Set(input.teamLinks.filter(link => link.project_id === project.id).map(link => link.team_id))
    for (const member of input.teamMembers) if (teams.has(member.team_id) && !excluded.has(member.user_id)) roster.add(member.user_id)
    const milestones = input.milestones.filter(row => row.project_id === project.id)
    stats[project.id] = {
      memberCount: [...roster].filter(user => active.has(user)).length,
      milestonesTotal: milestones.length,
      milestonesDone: milestones.filter(row => row.status === 'DONE').length,
      startedAt: project.started_at,
    }
  }
  return stats
}

export type TeamPhase = 'underway' | 'forming' | 'recruiting' | 'closed' | 'complete'
export function teamPhase(stats: ProjectTeamStats | undefined, project: { status: string; recruiting: boolean }): TeamPhase {
  if (project.status === 'complete') return 'complete'
  if (stats?.startedAt || project.status === 'active') return 'underway'
  if (stats && stats.memberCount > 0) return 'forming'
  return project.recruiting ? 'recruiting' : 'closed'
}
export const teamPhaseLabels: Record<TeamPhase, string> = {
  underway: 'Underway',
  forming: 'Team forming',
  recruiting: 'Looking for its first members',
  closed: 'Not taking members yet',
  complete: 'Complete',
}
