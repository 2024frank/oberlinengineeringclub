'use client'
import Link from 'next/link'
import { useState } from 'react'
import type { ProjectApplication } from '@/lib/projects/applications'
import { ProjectInterestDecision } from './ProjectInterestDecision'

const outcomes = { MEMBER: 'Added to team', LEAD: 'Appointed lead', DECLINED: 'Declined' } as const

export function ProjectApplicationQueue({ initialRows }: { initialRows: ProjectApplication[] }) {
  const [decided, setDecided] = useState<Record<string, keyof typeof outcomes>>({})
  if (!initialRows.length) return <div className="portal-empty"><div><h2>No applications waiting</h2><p>When members apply to a project, they show up here and on that project&apos;s team page.</p><Link className="portal-text-link" href="/admin/project-teams">Open project teams</Link></div></div>
  return <div className="application-list">{initialRows.map(row => <article className="content-card" key={row.id}>
    <span className="status-pill">{decided[row.id] ? outcomes[decided[row.id]] : 'Waiting'}</span>
    <h2><Link href={`/admin/project-teams/${row.projectId}`}>{row.projectTitle}</Link></h2>
    <p><strong>{row.applicantName || 'Member'}</strong>{row.applicantEmail && <> <a href={`mailto:${row.applicantEmail}`}>{row.applicantEmail}</a></>}</p>
    <p>{row.motivation}</p>
    {row.skills.length > 0 && <div className="tag-row">{row.skills.map(skill => <span key={skill}>{skill}</span>)}</div>}
    <ProjectInterestDecision source="application" requestId={row.id} projectId={row.projectId} projectTitle={row.projectTitle} memberName={row.applicantName || 'Member'} memberEmail={row.applicantEmail} onDone={outcome => setDecided(previous => ({ ...previous, [row.id]: outcome }))}/>
  </article>)}</div>
}
