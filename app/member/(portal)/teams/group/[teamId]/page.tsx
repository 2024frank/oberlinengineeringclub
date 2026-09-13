import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { listClubTeams } from '@/lib/teams/server'
import { listPublishedProjects } from '@/lib/content/projects'
import { searchMemberDirectory } from '@/lib/members/directory'
import { TeamWorkspace } from '@/components/member/teams/TeamWorkspace'
export default async function ClubTeamPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireActiveMember()
  const { teamId } = await params
  if (!z.string().uuid().safeParse(teamId).success) notFound()
  const [team] = await listClubTeams(teamId)
  if (!team) notFound()
  const [members, projects, query] = await Promise.all([team.myRole === 'LEAD' ? searchMemberDirectory() : Promise.resolve([]), team.myRole === 'LEAD' ? listPublishedProjects() : Promise.resolve([]), searchParams])
  return <main className="admin-panel"><TeamWorkspace team={team} members={members} projects={projects.filter(project => project.recruiting).map(project => ({ id: project.id, title: project.title }))} inviteUserId={typeof query.invite === 'string' ? query.invite : undefined}/></main>
}
