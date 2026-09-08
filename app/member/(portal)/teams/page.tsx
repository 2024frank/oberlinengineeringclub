import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'
export default async function TeamsPage() {
  await requireActiveMember()
  const teams = await listMyProjectWorkspaces()
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>My teams</h1><p>Your project workspaces, teammates, and updates.</p></div><Link className="button button--ghost" href="/member/projects"><Search size={17}/>Find a project</Link></div>{teams.length ? <div className="workspace-card-grid">{teams.map(team => <Link className="content-card" href={`/member/teams/${team.projectId}`} key={team.projectId}><p className="eyebrow">{team.membershipRole === 'LEAD' ? 'Project lead' : 'Team member'}</p><h2>{team.title}</h2><p>{team.projectStatus.replaceAll('_', ' ')}</p><strong className="portal-text-link">Open workspace <ArrowRight size={17}/></strong></Link>)}</div> : <div className="portal-empty"><div><h2>No team yet</h2><p>Join a recruiting project or bring an idea of your own.</p><Link className="portal-text-link" href="/member/proposals?new=1">Propose an idea <ArrowRight size={17}/></Link></div></div>}</main>
}
