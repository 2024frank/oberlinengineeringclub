import { requireActiveMember } from '@/lib/auth/memberSession'
import { getMemberDashboardSummary } from '@/lib/members/dashboard'
import { listMyProjectOverview, listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { getMemberWork } from '@/lib/projects/memberActivity'
import { MemberDashboard } from '@/components/member/MemberDashboard'
import { listClubTeams, listClubInvitations } from '@/lib/teams/server'
import '@/components/projects/project-teams.css'

export default async function MemberDashboardPage() {
  const member = await requireActiveMember()
  const [summary, teams, clubTeams, invitations, progress] = await Promise.all([getMemberDashboardSummary(member.userId), listMyProjectWorkspaces(), listClubTeams(), listClubInvitations(), listMyProjectOverview()])
  const work = await getMemberWork(member.userId, progress)
  return <MemberDashboard displayName={member.displayName} summary={{ ...summary, pendingInvitations: summary.pendingInvitations + invitations.filter(invitation => invitation.status === 'PENDING').length }} teams={teams} clubTeams={clubTeams.filter(team => team.myRole)} progress={progress} work={work}/>
}
