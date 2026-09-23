import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { computeTeamStats, type ProjectTeamStats } from './teamStatsModel'
import { previewTeamStats, publicPreviewEnabled } from './previewProjects'

export type { ProjectTeamStats } from './teamStatsModel'

// Public pages show counts only (team size and milestone progress), never names.
// Rosters are private under RLS, so the counts are read with the server-only
// service client. Any failure hides the status instead of breaking the page.
export async function getProjectTeamStats(projectIds: string[]): Promise<Record<string, ProjectTeamStats>> {
  const ids = Array.from(new Set(projectIds.filter(Boolean)))
  if (publicPreviewEnabled()) return Object.fromEntries(ids.filter(id => previewTeamStats[id]).map(id => [id, previewTeamStats[id]]))
  if (!ids.length || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return {}
  try {
    const s = createSupabaseAdminClient()
    const [projects, memberships, milestones, teamLinks] = await Promise.all([
      s.from('projects').select('id,started_at').in('id', ids),
      s.from('project_memberships').select('project_id,user_id,status').in('project_id', ids),
      s.from('project_milestones').select('project_id,status').in('project_id', ids),
      s.from('club_team_projects').select('team_id,project_id').eq('status', 'APPROVED').in('project_id', ids),
    ])
    for (const result of [projects, memberships, milestones, teamLinks]) if (result.error) throw result.error
    const teamIds = Array.from(new Set((teamLinks.data ?? []).map(row => row.team_id)))
    const teamMembers = teamIds.length ? await s.from('club_team_memberships').select('team_id,user_id').in('team_id', teamIds) : { data: [], error: null }
    if (teamMembers.error) throw teamMembers.error
    const userIds = Array.from(new Set([...(memberships.data ?? []).map(row => row.user_id), ...(teamMembers.data ?? []).map(row => row.user_id)]))
    const profiles = userIds.length ? await s.from('member_profiles').select('user_id').eq('status', 'ACTIVE').in('user_id', userIds) : { data: [], error: null }
    if (profiles.error) throw profiles.error
    return computeTeamStats({
      projects: projects.data ?? [], memberships: memberships.data ?? [], milestones: milestones.data ?? [],
      teamLinks: teamLinks.data ?? [], teamMembers: teamMembers.data ?? [], activeUserIds: (profiles.data ?? []).map(row => row.user_id),
    })
  } catch {
    return {}
  }
}
