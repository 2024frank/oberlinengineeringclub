import Link from 'next/link'
import { ArrowRight, Bell, FolderKanban, Lightbulb, Search, Users } from 'lucide-react'
import type { MemberDashboardSummary } from '@/lib/members/dashboard'
import type { ProjectOverview, WorkspaceSummary } from '@/lib/projects/workspace'
import type { MemberWork } from '@/lib/projects/memberActivity'
import type { ClubTeam } from '@/lib/teams/types'
import { formatDueDate, isOverdue, milestoneStatusLabels, postKindLabels, relativeTime } from '@/lib/projects/labels'
import { MilestoneMeter } from '@/components/projects/MilestoneMeter'
import { QuickMilestoneAction } from './workspace/QuickMilestoneAction'

const emptyWork: MemberWork = { mine: [], unclaimed: [], posts: [] }

function headline(work: MemberWork, hasProjects: boolean) {
  const overdue = work.mine.filter(m => isOverdue(m.dueDate, m.status)).length
  if (work.mine.length) return `You own ${work.mine.length} open milestone${work.mine.length === 1 ? '' : 's'}${overdue ? `, and ${overdue === 1 ? 'one is' : `${overdue} are`} overdue` : ''}.`
  if (work.unclaimed.length) return 'Your teams have milestones nobody has taken yet.'
  if (hasProjects) return 'Here is where your projects stand.'
  return 'Join a project team, or bring an idea of your own.'
}

export function MemberDashboard({ displayName, summary, teams, clubTeams = [], progress = [], work = emptyWork }: { displayName: string; summary: MemberDashboardSummary; teams: WorkspaceSummary[]; clubTeams?: ClubTeam[]; progress?: ProjectOverview[]; work?: MemberWork }) {
  const hasProjects = teams.length > 0
  const tasks = <div className="portal-task-grid">
    <Link className="portal-task" href="/member/projects"><Search size={24}/><h3>Find a project</h3><p>Explore teams looking for members.</p><span>Browse projects <ArrowRight size={18}/></span></Link>
    <Link className="portal-task" href="/member/proposals?new=1"><Lightbulb size={24}/><h3>Propose an idea</h3><p>Bring a new project to the club.</p><span>Start a proposal <ArrowRight size={18}/></span></Link>
    <Link className="portal-task" href="/member/directory"><Users size={24}/><h3>Find teammates</h3><p>Meet members with shared interests.</p><span>Member directory <ArrowRight size={18}/></span></Link>
  </div>
  return <main className="admin-panel portal-home pt-page">
    <div className="admin-page-heading"><div><h1>Hi, {displayName.trim().split(' ')[0]}.</h1><p>{headline(work, hasProjects)}</p></div><Link className="portal-text-link" href="/member/profile">My profile <ArrowRight size={16}/></Link></div>
    {(summary.pendingInvitations > 0 || summary.unreadNotifications > 0) && <section className="portal-attention" aria-label="Your next actions">
      {summary.pendingInvitations > 0 && <Link href="/member/invitations"><Users size={21}/><span><strong>{summary.pendingInvitations} team invitation{summary.pendingInvitations === 1 ? '' : 's'}</strong><small>Waiting for your response</small></span><ArrowRight size={20}/></Link>}
      {summary.unreadNotifications > 0 && <Link href="/member/notifications"><Bell size={21}/><span><strong>{summary.unreadNotifications} unread update{summary.unreadNotifications === 1 ? '' : 's'}</strong><small>Club and project activity</small></span><ArrowRight size={20}/></Link>}
    </section>}
    {!hasProjects && <section className="portal-section" aria-labelledby="member-start"><div className="portal-section-heading"><h2 id="member-start">Start with a project</h2></div>{tasks}</section>}

    {hasProjects && <section className="portal-section" aria-labelledby="member-projects"><div className="portal-section-heading"><h2 id="member-projects">Your projects <span>{teams.length}</span></h2><Link href="/member/teams">All teams <ArrowRight size={16}/></Link></div>
      <div className="dash-projects">{teams.slice(0, 6).map(team => {
        const item = progress.find(entry => entry.projectId === team.projectId)
        return <Link key={team.projectId} className="dash-project" href={`/member/teams/${team.projectId}`}>
          <span className="dash-project__title"><strong>{team.title}</strong><small>{team.membershipRole === 'LEAD' ? 'You lead this project' : 'Team member'}{item?.myOpenMilestones ? `, ${item.myOpenMilestones} milestone${item.myOpenMilestones === 1 ? '' : 's'} yours` : ''}</small></span>
          <span className="dash-project__progress">{item?.milestonesTotal ? <MilestoneMeter done={item.milestonesDone} total={item.milestonesTotal}/> : <small>No milestones yet</small>}{item?.nextMilestone && <small className={isOverdue(item.nextMilestone.dueDate, item.nextMilestone.status) ? 'pt-overdue' : ''}>Next: {item.nextMilestone.title}{item.nextMilestone.dueDate ? `, due ${formatDueDate(item.nextMilestone.dueDate)}` : ''}</small>}</span>
          <ArrowRight size={18} aria-hidden="true"/>
        </Link>
      })}</div>
    </section>}

    {hasProjects && (work.mine.length > 0 || work.unclaimed.length > 0 || work.posts.length > 0) && <div className="dash-columns">
      <section className="pt-card" aria-labelledby="member-milestones">
        <h2 id="member-milestones">Your milestones</h2>
        {work.mine.length ? <ul className="dash-list">{work.mine.map(m => <li key={m.id}>
          <div><strong>{m.title}</strong><small><Link href={`/member/teams/${m.projectId}`}>{m.projectTitle}</Link>{m.dueDate && <span className={isOverdue(m.dueDate, m.status) ? 'pt-overdue' : ''}>{isOverdue(m.dueDate, m.status) ? 'Overdue, was due' : 'Due'} {formatDueDate(m.dueDate)}</span>}<span>{milestoneStatusLabels[m.status]}</span></small></div>
          <QuickMilestoneAction projectId={m.projectId} milestoneId={m.id} title={m.title} mode="done"/>
        </li>)}</ul> : <p className="pt-hint">You have no milestones of your own right now.</p>}
        {work.unclaimed.length > 0 && <>
          <h3 className="dash-subhead">Up for grabs</h3>
          <ul className="dash-list">{work.unclaimed.map(m => <li key={m.id}>
            <div><strong>{m.title}</strong><small><Link href={`/member/teams/${m.projectId}`}>{m.projectTitle}</Link>{m.dueDate && <span>Due {formatDueDate(m.dueDate)}</span>}</small></div>
            <QuickMilestoneAction projectId={m.projectId} milestoneId={m.id} title={m.title} mode="claim"/>
          </li>)}</ul>
        </>}
      </section>
      <section className="pt-card" aria-labelledby="member-activity">
        <h2 id="member-activity">Latest from your teams</h2>
        {work.posts.length ? <ul className="pt-feed">{work.posts.map(post => <li className="pt-post" key={post.id}>
          <header><strong>{post.authorName}</strong><span className={`pt-pill ${post.kind === 'BLOCKER' ? 'pt-pill--bad' : post.kind === 'WIN' ? 'pt-pill--good' : post.kind === 'QUESTION' ? 'pt-pill--warn' : ''}`}>{postKindLabels[post.kind]}</span><time dateTime={post.createdAt} suppressHydrationWarning>{relativeTime(post.createdAt)}</time></header>
          <p>{post.body.length > 220 ? `${post.body.slice(0, 220).trimEnd()}...` : post.body}</p>
          <Link className="dash-post-link" href={`/member/teams/${post.projectId}#team-feed`}>{post.projectTitle}</Link>
        </li>)}</ul> : <p className="pt-hint">No team posts yet. Share what you worked on in your project&apos;s team feed.</p>}
      </section>
    </div>}

    {hasProjects && <section className="portal-section" aria-labelledby="member-more"><div className="portal-section-heading"><h2 id="member-more">More to do</h2></div>{tasks}</section>}

    <section className="portal-section" aria-labelledby="member-teams"><div className="portal-section-heading"><h2 id="member-teams">Club teams <span>{clubTeams.length}</span></h2><Link href="/member/teams/find">Find a team <ArrowRight size={16}/></Link></div>
      {clubTeams.length > 0 ? <div className="portal-link-list">{clubTeams.map(team => <Link href={`/member/teams/group/${team.id}`} key={team.id}><Users size={20}/><span><strong>{team.name}</strong><small>{team.roster.length} member{team.roster.length === 1 ? '' : 's'}</small></span><ArrowRight size={16}/></Link>)}</div>
        : <div className="portal-empty"><FolderKanban size={24}/><div><h3>No club team yet</h3><p>Club teams are groups of members who work together before or across projects.</p><Link className="portal-text-link" href="/member/teams/new">Create a team</Link></div></div>}
    </section>
    <section className="portal-section" aria-label="Application and idea status"><div className="portal-summary-links"><Link href="/member/applications"><strong>{summary.openApplications}</strong><span>Applications awaiting a decision</span><ArrowRight size={17}/></Link><Link href="/member/proposals"><strong>{summary.projectProposals}</strong><span>My project ideas</span><ArrowRight size={17}/></Link><Link href="/member/saved"><strong>{summary.saved}</strong><span>Saved items</span><ArrowRight size={17}/></Link></div></section>
  </main>
}
