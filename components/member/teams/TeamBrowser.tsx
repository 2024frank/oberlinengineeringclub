'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, Users } from 'lucide-react'
import type { ClubTeam, TeamPerson } from '@/lib/teams/types'

export function TeamRoster({ people }: { people: TeamPerson[] }) {
  return <ul className="team-people">{people.map((person, index) => <li key={person.userId ?? `private-${index}`}><span className="team-avatar" aria-hidden="true">{person.displayName.slice(0,1)}</span><span>{person.displayName}<small>{person.role === 'LEAD' ? 'Lead' : 'Member'}</small></span></li>)}</ul>
}
export function TeamBrowser({ teams, admin = false }: { teams: ClubTeam[]; admin?: boolean }) {
  const [query, setQuery] = useState(''), [recruiting, setRecruiting] = useState(false)
  const visible = teams.filter(team => (!recruiting || team.recruiting) && [team.name, team.description, ...team.roster.map(person => person.displayName), ...team.projects.map(project => project.title)].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <><div className="portal-filter-bar"><label className="portal-search"><Search size={18}/><input aria-label="Search teams" type="search" placeholder="Search teams, members or projects" value={query} onChange={event => setQuery(event.target.value)}/></label><label className="portal-check"><input type="checkbox" checked={recruiting} onChange={event => setRecruiting(event.target.checked)}/>Recruiting teams</label></div>
    <p role="status" className="portal-results">{visible.length} team{visible.length === 1 ? '' : 's'}</p>
    <div className="team-list">{visible.map(team => <article className="team-list-row" key={team.id}>
      <div><span className="portal-status">{team.recruiting ? 'Recruiting' : 'Not recruiting'}</span><h2><Link href={admin ? `/admin/teams/${team.id}` : `/member/teams/group/${team.id}`}>{team.name}</Link></h2><p>{team.description}</p><p className="team-count"><Users size={16}/>{team.roster.length} members{team.myRole && ` · ${team.myRole === 'LEAD' ? 'You lead this team' : 'Your team'}`}</p></div>
      <div><TeamRoster people={team.roster}/><p className="team-project-names">{team.projects.length ? team.projects.map(project => `${project.title}${project.status !== 'APPROVED' ? ` (${project.status.toLowerCase()})` : ''}`).join(', ') : 'Choosing a project'}</p><Link className="portal-text-link" href={admin ? `/admin/teams/${team.id}` : `/member/teams/group/${team.id}`}>View team <ArrowRight size={16}/></Link></div>
    </article>)}</div>
    {!visible.length && <div className="portal-empty"><div><h2>{teams.length ? 'No matching teams' : 'No teams yet'}</h2>{teams.length ? <button className="button button--ghost" onClick={() => { setQuery(''); setRecruiting(false) }}>Clear filters</button> : !admin && <Link className="portal-text-link" href="/member/teams/new">Create a team <ArrowRight size={16}/></Link>}</div></div>}
  </>
}
