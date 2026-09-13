import { requireAdmin } from '@/lib/auth/requireRole'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { listClubTeams, listProjectRosters } from '@/lib/teams/server'
import { TeamBrowser, TeamRoster } from '@/components/member/teams/TeamBrowser'
import { TeamProjectRequests } from '@/components/member/teams/TeamWorkspace'
export default async function AdminTeamsPage() {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required"/>
  const [teams, projects] = await Promise.all([listClubTeams(), listProjectRosters()])
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Teams and project members</h1><p>Team rosters, project requests, and everyone working on each project.</p></div></div><TeamProjectRequests teams={teams} admin/><TeamBrowser teams={teams} admin/><section className="portal-section"><h2>Project rosters</h2>{projects.map(project => <article className="team-list-row" key={project.projectId}><div><h3>{project.title}</h3><p>{project.members.length} members</p></div>{project.members.length ? <TeamRoster people={project.members}/> : <p className="portal-muted">No members yet.</p>}</article>)}</section></main>
}
