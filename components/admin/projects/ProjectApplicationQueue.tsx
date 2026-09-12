'use client'
import { useState } from 'react'
import type { ProjectApplication } from '@/lib/projects/applications'
import { ProjectLeadApproval } from './ProjectLeadApproval'

export function ProjectApplicationQueue({ initialRows }: { initialRows: ProjectApplication[] }) {
  const [approved, setApproved] = useState<string[]>([])
  if (!initialRows.length) return <div className="empty-state"><h2>No pending project applications.</h2></div>
  return <div className="application-list">{initialRows.map(row => <article className="content-card" key={row.id}>
    <span className="status-pill">{approved.includes(row.id) ? 'Approved as lead' : 'Pending'}</span>
    <h2>{row.projectTitle}</h2>
    <p><strong>{row.applicantName || 'Member'}</strong>{row.applicantEmail && <> <a href={`mailto:${row.applicantEmail}`}>{row.applicantEmail}</a></>}</p>
    <p>{row.motivation}</p>
    <div className="tag-row">{row.skills.map(skill => <span key={skill}>{skill}</span>)}</div>
    <ProjectLeadApproval source="application" requestId={row.id} projectId={row.projectId} projectTitle={row.projectTitle} memberName={row.applicantName || 'Member'} memberEmail={row.applicantEmail} onApproved={() => setApproved(previous => [...previous, row.id])}/>
  </article>)}</div>
}
