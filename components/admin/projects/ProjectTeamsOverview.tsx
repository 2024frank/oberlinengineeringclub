'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import type { ProjectTeamSummary } from '@/lib/projects/teamAdmin'
import { publicationLabel, relativeTime, stageLabel } from '@/lib/projects/labels'

const filters = {
  all: { label: 'All projects', test: (p: ProjectTeamSummary) => p.publicationState !== 'archived' },
  'no-members': { label: 'No members yet', test: (p: ProjectTeamSummary) => p.publicationState !== 'archived' && p.memberCount === 0 },
  'needs-lead': { label: 'Needs a lead', test: (p: ProjectTeamSummary) => p.publicationState !== 'archived' && p.memberCount > 0 && p.leads.length === 0 },
  applications: { label: 'Applications waiting', test: (p: ProjectTeamSummary) => p.pendingApplications > 0 },
  ready: { label: 'Ready to start', test: (p: ProjectTeamSummary) => p.publicationState !== 'archived' && p.memberCount > 0 && !p.startedAt && p.status !== 'complete' },
  underway: { label: 'Underway', test: (p: ProjectTeamSummary) => Boolean(p.startedAt) && p.status !== 'complete' && p.publicationState !== 'archived' },
  archived: { label: 'Hidden', test: (p: ProjectTeamSummary) => p.publicationState === 'archived' },
} as const
export type ProjectTeamFilter = keyof typeof filters
export const isProjectTeamFilter = (value: string): value is ProjectTeamFilter => Object.hasOwn(filters, value)

export function ProjectTeamsOverview({ projects, initialFilter = 'all' }: { projects: ProjectTeamSummary[]; initialFilter?: ProjectTeamFilter }) {
  const [filter, setFilter] = useState<ProjectTeamFilter>(initialFilter), [query, setQuery] = useState('')
  const counts = useMemo(() => Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, projects.filter(value.test).length])) as Record<ProjectTeamFilter, number>, [projects])
  const needle = query.trim().toLowerCase()
  const visible = projects.filter(filters[filter].test).filter(p => !needle || [p.title, ...p.leads].join(' ').toLowerCase().includes(needle))
  return <>
    <div className="pt-toolbar">
      <div className="pt-chips" role="group" aria-label="Filter projects">{(Object.keys(filters) as ProjectTeamFilter[]).filter(key => key === 'all' || counts[key] > 0 || key === filter).map(key => <button type="button" key={key} className="pt-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>{filters[key].label}<span>{counts[key]}</span></button>)}</div>
      <label className="pt-search"><Search size={17} aria-hidden="true"/><input type="search" aria-label="Search project teams" placeholder="Search projects or leads" value={query} onChange={event => setQuery(event.target.value)}/></label>
    </div>
    <p className="portal-results" role="status">{visible.length} project{visible.length === 1 ? '' : 's'}</p>
    {visible.length ? <div className="pt-list">{visible.map(project => <ProjectTeamRow key={project.id} project={project}/>)}</div>
      : <div className="portal-empty"><div><h2>{projects.length ? 'No projects match' : 'No projects yet'}</h2>{projects.length ? <button type="button" className="button button--ghost" onClick={() => { setFilter('all'); setQuery('') }}>Show all projects</button> : <Link className="portal-text-link" href="/admin/projects?new=1">Add a project</Link>}</div></div>}
  </>
}

function ProjectTeamRow({ project }: { project: ProjectTeamSummary }) {
  const percent = project.milestonesTotal ? Math.round(project.milestonesDone / project.milestonesTotal * 100) : 0
  return <article className="pt-row">
    <div>
      <h2><Link href={`/admin/project-teams/${project.id}`}>{project.title}</Link></h2>
      <div className="pt-pills">
        <span className={`pt-pill ${project.status === 'active' ? 'pt-pill--good' : ''}`}>{stageLabel(project.status)}</span>
        <span className={`pt-pill ${project.publicationState === 'published' ? '' : 'pt-pill--warn'}`}>{publicationLabel(project.publicationState)}</span>
        {project.recruiting && project.publicationState === 'published' && <span className="pt-pill pt-pill--accent">Recruiting</span>}
      </div>
    </div>
    <div className="pt-team-line">{project.memberCount === 0 ? <span className="pt-pill pt-pill--warn">No members yet</span> : <>{project.memberCount} member{project.memberCount === 1 ? '' : 's'}<small>{project.leads.length ? `Lead: ${project.leads.join(', ')}` : 'No lead yet'}</small></>}{project.pendingApplications > 0 && <div><span className="pt-pill pt-pill--accent">{project.pendingApplications} application{project.pendingApplications === 1 ? '' : 's'} waiting</span></div>}</div>
    <div className="pt-progress">
      {project.milestonesTotal ? <><span>{project.milestonesDone} of {project.milestonesTotal} milestones done</span><div className="pt-progress__bar" aria-hidden="true"><span style={{ width: `${percent}%` }}/></div></> : <span>No milestones yet</span>}
      <span>{project.startedAt ? `Started ${relativeTime(project.startedAt)}` : 'Not started'}{project.lastActivityAt ? ` · Active ${relativeTime(project.lastActivityAt)}` : ''}</span>
    </div>
    <div className="pt-row-actions pt-actions">
      <Link className="button button--ghost" href={`/admin/project-teams/${project.id}`} aria-label={`Manage ${project.title} team`}>Manage <ArrowRight size={16}/></Link>
    </div>
  </article>
}
