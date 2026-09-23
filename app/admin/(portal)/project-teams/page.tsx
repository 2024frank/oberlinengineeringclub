import Link from 'next/link'
import { Plus } from 'lucide-react'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { ProjectTeamsOverview, isProjectTeamFilter } from '@/components/admin/projects/ProjectTeamsOverview'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listProjectTeams } from '@/lib/projects/teamAdmin'
import '@/components/projects/project-teams.css'

export default async function ProjectTeamsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required" body="Only Admins and Super Admins can manage project teams."/>
  const [params, projects] = await Promise.all([searchParams, listProjectTeams()])
  const filter = typeof params.filter === 'string' && isProjectTeamFilter(params.filter) ? params.filter : 'all'
  return <main className="admin-panel pt-page">
    <div className="admin-page-heading"><div><h1>Project teams</h1><p>Who is on each project, who leads it, and what needs your attention. Open a project to add or remove people, change leads, start the project, or remove it.</p></div><Link className="button button--ghost" href="/admin/projects?new=1"><Plus size={17}/>Add a project</Link></div>
    <ProjectTeamsOverview projects={projects} initialFilter={filter}/>
  </main>
}
