import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { listMyProjectOverview } from '@/lib/projects/workspace'
import { listClubTeams } from '@/lib/teams/server'
import { TeamBrowser } from '@/components/member/teams/TeamBrowser'
import { ProjectProgressList } from '@/components/member/workspace/ProjectProgressList'
import '@/components/projects/project-teams.css'

export default async function TeamsPage() {
  await requireActiveMember()
  const [projects, teams] = await Promise.all([listMyProjectOverview(), listClubTeams()])
  const myTeams = teams.filter(team => team.myRole)
  return <main className="admin-panel pt-page"><div className="admin-page-heading"><div><h1>My teams</h1><p>Your projects, how far along they are, and the teammates you work with.</p></div><div className="team-actions"><Link className="button button--ghost" href="/member/teams/find"><Search size={17}/>Find a team</Link><Link className="button button--primary" href="/member/teams/new"><Plus size={17}/>Create team</Link></div></div>
    <section className="portal-section"><h2>My projects</h2>{projects.length ? <ProjectProgressList projects={projects}/> : <p className="portal-muted">Your projects appear here once you join a project team. <Link className="portal-text-link" href="/member/projects">Find a project</Link></p>}</section>
    {myTeams.length > 0 && <section className="portal-section"><h2>My club teams</h2><TeamBrowser teams={myTeams}/></section>}
  </main>
}
