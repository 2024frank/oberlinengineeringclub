import { notFound } from 'next/navigation'
import { z } from 'zod'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { ProjectTeamManager } from '@/components/admin/projects/ProjectTeamManager'
import { requireAdmin } from '@/lib/auth/requireRole'
import { getAdminProjectTeam, listActiveMemberChoices } from '@/lib/projects/teamAdmin'
import '@/components/projects/project-teams.css'

export default async function ProjectTeamPage({ params }: { params: Promise<{ projectId: string }> }) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required" body="Only Admins and Super Admins can manage project teams."/>
  const { projectId } = await params
  if (!z.string().uuid().safeParse(projectId).success) notFound()
  const [team, members] = await Promise.all([
    getAdminProjectTeam(projectId).catch(error => { if (error instanceof Error && error.message === 'PROJECT_NOT_FOUND') return null; throw error }),
    listActiveMemberChoices(),
  ])
  if (!team) notFound()
  return <main className="admin-panel pt-page"><ProjectTeamManager team={team} members={members}/></main>
}
