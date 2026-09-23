import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { z } from 'zod'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { listClubTeams } from '@/lib/teams/server'
import { searchMemberDirectory } from '@/lib/members/directory'
import { listProjectApplications } from '@/lib/projects/applications'
import { getProjectWorkspace, type ProjectWorkspace } from '@/lib/projects/workspace'
import { ProjectWorkspaceView } from '@/components/member/workspace/ProjectWorkspaceView'
import '@/components/projects/project-teams.css'

async function loadWorkspace(projectId: string): Promise<ProjectWorkspace | null> {
  try { return await getProjectWorkspace(projectId) }
  catch (error) { if (error instanceof Error && ['PROJECT_WORKSPACE_FORBIDDEN', 'PROJECT_NOT_FOUND'].includes(error.message)) return null; throw error }
}

export default async function TeamWorkspacePage({ params }: { params: Promise<{ projectId: string }> }) {
  await requireActiveMember()
  const { projectId } = await params
  if (!z.string().uuid().safeParse(projectId).success) notFound()
  const workspace = await loadWorkspace(projectId)
  if (!workspace) return <main className="admin-panel pt-page"><Link className="pt-back" href="/member/teams"><ArrowLeft size={16}/>My teams</Link><div className="portal-empty"><div><h1>You are not on this project team</h1><p>You may have left the team, been removed, or the project was closed. Your other teams are unchanged.</p><Link className="portal-text-link" href="/member/projects">Find a project</Link></div></div></main>
  const isLead = workspace.myRole === 'LEAD'
  const [clubTeams, applications, directory] = isLead ? await Promise.all([listClubTeams(), listProjectApplications(projectId), searchMemberDirectory('')]) : [[], [], []]
  return <ProjectWorkspaceView projectId={projectId} workspace={workspace} applications={applications} directory={directory} clubTeams={clubTeams}/>
}
