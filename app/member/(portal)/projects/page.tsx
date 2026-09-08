import Link from 'next/link'
import { Lightbulb } from 'lucide-react'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { listPublishedProjects } from '@/lib/content/projects'
import { listMyProjectApplications } from '@/lib/projects/applications'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { MemberProjectBrowser } from '@/components/member/MemberProjectBrowser'

export default async function MemberProjectsPage() {
  const member = await requireActiveMember()
  const [projects, applications, teams] = await Promise.all([listPublishedProjects(), listMyProjectApplications(member.userId), listMyProjectWorkspaces()])
  const items = projects.map(project => ({ id: project.id, title: project.title, summary: project.summary ?? '', disciplines: project.disciplines ?? [], skills: project.skills ?? [], recruiting: Boolean(project.recruiting), problem: project.problem ?? '', goal: project.goal ?? '' }))
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Find a project</h1><p>Explore what the club is building.</p></div><Link className="button button--ghost" href="/member/proposals?new=1"><Lightbulb size={18}/>Propose an idea</Link></div><MemberProjectBrowser projects={items} applications={applications.map(application => ({ projectId: application.projectId, status: application.status }))} teamIds={teams.map(team => team.projectId)}/></main>
}
