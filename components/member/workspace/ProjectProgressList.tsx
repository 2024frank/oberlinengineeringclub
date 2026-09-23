import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ProjectOverview } from '@/lib/projects/workspace'
import { formatDueDate, isOverdue, relativeTime, stageLabel } from '@/lib/projects/labels'

export function progressLine(project: ProjectOverview) {
  const parts = [project.milestonesTotal ? `${project.milestonesDone} of ${project.milestonesTotal} milestones done` : 'No milestones yet']
  if (project.myOpenMilestones) parts.push(`${project.myOpenMilestones} yours`)
  return parts.join(' · ')
}

export function ProjectProgressList({ projects }: { projects: ProjectOverview[] }) {
  return <div className="pt-list">{projects.map(project => {
    const percent = project.milestonesTotal ? Math.round(project.milestonesDone / project.milestonesTotal * 100) : 0
    const next = project.nextMilestone
    return <article className="pt-row" key={project.projectId} style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1.4fr) auto' }}>
      <div>
        <h2><Link href={`/member/teams/${project.projectId}`}>{project.title}</Link></h2>
        <div className="pt-pills"><span className={`pt-pill ${project.status === 'active' ? 'pt-pill--good' : ''}`}>{stageLabel(project.status)}</span><span className="pt-pill">{project.role === 'LEAD' ? 'You lead' : 'Team member'}</span><span className="pt-pill">{project.memberCount} on the team</span></div>
      </div>
      <div className="pt-progress">
        <span>{progressLine(project)}</span>
        {project.milestonesTotal > 0 && <div className="pt-progress__bar" aria-hidden="true"><span style={{ width: `${percent}%` }}/></div>}
        {next && <span className={isOverdue(next.dueDate, next.status) ? 'pt-overdue' : ''}>Next: {next.title}{next.dueDate ? ` (due ${formatDueDate(next.dueDate)})` : ''}</span>}
        {project.lastPostAt && <span>Last team post {relativeTime(project.lastPostAt)}</span>}
      </div>
      <div className="pt-row-actions"><Link className="button button--ghost" href={`/member/teams/${project.projectId}`} aria-label={`Open ${project.title} workspace`}>Open <ArrowRight size={16}/></Link></div>
    </article>
  })}</div>
}
