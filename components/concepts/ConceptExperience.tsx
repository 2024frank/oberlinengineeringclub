'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Menu, X, Pause, Play, RotateCcw, Search, SlidersHorizontal, Hand, CalendarDays } from 'lucide-react'
import { ConceptJoinFlow } from './ConceptJoinFlow'
import { ConceptPanel } from './ConceptPanel'
import { RobotFirstFrame } from './RobotFirstFrame'
import { MachineFirstFrame } from './MachineFirstFrame'
import { PublicWorkshop } from './PublicWorkshop'
import type { Direction } from './worlds'

const ConceptScene = dynamic(() => import('./ConceptScene'), { ssr: false })
export type ConceptProject = { id: string; slug?: string; title: string; summary: string; status: string; disciplines: string[] }
type ConceptEvent = { id: string; title: string; start: string; location: string }
type View = 'home' | 'projects' | 'events' | 'about' | 'join' | 'menu' | 'page'
const names: Record<Direction, string> = { robot: 'Robot Companion', machine: 'The Machine', hall: 'Invention Hall', workbench: 'Workbench' }
const viewForPath = (path: string): View => path === '/' ? 'home' : path === '/projects' ? 'projects' : path === '/get-involved' ? 'join' : path === '/events' ? 'events' : path === '/about' ? 'about' : 'page'

export function ConceptExperience({ direction, projects, events, publicMode = false, children }: { direction: Direction; projects: ConceptProject[]; events: ConceptEvent[]; publicMode?: boolean; children?: ReactNode }) {
  const pathname = usePathname(), router = useRouter()
  const [view, setView] = useState<View>(publicMode ? viewForPath(pathname) : 'home'), [paused, setPaused] = useState(false), [active, setActive] = useState(false), [reset, setReset] = useState(0)
  const [progress, setProgress] = useState(0), [search, setSearch] = useState(''), [project, setProject] = useState<ConceptProject | null>(null), [greeted, setGreeted] = useState(false)
  const [surface, setSurface] = useState<HTMLDivElement | null>(null)
  const [previousPath, setPreviousPath] = useState(pathname)
  if (publicMode && previousPath !== pathname) {
    const next = viewForPath(pathname); setPreviousPath(pathname); setView(next); setProgress(next === 'join' ? 1 : 0)
  }
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setPaused(preference.matches); sync(); preference.addEventListener('change', sync)
    return () => preference.removeEventListener('change', sync)
  }, [])
  useEffect(() => {
    const sync = (event: Event) => { const detail = (event as CustomEvent<{ phase: number }>).detail; if (publicMode) setProgress(detail.phase + 1) }
    window.addEventListener('oec-join-progress', sync)
    return () => window.removeEventListener('oec-join-progress', sync)
  }, [publicMode])
  useEffect(() => {
    if (!publicMode || view !== 'home') return
    const id = window.location.hash.slice(1)
    if (!['workshop', 'capstones', 'ideas'].includes(id)) {
      const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
      return () => cancelAnimationFrame(frame)
    }
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [publicMode, pathname, view])
  const open = (next: View) => {
    setView(next); if (next === 'join') setProgress(1)
    if (publicMode && next !== 'menu') router.push(next === 'join' ? '/get-involved' : next === 'home' ? '/' : `/${next}`)
  }
  const close = useCallback(() => { setView('home'); setProgress(0); if (publicMode) router.push('/') }, [publicMode, router])
  const followJoinLink = () => { setView('join'); setProgress(1) }
  const filtered = projects.filter(p => `${p.title} ${p.summary} ${p.disciplines.join(' ')}`.toLowerCase().includes(search.toLowerCase()))
  const panelTitle = view === 'page' ? pathname.startsWith('/projects/') ? 'Project details' : pathname.startsWith('/events/') ? 'Event details' : ({ '/resources': 'Resources', '/pathway': '3-2 pathway', '/opportunities': 'Opportunities', '/news': 'News' }[pathname] ?? 'Club information') : view === 'join' ? 'Registration' : view === 'menu' ? 'Oberlin Engineering Club' : view
  function sceneAction(action: string) {
    if (action === 'greet') { setGreeted(true); return }
    if (action === 'activate') { setActive(a => !a); return }
    if (['projects', 'join', 'about'].includes(action)) open(action as View)
  }
  return <main id="top" className={`concept-app concept-${direction} ${publicMode ? 'concept-public' : ''} ${view !== 'home' ? 'concept-is-open' : ''}`}>
    <div className="concept-stage">
    {direction === 'robot' && <RobotFirstFrame/>}
    {direction === 'machine' && <MachineFirstFrame/>}
    <ConceptScene key={direction} direction={direction} view={view} paused={paused} progress={progress} active={active} reset={reset} onAction={sceneAction} onSurfaceReady={setSurface}/>
    <header className="concept-header">
      <button className="concept-brand" onClick={close} aria-label="Oberlin Engineering Club home"><Image src="/brand/oec-badge-circle.png" width={72} height={72} alt="Oberlin Engineering Club badge" priority/><span>{direction === 'hall' ? <>The Invention<br/>Hall</> : <>Oberlin<br/>Engineering Club</>}</span></button>
      <nav aria-label="Main navigation"><button onClick={() => { setProject(null); open('projects') }}>Projects</button>{publicMode && <Link href="/#capstones" scroll={false} onClick={() => { if (view === 'home') document.getElementById('capstones')?.scrollIntoView({ block: 'start', behavior: paused ? 'instant' : 'smooth' }) }}>Capstones</Link>}<button onClick={() => open('events')}>Events</button><button onClick={() => open('about')}>About</button></nav>
      {direction === 'hall' && <button className="concept-primary concept-header-join" onClick={() => { setProject(null); open('join') }}>Join the club<ArrowUpRight size={22}/></button>}
      <button className="concept-icon concept-menu-button" title="Open menu" aria-label="Open menu" onClick={() => open('menu')}><Menu size={25}/></button>
    </header>
    <div className="concept-hero">
      <h1 className={direction === 'robot' ? 'concept-title' : 'concept-sr'}>Oberlin<br/>Engineering<br/>Club</h1>
      {publicMode && <p className="concept-purpose">Engineering projects at Oberlin.<br/>All majors and experience levels welcome.</p>}
      <div className="concept-hero-actions">
        <button ref={button} className="concept-primary concept-join-button" onClick={() => { setProject(null); open('join') }}>Join the club<span><ArrowRight size={31}/></span></button>
        {publicMode ? <a className="concept-explore" href="#workshop">Explore the workshop<ArrowDownRight size={23}/></a> : <button className="concept-explore" onClick={() => { setProject(null); open('projects') }}>Explore projects<ArrowUpRight size={23}/></button>}
      </div>
    </div>
    <div className="concept-scene-tools">
      {direction === 'machine' && <button className={`concept-icon ${active ? 'active' : ''}`} title={active ? 'Assemble machine' : 'Expand machine'} aria-label={active ? 'Assemble machine' : 'Expand machine'} aria-pressed={active} onClick={() => setActive(a => !a)}><SlidersHorizontal size={19}/></button>}
      {direction === 'robot' && <button className="concept-icon" title="Say hello" aria-label="Say hello" onClick={() => { setGreeted(g => !g); setActive(a => !a) }}><Hand size={19}/></button>}
      <button className="concept-icon" title={paused ? 'Resume motion' : 'Pause motion'} aria-label={paused ? 'Resume motion' : 'Pause motion'} onClick={() => setPaused(p => !p)}>{paused ? <Play size={18}/> : <Pause size={18}/>}</button>
      <button className="concept-icon" title="Reset scene" aria-label="Reset scene" onClick={() => { setReset(r => r + 1); setActive(false); setGreeted(false) }}><RotateCcw size={18}/></button>
      {greeted && direction === 'robot' && <span className="concept-greeting" role="status">Hey, future teammate.</span>}
    </div>
    {publicMode && view === 'home' ? <nav className="concept-entry-paths" aria-label="Ways to get involved"><a href="#workshop"><span>01</span>Find a project<ArrowDownRight size={20}/></a><Link href="/get-involved?type=propose_project"><span>02</span>Submit an idea<ArrowUpRight size={20}/></Link><a href="#capstones"><span>03</span>Explore capstones<ArrowDownRight size={20}/></a></nav> : <footer className="concept-comparison"><div><span className="concept-preview-label">{publicMode ? 'OEC' : 'Concept preview'}</span><span className="concept-direction-name">{publicMode ? 'Oberlin, Ohio' : names[direction]}</span></div>{publicMode ? <nav aria-label="Club links"><Link href="/pathway">3-2 pathway</Link><Link href="/resources">Resources</Link><Link href="/member/login">Member sign in</Link></nav> : <nav aria-label="Compare designs">{(['robot', 'machine', 'hall'] as Direction[]).map((d, i) => <Link href={`/concepts/${d}`} key={d} aria-current={direction === d ? 'page' : undefined}><span>0{i + 1}</span>{d === 'robot' ? 'Robot' : d === 'machine' ? 'Machine' : 'Hall'}</Link>)}</nav>}<ArrowDownRight className="concept-footer-arrow" size={22}/></footer>}
    <ConceptPanel key={`${view}:${pathname}`} view={view} direction={direction} surface={surface} onClose={close}>
      <div className="concept-panel-top"><span id="concept-panel-heading">{panelTitle}</span><button className="concept-icon" title="Close panel" aria-label="Close panel" onClick={close}><X size={23}/></button></div>
      <div className="concept-panel-body">
        {publicMode && ['join', 'page', 'about', 'events'].includes(view) && <div className="robot-live-content" id="main-content">{viewForPath(pathname) === view ? children : <p role="status">Opening the workshop...</p>}</div>}
        {!publicMode && view === 'join' && <ConceptJoinFlow project={project?.title ?? ''} onProgress={setProgress} onDone={close}/>}
        {view === 'projects' && (project ? <section>
          <button className="concept-back" onClick={() => setProject(null)}><ArrowLeft size={17}/>All projects</button>
          <p className="concept-kicker">{project.disciplines.join(' / ')}</p><h2>{project.title}</h2><p className="concept-project-summary">{project.summary}</p>
          <button className="concept-primary" onClick={() => open('join')}>Join this project<ArrowRight size={20}/></button>
        </section> : <section><p className="concept-kicker">The workshop / {projects.length.toString().padStart(2, '0')}</p><h2>Projects</h2>
          {publicMode && <div className="project-directory-intro"><p>See what each team is working on and how you can take part.</p><Link href="/get-involved?type=propose_project">Submit a project idea<ArrowUpRight size={18}/></Link></div>}
          <label className="concept-search"><Search size={19}/><span className="concept-sr">Search projects</span><input placeholder="Search projects" value={search} onChange={e => setSearch(e.target.value)}/></label>
          <div className="concept-project-list">{filtered.map((p, i) => <button key={p.id} onClick={() => { if (publicMode && p.slug) router.push(`/projects/${p.slug}`); else setProject(p) }}><span className="concept-project-index">{String(i + 1).padStart(2, '0')}</span><span><small>{p.disciplines.join(' / ') || 'OEC project'}</small><strong>{p.title}</strong><span>{p.summary}</span></span><ArrowUpRight size={23}/></button>)}</div>
          {!filtered.length && <p>{projects.length ? 'No matching projects. Try another search.' : 'Project details will appear here when they are published.'}</p>}
        </section>)}
        {!publicMode && view === 'events' && <section><p className="concept-kicker">Meet at the workshop</p><h2>Come hang out.</h2>{events.length ? <div className="concept-event-list">{events.map(event => <article key={event.id}><CalendarDays size={24}/><div><p>{new Date(event.start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' })}</p><h3>{event.title}</h3><p>{event.location}</p></div></article>)}</div> : <><p>New event dates have not been posted yet.</p><p>Workshops, project groups, and club meetups are all part of OEC. Get in touch to hear what is coming up.</p></>}<button className="concept-primary" onClick={() => open('join')}>Get involved<ArrowRight size={20}/></button></section>}
        {!publicMode && view === 'about' && <section><p className="concept-kicker">Oberlin Engineering Club</p><h2>Bring your<br/>curiosity.</h2><p>OEC is a place for Oberlin students to build projects, learn from each other, and explore engineering.</p><p>Members come from physics, computer science, chemistry, mathematics, environmental studies, and other departments. You do not need experience or a place in the 3-2 program to join.</p><div className="concept-about-links"><Link href="/pathway">The 3-2 pathway<ArrowUpRight size={18}/></Link><Link href="/resources">Club resources<ArrowUpRight size={18}/></Link></div><button className="concept-primary" onClick={() => open('join')}>Join the club<ArrowRight size={20}/></button></section>}
        {view === 'menu' && <nav aria-label="All pages">{(['projects', 'events', 'about', 'join'] as View[]).map((item, index) => <button key={item} onClick={() => { setProject(null); open(item) }}><span>0{index + 1}</span>{item === 'join' ? 'Join the club' : item}<ArrowUpRight size={27}/></button>)}<div className="concept-menu-extra"><Link href="/get-involved?type=propose_project" onClick={followJoinLink}>Submit a project idea</Link><Link href="/get-involved?type=propose_project&focus=capstone" onClick={followJoinLink}>Explore a capstone</Link><Link href="/pathway">3-2 pathway</Link><Link href="/resources">Resources</Link><Link href="/opportunities">Opportunities</Link><Link href="/news">News</Link><Link href="/member/login">Member sign in</Link></div></nav>}
      </div>
    </ConceptPanel>
    </div>
    {publicMode && view === 'home' && <PublicWorkshop projects={projects} events={events} paused={paused}/>}
  </main>
}
