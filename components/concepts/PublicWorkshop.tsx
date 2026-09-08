'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, Plus } from 'lucide-react'
import type { ConceptProject } from './ConceptExperience'

const PrinterScene = dynamic(() => import('../public/PrinterScene'), { ssr: false })
type Event = { id: string; title: string; start: string; location: string }

export function PublicWorkshop({ projects, events, paused }: { projects: ConceptProject[]; events: Event[]; paused: boolean }) {
  const [discipline, setDiscipline] = useState('all')
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? '')
  const [showAssembly, setShowAssembly] = useState(false)
  const bench = useRef<HTMLElement>(null)
  const disciplines = [...new Set(projects.flatMap(project => project.disciplines))].sort()
  const filtered = discipline === 'all' ? projects : projects.filter(project => project.disciplines.includes(discipline))
  const selected = filtered.find(project => project.id === selectedId) ?? filtered[0]
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setShowAssembly(true); observer.disconnect() }
    }, { rootMargin: '350px' })
    if (bench.current) observer.observe(bench.current)
    return () => observer.disconnect()
  }, [])

  return <div className="public-workshop">
    <section className="workshop-introduction" aria-labelledby="workshop-intro-title">
      <div><p className="workshop-label">Oberlin Engineering Club</p><h2 id="workshop-intro-title">Projects, workshops, and club events</h2></div>
      <div className="workshop-intro-bottom"><p>We work on engineering projects at Oberlin, from printer repairs to electronics. You can join a team or propose a project. All majors are welcome.</p><a href="#workshop" className="workshop-round-link" aria-label="Explore the project workshop" title="Explore the project workshop"><ArrowDown size={20}/></a></div>
    </section>

    <section ref={bench} id="workshop" className="project-workbench" aria-labelledby="project-workbench-title">
      <div className="workbench-heading"><div><p className="workshop-label">01 / Projects</p><h2 id="project-workbench-title">Club projects</h2></div><Link href="/projects">All projects <ArrowUpRight size={19}/></Link></div>
      <div className="workbench-feature">
        <div className="workbench-assembly"><span className="assembly-caption">Fabrication / Illustrative assembly</span>{showAssembly && <PrinterScene variant="workbench" paused={paused}/>}</div>
        <div className="workbench-project" aria-live="polite">
          {selected ? <>
            <div className="workbench-meta"><span>{String(projects.findIndex(project => project.id === selected.id) + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}</span><span>{selected.status.replaceAll('_', ' ')}</span></div>
            <p className="workshop-label">{selected.disciplines.join(' / ') || 'Engineering'}</p>
            <h3>{selected.title}</h3><p className="workbench-summary">{selected.summary}</p>
            <div className="workbench-project-actions"><Link className="workshop-solid-link" href={selected.slug ? `/projects/${selected.slug}` : '/projects'}>View project<ArrowUpRight size={20}/></Link><Link className="workshop-text-link" href={`/get-involved?type=join_project&project=${encodeURIComponent(selected.title)}`}>Join this project<ArrowRight size={19}/></Link></div>
          </> : <p>New projects will appear here once published.</p>}
        </div>
      </div>
      <div className="workbench-index-heading"><span>Project index / {String(filtered.length).padStart(2, '0')}</span><label><span className="concept-sr">Project discipline</span><select value={discipline} onChange={event => setDiscipline(event.target.value)}><option value="all">All disciplines</option>{disciplines.map(value => <option key={value} value={value}>{value}</option>)}</select><ChevronDown size={16}/></label></div>
      <nav className="workbench-index" aria-label="Project index">{filtered.map(project => <button key={project.id} aria-pressed={selected?.id === project.id} onClick={() => { setSelectedId(project.id); bench.current?.scrollIntoView({ block: 'start', behavior: paused ? 'instant' : 'smooth' }) }}><span>{String(projects.indexOf(project) + 1).padStart(2, '0')}</span><strong>{project.title}</strong><small>{project.disciplines.join(' / ')}</small><ArrowUpRight size={22}/></button>)}</nav>
    </section>

    <section id="ideas" className="workshop-ideas" aria-labelledby="workshop-ideas-title">
      <div className="workshop-ideas-heading"><p className="workshop-label">02 / Project proposals</p><h2 id="workshop-ideas-title">Propose a project</h2></div>
      <div className="workshop-ideas-intro"><p>Tell us what you want to build or repair and what help you need. You do not need a finished plan.</p><Link className="workshop-light-link" href="/get-involved?type=propose_project">Submit your idea<ArrowUpRight size={19}/></Link></div>
      <ol className="workshop-process"><li><span>01</span><h3>Describe the problem</h3><p>Outline the question and what you want to build or test.</p></li><li><span>02</span><h3>Review the scope</h3><p>Discuss the skills, materials, and support needed with the club team.</p></li><li><span>03</span><h3>Form a project team</h3><p>Approved member proposals can become project workspaces with a lead and a team.</p></li></ol>
    </section>

    <section id="capstones" className="workshop-capstones" aria-labelledby="capstone-title">
      <div><p className="workshop-label">03 / Capstones</p><h2 id="capstone-title">Capstone discussions</h2></div>
      <div className="capstone-copy"><p className="capstone-lead">Have a capstone project in mind?</p><p>Talk with us about possible teammates, equipment, and the work involved.</p><p className="capstone-status">Confirm academic requirements and credit with your department or adviser.</p><Link className="workshop-solid-link" href="/get-involved?type=propose_project&focus=capstone">Discuss a capstone<ArrowUpRight size={19}/></Link></div>
    </section>

    <section className="workshop-community" aria-labelledby="community-title">
      <div><p className="workshop-label">04 / Around the workshop</p><h2 id="community-title">Workshops &amp; meetups</h2><p>Meet project teams, take part in a workshop, or talk through an idea at a club event.</p><Link className="workshop-solid-link" href="/get-involved">Join the club<ArrowUpRight size={19}/></Link><Link className="workshop-text-link" href="/events">Events & meetups<ArrowRight size={18}/></Link></div>
      <div className="workshop-questions">
        {events.slice(0, 2).map(event => <Link className="workshop-event" key={event.id} href="/events"><span>{new Date(event.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}</span><strong>{event.title}</strong><ArrowUpRight size={19}/></Link>)}
        <details open><summary>Do I need engineering experience?<Plus size={19}/></summary><p>No. Beginners can join a project team and learn alongside other members.</p></details>
        <details><summary>Do I need to be in the 3-2 program?<Plus size={19}/></summary><p>No. Students from any major can take part. The club also shares resources for students exploring the 3-2 pathway.</p></details>
        <details><summary>Can I start my own project?<Plus size={19}/></summary><p>Yes. Submit your idea to start a conversation. Active members can submit a proposal in their workspace for review by the club team.</p></details>
        <details><summary>What happens after I get in touch?<Plus size={19}/></summary><p>Your request goes to the OEC team. They can follow up at the email you provide about your interests, a project, or your proposal.</p></details>
      </div>
    </section>
    <footer className="workshop-footer"><Link href="/">Oberlin<br/>Engineering Club</Link><p>Oberlin, Ohio</p><nav aria-label="More club information"><Link href="/about">About</Link><Link href="/pathway">3-2 pathway</Link><Link href="/resources">Resources</Link><Link href="/member/login">Member sign in</Link></nav><a href="#top" aria-label="Back to top"><ArrowUpRight size={28}/></a></footer>
  </div>
}
