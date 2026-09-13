import { requireActiveMember } from '@/lib/auth/memberSession'
import { getMemberDashboardSummary } from '@/lib/members/dashboard'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { MemberDashboard } from '@/components/member/MemberDashboard'
import { listClubTeams, listClubInvitations } from '@/lib/teams/server'

export default async function MemberDashboardPage() {
  const member = await requireActiveMember()
  const [summary, teams, clubTeams, invitations] = await Promise.all([getMemberDashboardSummary(member.userId), listMyProjectWorkspaces(), listClubTeams(), listClubInvitations()])
  return <MemberDashboard displayName={member.displayName} summary={{ ...summary, pendingInvitations: summary.pendingInvitations + invitations.filter(invitation => invitation.status === 'PENDING').length }} teams={teams} clubTeams={clubTeams.filter(team => team.myRole)}/>
}
