import { requireActiveMember } from '@/lib/auth/memberSession'
import { listMyTeamInvites } from '@/lib/projects/teamInvites'
import { listClubInvitations } from '@/lib/teams/server'
import { TeamInvitationList } from '@/components/member/TeamInvitationList'
import { ClubInvitations } from '@/components/member/teams/TeamForms'
export default async function InvitationsPage() {
  const member = await requireActiveMember()
  const [projects, teams] = await Promise.all([listMyTeamInvites(member.userId), listClubInvitations()])
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Invitations</h1><p>Accept an invitation to join the team or project.</p></div></div><ClubInvitations invitations={teams}/><section className="portal-section"><h2>Project invitations</h2><TeamInvitationList initial={projects}/></section></main>
}
