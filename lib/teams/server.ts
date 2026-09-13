import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ClubTeam, ClubInvitation, ProjectRoster } from './types'
import type { TeamAction } from './input'

export async function listClubTeams(teamId?: string): Promise<ClubTeam[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('list_club_teams', { p_team_id: teamId ?? null })
  if (error) throw new Error(error.message)
  return data ?? []
}
export async function listClubInvitations(): Promise<ClubInvitation[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('list_my_club_team_invitations')
  if (error) throw new Error(error.message)
  return data ?? []
}
export async function listProjectRosters(): Promise<ProjectRoster[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('community_project_rosters')
  if (error) throw new Error(error.message)
  return data ?? []
}
export async function performTeamAction(input: TeamAction): Promise<{ teamId: string; status: string | null }> {
  const { action, ...fields } = input
  const { teamId, ...payload } = fields as Record<string, unknown>
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('club_team_action', { p_action: action, p_team_id: teamId ?? null, p_payload: payload })
  if (error) throw new Error(error.message)
  return data
}
