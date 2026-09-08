import Link from 'next/link'
import { ArrowRight, Bell, FolderKanban, Lightbulb, Search, Users } from 'lucide-react'
import type { MemberDashboardSummary } from '@/lib/members/dashboard'
import type { WorkspaceSummary } from '@/lib/projects/workspace'

export function MemberDashboard({ displayName, summary, teams }: { displayName: string; summary: MemberDashboardSummary; teams: WorkspaceSummary[] }) {
  return <main className="admin-panel portal-home">
    <div className="admin-page-heading"><div><p className="eyebrow">Your club workspace</p><h1>Hi, {displayName.trim().split(' ')[0]}.</h1></div><Link className="portal-text-link" href="/member/profile">My profile <ArrowRight size={16}/></Link></div>
    {(summary.pendingInvitations > 0 || summary.unreadNotifications > 0) && <section className="portal-attention" aria-label="Your next actions">
      {summary.pendingInvitations > 0 && <Link href="/member/invitations"><Users size={21}/><span><strong>{summary.pendingInvitations} team invitation{summary.pendingInvitations === 1 ? '' : 's'}</strong><small>Waiting for your response</small></span><ArrowRight size={20}/></Link>}
      {summary.unreadNotifications > 0 && <Link href="/member/notifications"><Bell size={21}/><span><strong>{summary.unreadNotifications} unread update{summary.unreadNotifications === 1 ? '' : 's'}</strong><small>Club and project activity</small></span><ArrowRight size={20}/></Link>}
    </section>}
    <section className="portal-section" aria-labelledby="member-start"><div className="portal-section-heading"><h2 id="member-start">{teams.length ? 'What would you like to do?' : 'Start with a project'}</h2></div><div className="portal-task-grid">
      <Link className="portal-task" href="/member/projects"><Search size={24}/><h3>Find a project</h3><p>Explore teams looking for members.</p><span>Browse projects <ArrowRight size={18}/></span></Link>
      <Link className="portal-task" href="/member/proposals?new=1"><Lightbulb size={24}/><h3>Propose an idea</h3><p>Bring a new project to the club.</p><span>Start a proposal <ArrowRight size={18}/></span></Link>
      <Link className="portal-task" href="/member/directory"><Users size={24}/><h3>Find teammates</h3><p>Meet members with shared interests.</p><span>Member directory <ArrowRight size={18}/></span></Link>
    </div></section>
    <section className="portal-section" aria-labelledby="member-teams"><div className="portal-section-heading"><h2 id="member-teams">My teams <span>{teams.length}</span></h2>{teams.length > 0 && <Link href="/member/teams">All teams <ArrowRight size={16}/></Link>}</div>
      {teams.length ? <div className="portal-link-list">{teams.slice(0, 4).map(team => <Link key={team.projectId} href={`/member/teams/${team.projectId}`}><FolderKanban size={21}/><span><strong>{team.title}</strong><small>{team.membershipRole === 'LEAD' ? 'Project lead' : 'Team member'} · {team.projectStatus.replaceAll('_', ' ')}</small></span><ArrowRight size={19}/></Link>)}</div> : <div className="portal-empty"><FolderKanban size={24}/><div><h3>No team yet</h3><p>Your team workspace will appear here when you join a project.</p></div></div>}
    </section>
    <section className="portal-section" aria-label="Application and idea status"><div className="portal-summary-links"><Link href="/member/applications"><strong>{summary.openApplications}</strong><span>Applications awaiting a decision</span><ArrowRight size={17}/></Link><Link href="/member/proposals"><strong>{summary.projectProposals}</strong><span>My project ideas</span><ArrowRight size={17}/></Link><Link href="/member/saved"><strong>{summary.saved}</strong><span>Saved items</span><ArrowRight size={17}/></Link></div></section>
  </main>
}
