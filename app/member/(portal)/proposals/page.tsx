import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { listMyProjectProposals } from '@/lib/projects/proposalServer'
import { ProjectProposalForm } from '@/components/member/ProjectProposalForm'

export default async function MemberProposalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireActiveMember()
  const [proposals, params] = await Promise.all([listMyProjectProposals(member.userId), searchParams])
  const creating = params.new === '1'
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>{creating ? 'Propose an idea' : 'My ideas'}</h1><p>{creating ? 'A new project for the club to consider.' : 'Your proposals and the club team\'s feedback.'}</p></div>{!creating && <Link className="button button--primary" href="/member/proposals?new=1"><Plus size={18}/>Propose an idea</Link>}</div>
    {creating ? <ProjectProposalForm/> : proposals.length ? <div className="proposal-status-list">{proposals.map(proposal => <article className="content-card" key={proposal.id}><span className={`status-pill status-${proposal.status.toLowerCase()}`}>{proposal.status === 'PENDING' ? 'Awaiting review' : proposal.status === 'APPROVED' ? 'Approved' : proposal.status === 'WITHDRAWN' ? 'Withdrawn' : 'Not approved'}</span><h2>{proposal.title}</h2><p>{proposal.summary || proposal.problem}</p>{proposal.adminFeedback && <p><strong>Club feedback:</strong> {proposal.adminFeedback}</p>}{proposal.approvedProjectId && <Link className="portal-text-link" href={`/member/teams/${proposal.approvedProjectId}`}>Open my team <ArrowRight size={17}/></Link>}</article>)}</div> : <div className="portal-empty"><div><h2>No ideas submitted yet</h2><p>Your proposals and review decisions will appear here.</p></div></div>}
  </main>
}
