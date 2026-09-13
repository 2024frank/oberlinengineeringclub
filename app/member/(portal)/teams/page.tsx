import Link from 'next/link'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { listClubTeams } from '@/lib/teams/server'
import { TeamBrowser } from '@/components/member/teams/TeamBrowser'
export default async function TeamsPage() {
  await requireActiveMember()
  const [projects, teams] = await Promise.all([listMyProjectWorkspaces(), listClubTeams()])
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>My teams</h1><p>Your teammates and the projects you are working on.</p></div><div className="team-actions"><Link className="button button--ghost" href="/member/teams/find"><Search size={17}/>Find a team</Link><Link className="button button--primary" href="/member/teams/new"><Plus size={17}/>Create team</Link></div></div>
    <TeamBrowser teams={teams.filter(team => team.myRole)}/>
    <section className="portal-section"><h2>My project workspaces</h2>{projects.length ? <div className="portal-link-list">{projects.map(project => <Link href={`/member/teams/${project.projectId}`} key={project.projectId}><span><strong>{project.title}</strong><small>{project.membershipRole === 'LEAD' ? 'Project lead' : 'Project member'}</small></span><ArrowRight size={17}/></Link>)}</div> : <p className="portal-muted">Your projects appear here after your application or team request is approved.</p>}</section>
  </main>
}
