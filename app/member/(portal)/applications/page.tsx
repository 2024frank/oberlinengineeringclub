import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { getApplicationTarget, listMyProjectApplications } from '@/lib/projects/applications'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { ProjectApplicationForm } from '@/components/member/ProjectApplicationForm'
import { WithdrawApplicationButton } from '@/components/member/WithdrawApplicationButton'

const labels = { PENDING: 'Awaiting a decision', ACCEPTED: 'Accepted', REJECTED: 'Not accepted', WITHDRAWN: 'Withdrawn' }
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireActiveMember(), params = await searchParams
  const projectId = typeof params.project === 'string' ? params.project : ''
  const [target, applications, teams] = await Promise.all([projectId ? getApplicationTarget(projectId) : Promise.resolve(null), listMyProjectApplications(member.userId), listMyProjectWorkspaces()])
  const teamIds = new Set(teams.map(team => team.projectId))
  // Only an open application, or a team you are still on, blocks a new application.
  const latest = applications.find(application => application.projectId === projectId)
  const onTeam = Boolean(projectId && teamIds.has(projectId))
  const blocked = onTeam || latest?.status === 'PENDING'
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>{target && !blocked ? 'Apply to join' : 'My applications'}</h1><p>Your project applications and the decisions on them.</p></div><Link className="button button--ghost" href="/member/projects"><Search size={17}/>Find a project</Link></div>
    {target && !blocked && <ProjectApplicationForm projectId={target.id} projectTitle={target.title}/>}
    {projectId && !target && !blocked && <p className="portal-form-error" role="status">This project is not accepting applications right now. You can find other projects above.</p>}
    {onTeam && <p role="status">You are already on this project team. <Link className="portal-text-link" href={`/member/teams/${projectId}`}>Open the workspace</Link></p>}
    {!onTeam && latest?.status === 'PENDING' && <p role="status">You already applied to {latest.projectTitle}. Your application is shown below.</p>}
    <div className="application-list">{applications.map(application => <article className="content-card" key={application.id}><span className={`status-pill status-${application.status.toLowerCase()}`}>{labels[application.status]}</span><h2>{application.projectTitle}</h2><p>{application.motivation}</p>{application.decisionNote && <p><strong>Note:</strong> {application.decisionNote}</p>}
      {application.status === 'PENDING' && <WithdrawApplicationButton applicationId={application.id} projectTitle={application.projectTitle}/>}
      {application.status === 'ACCEPTED' && teamIds.has(application.projectId) && <Link className="portal-text-link" href={`/member/teams/${application.projectId}`}>Open my team <ArrowRight size={17}/></Link>}
    </article>)}</div>
    {!target && !applications.length && <div className="portal-empty"><div><h2>No applications yet</h2><p>Choose a project that is looking for teammates.</p><Link className="portal-text-link" href="/member/projects">Browse projects <ArrowRight size={17}/></Link></div></div>}
  </main>
}
