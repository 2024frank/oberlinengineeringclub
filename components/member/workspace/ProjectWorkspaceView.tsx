import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import type { ClubTeam } from '@/lib/teams/types'
import type { DirectoryMember } from '@/lib/members/directory'
import type { ProjectApplication } from '@/lib/projects/applications'
import type { ProjectWorkspace } from '@/lib/projects/workspace'
import { stageLabel } from '@/lib/projects/labels'
import { TeamProjectRequests } from '@/components/member/teams/TeamWorkspace'
import { ApplicationReviewList, RosterManager, TeamInviteForm, TeamUpdateForm } from '@/components/member/ProjectWorkspaceActions'
import { MilestoneBoard } from './MilestoneBoard'
import { KickoffBanner, LeaveProject, TeamFeed, TeamLinks, UpdateHistory } from './TeamActivity'

export function ProjectWorkspaceView({ projectId, workspace, applications = [], directory = [], clubTeams = [] }: { projectId: string; workspace: ProjectWorkspace; applications?: ProjectApplication[]; directory?: DirectoryMember[]; clubTeams?: ClubTeam[] }) {
  const isLead = workspace.myRole === 'LEAD'
  const { project, roster, milestones } = workspace
  const done = milestones.filter(m => m.status === 'DONE').length
  const soleLead = isLead && roster.length > 1 && roster.filter(person => person.role === 'LEAD').length === 1
  return <main className="admin-panel pt-page">
    <Link className="pt-back" href="/member/teams"><ArrowLeft size={16}/>My teams</Link>
    <div className="admin-page-heading">
      <div>
        <div className="pt-pills"><span className={`pt-pill ${project.status === 'active' ? 'pt-pill--good' : ''}`}>{stageLabel(project.status)}</span><span className="pt-pill">{isLead ? 'You lead this project' : 'Team member'}</span></div>
        <h1>{project.title}</h1>
        <p>{project.summary || 'Private team coordination space.'}</p>
      </div>
      {project.publicationState === 'published' && <a className="button button--ghost" href={`/projects/${project.slug}`} target="_blank" rel="noreferrer">Public project page <ArrowUpRight size={16}/></a>}
    </div>
    <p className="pt-summary">
      <span>{roster.length} on the team</span>
      {milestones.length > 0 && <span className="pt-progress"><span>{done} of {milestones.length} milestones done</span><span className="pt-progress__bar" aria-hidden="true"><span style={{ width: `${Math.round(done / milestones.length * 100)}%` }}/></span></span>}
      {project.nextStep && <span>Next step: {project.nextStep}</span>}
    </p>
    <div className="pt-stack">
      {workspace.kickoff && <KickoffBanner kickoff={workspace.kickoff}/>}
      {isLead && <TeamProjectRequests teams={clubTeams} projectId={projectId}/>}
      {isLead && <ApplicationReviewList applications={applications}/>}
      <div className="pt-grid">
        <div className="pt-stack">
          <TeamFeed projectId={projectId} posts={workspace.posts} me={workspace.me} isLead={isLead}/>
          <MilestoneBoard projectId={projectId} milestones={milestones} roster={roster} me={workspace.me} isLead={isLead}/>
        </div>
        <div className="pt-stack">
          {isLead ? <RosterManager projectId={projectId} roster={roster}/> : <RosterReadOnly roster={roster}/>}
          <TeamLinks projectId={projectId} links={workspace.links} me={workspace.me} isLead={isLead} githubUrl={project.githubUrl} externalUrl={project.externalUrl}/>
          {isLead && <TeamInviteForm projectId={projectId} members={directory} roster={roster}/>}
          <LeaveProject projectId={projectId} projectTitle={project.title} soleLead={soleLead}/>
        </div>
      </div>
      <section className="pt-card" aria-labelledby="ws-public-update">
        <h2 id="ws-public-update">Share progress on the website</h2>
        <p className="pt-hint">Post a public update for the project page. An officer reviews it before it goes live. For quick notes to your team, use the team feed above.</p>
        <details><summary className="portal-text-link">Write a website update</summary><div style={{ marginTop: 12 }}><TeamUpdateForm projectId={projectId}/></div></details>
        <h3 style={{ margin: '20px 0 4px', fontSize: 15 }}>Submitted updates</h3>
        <UpdateHistory projectId={projectId} updates={workspace.updates} me={workspace.me} isLead={isLead}/>
      </section>
    </div>
  </main>
}

function RosterReadOnly({ roster }: { roster: ProjectWorkspace['roster'] }) {
  return <section className="pt-card" aria-labelledby="ws-roster"><div className="pt-card-head"><h2 id="ws-roster">Team</h2><span className="portal-muted">{roster.length} {roster.length === 1 ? 'person' : 'people'}</span></div>
    <ul className="pt-roster">{roster.map(member => <li key={member.userId} style={{ gridTemplateColumns: '36px minmax(0,1fr)' }}><span className={`pt-avatar ${member.role === 'LEAD' ? 'pt-avatar--lead' : ''}`} aria-hidden="true">{member.displayName.slice(0, 1).toUpperCase()}</span><span className="pt-person"><strong>{member.displayName}</strong><small>{member.role === 'LEAD' ? 'Project lead' : 'Team member'}</small></span></li>)}</ul>
  </section>
}
