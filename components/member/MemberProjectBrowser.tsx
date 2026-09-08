'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Search } from 'lucide-react'

export type MemberBrowseProject = { id: string; title: string; summary: string; disciplines: string[]; skills: string[]; recruiting: boolean; problem?: string; goal?: string }

export function MemberProjectBrowser({ projects, applications, teamIds }: { projects: MemberBrowseProject[]; applications: { projectId: string; status: string }[]; teamIds: string[] }) {
  const [query, setQuery] = useState(''), [recruiting, setRecruiting] = useState(false)
  const visible = projects.filter(project => (!recruiting || project.recruiting) && [project.title, project.summary, ...project.disciplines, ...project.skills].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <div className="portal-filter-bar"><label className="portal-search"><Search size={19}/><input type="search" aria-label="Search projects" placeholder="Search projects or skills" value={query} onChange={event => setQuery(event.target.value)}/></label><label className="portal-check"><input type="checkbox" checked={recruiting} onChange={event => setRecruiting(event.target.checked)}/>Recruiting members</label></div>
    <p className="portal-results" role="status">{visible.length} project{visible.length === 1 ? '' : 's'}</p>
    <div className="portal-project-list">{visible.map(project => {
      const application = applications.find(item => item.projectId === project.id)
      const joined = teamIds.includes(project.id)
      return <article key={project.id}>
        <div className="portal-project-heading"><div><span className={`portal-status ${project.recruiting ? 'portal-status--success' : ''}`}>{project.recruiting ? 'Recruiting members' : 'Not recruiting'}</span><h2>{project.title}</h2></div></div>
        <p>{project.summary}</p>
        {project.disciplines.length > 0 && <div className="tag-row">{project.disciplines.map(discipline => <span key={discipline}>{discipline}</span>)}</div>}
        {(project.problem || project.goal || project.skills.length > 0) && <details className="portal-project-details"><summary>Project details <ChevronDown size={16}/></summary>{project.problem && <><h3>The problem</h3><p>{project.problem}</p></>}{project.goal && <><h3>The goal</h3><p>{project.goal}</p></>}{project.skills.length > 0 && <p><strong>Skills:</strong> {project.skills.join(', ')}</p>}</details>}
        <footer>{joined ? <Link className="button button--primary" href={`/member/teams/${project.id}`} aria-label={`Open ${project.title} workspace`}>Open workspace <ArrowRight size={17}/></Link> : application ? <><span className="portal-status">{application.status === 'PENDING' ? 'Application sent' : application.status === 'ACCEPTED' ? 'Application accepted' : application.status === 'REJECTED' ? 'Application declined' : 'Application withdrawn'}</span><Link className="portal-text-link" href="/member/applications" aria-label={`View application for ${project.title}`}>View application <ArrowRight size={17}/></Link></> : project.recruiting ? <Link className="button button--primary" href={`/member/applications?project=${encodeURIComponent(project.id)}`} aria-label={`Apply to ${project.title}`}>Apply to join <ArrowRight size={17}/></Link> : <span className="portal-muted">Applications are closed for this project.</span>}</footer>
      </article>
    })}</div>
    {!visible.length && <div className="portal-empty"><div><h2>{projects.length ? 'No matching projects.' : 'No projects published yet.'}</h2>{projects.length ? <button className="button button--ghost" type="button" onClick={() => { setQuery(''); setRecruiting(false) }}>Clear filters</button> : <Link className="button button--primary" href="/member/proposals?new=1">Propose an idea <ArrowRight size={17}/></Link>}</div></div>}
  </>
}
