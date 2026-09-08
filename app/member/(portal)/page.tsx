import { requireActiveMember } from '@/lib/auth/memberSession'
import { getMemberDashboardSummary } from '@/lib/members/dashboard'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { MemberDashboard } from '@/components/member/MemberDashboard'

export default async function MemberDashboardPage() {
  const member = await requireActiveMember()
  const [summary, teams] = await Promise.all([getMemberDashboardSummary(member.userId), listMyProjectWorkspaces()])
  return <MemberDashboard displayName={member.displayName} summary={summary} teams={teams}/>
}
