'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowUpRight, Search } from 'lucide-react'

export type ProjectCardData={id:string;slug:string;title:string;summary:string;status:string;disciplines:string[];image?:{url:string;alt:string}}
export function ProjectCards({projects,searchable=false}:{projects:ProjectCardData[];searchable?:boolean}) {
  const [query,setQuery]=useState('')
  const [discipline,setDiscipline]=useState('')
  const disciplines=[...new Set(projects.flatMap(p=>p.disciplines))].sort()
  const filtered=projects.filter(p=>(!discipline||p.disciplines.includes(discipline))&&[p.title,p.summary,...p.disciplines].join(' ').toLowerCase().includes(query.toLowerCase()))
  return <>{searchable&&<div className="project-search"><label className="search-field"><Search size={18} aria-hidden="true"/><input aria-label="Search projects" type="search" placeholder="Search projects" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Project discipline" value={discipline} onChange={e=>setDiscipline(e.target.value)}><option value="">All disciplines</option>{disciplines.map(d=><option key={d} value={d}>{d}</option>)}</select><span role="status">{filtered.length} projects</span></div>}
  <div className="project-grid">{filtered.map(p=><Link className="project-tile" href={'/projects/'+p.slug} key={p.id}>{p.image&&<div className="project-tile__image"><Image src={p.image.url} alt={p.image.alt||p.title} fill sizes="(max-width:600px) 90vw,(max-width:1000px) 44vw,390px"/></div>}<div className="project-tile__body"><span className="project-discipline">{p.disciplines.join(' / ')}</span><h3>{p.title}</h3><p>{p.summary}</p></div><div className="project-tile__footer"><span className="project-state">{p.status.replaceAll('_',' ').toLowerCase()}</span><ArrowUpRight size={21} aria-hidden="true"/></div></Link>)}</div>
  {!filtered.length&&<div className="empty-state"><h3>No matching projects</h3><p>Try a different search or discipline.</p><button className="button button--secondary" onClick={()=>{setQuery('');setDiscipline('')}}>Clear search</button></div>}</>
}
