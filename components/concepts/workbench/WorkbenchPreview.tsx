'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Code2, Cpu, FlaskConical, Minus, Pause, Play, Plus, RotateCcw, Search, Wrench } from 'lucide-react'
import type { ConceptProject } from '../ConceptExperience'
import type { WorldState } from '../worlds'
import { WorkbenchJoinForm } from './WorkbenchJoinForm'
import { WorkbenchEvents } from './WorkbenchEvents'
import { projectStatusSchema } from '@/lib/validation/projects'

const Scene = dynamic(() => import('../ConceptScene'), { ssr: false })
type Event = { id: string; slug?: string; title: string; start: string; location: string; eventType?: string }
type Project = ConceptProject & { recruiting?: boolean; skills?: string[] }
type View = 'home' | 'projects' | 'events' | 'about' | 'join' | 'page'
type PublicRoute = { pathname: string; search?: string; navigate: (href: string) => void; replace?: (href: string) => void }
const viewForPath = (path: string): View => path === '/' ? 'home' : path === '/projects' ? 'projects' : path === '/events' ? 'events' : path === '/about' ? 'about' : path === '/get-involved' ? 'join' : 'page'
function ProjectSymbol({ project }: { project: ConceptProject }) {
  const discipline = project.disciplines.join(' ').toLowerCase()
  const Icon = /electrical|electronic/.test(discipline) ? Cpu : /software|computer/.test(discipline) ? Code2 : /chemical|material/.test(discipline) ? FlaskConical : Wrench
  return <Icon size={25} strokeWidth={1.4} aria-hidden="true"/>
}

export function WorkbenchPreview({ projects, events, route, children }: { projects: Project[]; events: Event[]; route?: PublicRoute; children?: ReactNode }) {
  const [previewView, setView] = useState<View>('home'), [selected, setSelected] = useState<ConceptProject | null>(null)
  const view = route ? viewForPath(route.pathname) : previewView
  const navigate = route?.navigate
  const publicMode = Boolean(route)
  const [calendarNow] = useState(() => Date.now())
  const [previewSearch, setPreviewSearch] = useState(''), [paused, setPaused] = useState(false), [active, setActive] = useState(false)
  const [previewDiscipline, setPreviewDiscipline] = useState('')
  const params = new URLSearchParams(route?.search)
  const search = route ? params.get('q') ?? '' : previewSearch
  const discipline = route ? params.get('discipline') ?? '' : previewDiscipline
  const parsedStatus = projectStatusSchema.safeParse(params.get('status'))
  const status = parsedStatus.success ? parsedStatus.data : ''
  const recruiting = params.get('recruiting')
  const skills = params.getAll('skill').filter(Boolean)
  const updateFilter = (name: string, value: string) => {
    if (!route) return
    const next = new URLSearchParams(route.search)
    if (value) next.set(name, value); else next.delete(name)
    const query = next.toString()
    ;(route.replace ?? route.navigate)(`/projects${query ? `?${query}` : ''}`)
  }
  const setSearch = (value: string) => route ? updateFilter('q', value) : setPreviewSearch(value)
  const setDiscipline = (value: string) => route ? updateFilter('discipline', value) : setPreviewDiscipline(value)
  const [reset, setReset] = useState(0), [progress, setProgress] = useState(0)
  const [surface, setSurface] = useState<HTMLDivElement | null>(null)
  const [composition, setComposition] = useState<WorldState['composition']>()
  const fallback = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null)
  const bay = useRef<HTMLDivElement>(null), returnFocus = useRef<HTMLElement | null>(null), restoreFocus = useRef(false)
  const controls = useRef<HTMLDivElement>(null), lever = useRef<HTMLButtonElement>(null), selector = useRef<HTMLLabelElement>(null), drawer = useRef<HTMLElement>(null)
  const goHome = useCallback(() => { restoreFocus.current = true; setView('home'); setProgress(0); setSelected(null); navigate?.('/') }, [navigate])
  const open = (next: View, keepProject = false) => {
    if (next === 'join' && view === 'join') return
    returnFocus.current = document.activeElement as HTMLElement
    if (navigate) { navigate(next === 'join' ? '/get-involved' : next === 'home' ? '/' : `/${next}`); return }
    setView(next); setProgress(next === 'join' ? 1 : 0)
    if (!keepProject) setSelected(null)
  }
  const clearFilters = () => {
    if (route) (route.replace ?? route.navigate)('/projects')
    else { setPreviewSearch(''); setPreviewDiscipline('') }
    content.current?.querySelector<HTMLInputElement>('input[type=search]')?.focus({ preventScroll: true })
  }
  useLayoutEffect(() => {
    const node = content.current, parent = fallback.current
    if (!node || !parent || !surface) return
    const move = (destination: HTMLElement) => {
      const focused = document.activeElement as HTMLElement | null
      const ownsFocus = focused && node.contains(focused)
      destination.appendChild(node)
      if (ownsFocus) focused.focus({ preventScroll: true })
    }
    move(surface)
    return () => move(parent)
  }, [surface])
  useEffect(() => {
    const target = bay.current, host = content.current
    if (!surface || !host || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const outer = host.getBoundingClientRect()
      if (!outer.width || !outer.height) return
      const bounds = (element: Element) => {
        const inner = element.getBoundingClientRect()
        const round = (value: number) => Math.round(value * 10000) / 10000
        return { x: round((inner.x + inner.width / 2 - outer.x) / outer.width - .5), y: round(.5 - (inner.y + inner.height / 2 - outer.y) / outer.height), width: round(inner.width / outer.width), height: round(inner.height / outer.height) }
      }
      const navigation = Array.from(host.querySelectorAll('.wb-header nav button')).map(bounds)
      const measured = target ? { ...bounds(target), controls: controls.current ? bounds(controls.current) : undefined, lever: lever.current ? bounds(lever.current) : undefined, selector: selector.current ? bounds(selector.current) : undefined, drawer: drawer.current ? bounds(drawer.current) : undefined, navigation, title: Array.from(host.querySelectorAll('.wb-word')).map(bounds) } : undefined
      setComposition(previous => {
        const next = measured ?? (previous ? { ...previous, navigation } : undefined)
        return JSON.stringify(previous) === JSON.stringify(next) ? previous : next
      })
    }
    const observer = new ResizeObserver(measure); if (target) observer.observe(target); observer.observe(host); measure()
    const header = host.querySelector('.wb-header'); if (header) observer.observe(header)
    host.querySelectorAll('.wb-word').forEach(word => observer.observe(word))
    let disposed = false
    void document.fonts?.ready.then(() => { if (!disposed) measure() })
    document.fonts?.addEventListener('loadingdone', measure)
    for (const element of [controls.current, lever.current, selector.current, drawer.current]) if (element) observer.observe(element)
    host.addEventListener('scroll', measure, { passive: true })
    return () => { disposed = true; observer.disconnect(); host.removeEventListener('scroll', measure); document.fonts?.removeEventListener('loadingdone', measure) }
  }, [surface, view])
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setPaused(media.matches)
    sync(); media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  useEffect(() => {
    if (!publicMode) return
    const sync = (event: globalThis.Event) => {
      const phase = (event as CustomEvent<{ phase: number }>).detail?.phase
      if (Number.isInteger(phase) && phase >= 0 && phase <= 3) setProgress(phase + 1)
    }
    window.addEventListener('oec-join-progress', sync)
    return () => window.removeEventListener('oec-join-progress', sync)
  }, [publicMode])
  useEffect(() => {
    if (publicMode) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') goHome() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [goHome, publicMode])
  useEffect(() => {
    content.current?.scrollTo({ top: 0, behavior: 'instant' })
    if (view !== 'home') {
      // Do not mutate headings inside a server-rendered route before it hydrates.
      const target = content.current?.querySelector<HTMLElement>('.wb-live-content, h1, h2')
      target?.focus({ preventScroll: true })
    }
    else if (restoreFocus.current) {
      const target = returnFocus.current?.isConnected ? returnFocus.current : content.current?.querySelector<HTMLElement>('.wb-join')
      target?.focus({ preventScroll: true }); restoreFocus.current = false
    }
  }, [view, selected, route?.pathname])
  const disciplines = [...new Set(projects.flatMap(project => project.disciplines))].sort()
  const filtered = projects.filter(project => (!discipline || project.disciplines.includes(discipline)) && (!status || project.status === status) && (!['true', 'false'].includes(recruiting ?? '') || project.recruiting === (recruiting === 'true')) && skills.every(skill => project.skills?.includes(skill)) && `${project.title} ${project.disciplines.join(' ')} ${project.summary}`.toLowerCase().includes(search.trim().toLowerCase()))
  const calendarEvents = events.filter(event => (!params.get('type') || event.eventType === params.get('type')) && (params.get('when') === 'past' ? Date.parse(event.start) < calendarNow : params.get('when') === 'upcoming' ? Date.parse(event.start) >= calendarNow : true))
  const calendarMonth = params.has('when') && calendarEvents.length ? [...calendarEvents].sort((a, b) => params.get('when') === 'past' ? Date.parse(b.start) - Date.parse(a.start) : Date.parse(a.start) - Date.parse(b.start))[0].start : undefined
  const selectedIndex = selected ? projects.findIndex(project => project.id === selected.id) : -1
  const openProject = (project: ConceptProject) => {
    if (navigate && project.slug) { navigate(`/projects/${encodeURIComponent(project.slug)}`); return }
    open('projects'); setSelected(project)
  }
  return <main className={`workbench-preview ${view !== 'home' ? 'wb-is-open' : ''}`} data-view={view} data-paused={paused} data-scene-ready={Boolean(surface)}>
    <div className="wb-stage">
      <Scene direction="workbench" view={view} paused={paused} active={active} reset={reset} progress={progress} composition={composition} onSurfaceReady={setSurface} onAction={action => {
        if (action === 'activate') setActive(value => !value)
        else if (action === 'home') goHome()
        else if (action === 'projects' || action === 'events' || action === 'about' || action === 'join') open(action)
      }}/>
      <div className="wb-fallback" ref={fallback}>
        <div className="workbench-surface" id={route ? 'main-content' : undefined} ref={content} data-view={view}>
          <header className="wb-header">
            <button className="wb-brand" onClick={goHome} aria-label="Oberlin Engineering Club home"><Image src="/brand/oec-badge-circle.png" alt="Oberlin Engineering Club badge" width={46} height={46} priority/><span>Oberlin Engineering Club<small>Oberlin, Ohio</small></span></button>
            <nav aria-label="Workshop navigation">{(['projects', 'events', 'about'] as const).map((item, i) => <button key={item} aria-label={item.charAt(0).toUpperCase() + item.slice(1)} aria-current={view === item ? 'page' : undefined} onClick={() => open(item)}><small aria-hidden="true">0{i + 1}</small><span>{item}</span></button>)}</nav>
          </header>
          {view === 'home' ? <section className="wb-home">
            <div className="wb-home-copy"><h1 aria-label="Oberlin Engineering Club"><span className="wb-word">Oberlin</span><span className="wb-word">Engineering</span><span className="wb-word">Club</span></h1><p className="wb-home-description">A place at Oberlin to build things.<br/>No engineering experience required.</p></div>
            <div className="wb-mechanism-space" ref={bay}><button className="wb-icon" aria-pressed={active} title={active ? 'Assemble mechanism' : 'Explode mechanism'} aria-label={active ? 'Assemble mechanism' : 'Explode mechanism'} onClick={() => setActive(value => !value)}>{active ? <Minus size={20}/> : <Plus size={20}/>}</button></div>
            <div className="wb-home-actions" ref={controls}>
              <div className="wb-selector-control"><div className="wb-selector-labels" aria-hidden="true"><span>Home</span><span>Projects</span><span>Events</span><span>Join</span></div><label className="wb-selector" ref={selector} title="Choose section"><span className="concept-sr">Section selector</span><select value={view} onChange={event => event.target.value === 'home' ? goHome() : open(event.target.value as View)}><option value="home">Home</option><option value="projects">Projects</option><option value="events">Events</option><option value="join">Join</option></select></label></div>
              <button ref={lever} className="wb-primary wb-join" onClick={() => open('join')}><span>Join the club</span><ArrowRight size={25}/></button>
            </div>
            <section className="wb-home-drawer" aria-label="Project drawer" ref={drawer}>
              <div className="wb-drawer-projects">{projects.slice(0, 2).map((project, index) => <button key={project.id} onClick={() => openProject(project)}><span aria-hidden="true">0{index + 1}</span><strong>{project.title}</strong><ArrowUpRight size={16}/></button>)}{!projects.length && <p>No projects are published yet.</p>}</div>
              <button className="wb-project-shortcut" onClick={() => open('projects')}><span>Explore projects</span><ArrowRight size={22}/></button>
            </section>
          </section> : <section key={`${view}-${selected?.id ?? 'list'}`} className={`wb-sheet wb-sheet-${view}`}>
            <div className="wb-sheet-toolbar"><button className="wb-back" onClick={selected && view === 'projects' ? () => setSelected(null) : goHome} aria-label={selected && view === 'projects' ? 'All projects' : 'Return to workshop'}><ArrowLeft size={16}/>{selected && view === 'projects' ? 'All projects' : 'Workshop'}</button><span className="wb-label">{view === 'join' ? 'Membership' : view === 'page' ? 'Club information' : view}</span></div>
            {view === 'projects' && (selected ? <article className="wb-project-detail">
              <div className="wb-detail-index"><p className="wb-label">Project {selectedIndex + 1} of {projects.length}</p><div className="wb-project-paging"><button className="wb-icon" aria-label="Previous project" title="Previous project" disabled={selectedIndex <= 0} onClick={() => setSelected(projects[selectedIndex - 1])}><ChevronLeft size={19}/></button><button className="wb-icon" aria-label="Next project" title="Next project" disabled={selectedIndex >= projects.length - 1} onClick={() => setSelected(projects[selectedIndex + 1])}><ChevronRight size={19}/></button></div></div>
              <h2 tabIndex={-1}>{selected.title}</h2>
              <dl className="wb-spec"><div><dt>Discipline</dt><dd>{selected.disciplines.join(', ') || 'Engineering'}</dd></div><div><dt>Status</dt><dd className="wb-project-status" data-open={selected.status === 'open_for_interest'}>{selected.status.replaceAll('_', ' ') || 'Not specified'}</dd></div></dl>
              <p className="wb-project-summary">{selected.summary}</p>
              <button className="wb-primary" onClick={() => open('join', true)}>Join this project<ArrowRight size={20}/></button>
            </article> : <>
              <div className="wb-catalog-heading"><div><p className="wb-label">Oberlin Engineering Club</p><h2 tabIndex={-1}>Project catalog<span>{String(projects.length).padStart(2, '0')}</span></h2></div></div>
              {route && <Link className="wb-catalog-proposal" href="/get-involved?type=propose_project">Submit a project idea<ArrowUpRight size={18}/></Link>}
              <div className="wb-catalog-filters"><label className="wb-search"><Search size={18}/><span className="concept-sr">Search projects</span><input type="search" placeholder="Search projects" value={search} onChange={event => setSearch(event.target.value)}/></label><label className="wb-discipline"><span className="concept-sr">Project discipline</span><select value={discipline} onChange={event => setDiscipline(event.target.value)}><option value="">All disciplines</option>{disciplines.map(value => <option key={value}>{value}</option>)}</select></label></div>
              {route && <div className="wb-public-filters"><label><span className="concept-sr">Project status</span><select aria-label="Project status" value={status} onChange={event => updateFilter('status', event.target.value)}><option value="">All statuses</option>{projectStatusSchema.options.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><label><span className="concept-sr">Recruiting</span><select value={recruiting ?? ''} onChange={event => updateFilter('recruiting', event.target.value)}><option value="">All teams</option><option value="true">Recruiting</option><option value="false">Not recruiting</option></select></label>{Boolean(search || discipline || status || recruiting || skills.length) && <button className="wb-back" onClick={clearFilters}>Clear filters<RotateCcw size={15}/></button>}</div>}
              <div className="wb-projects">{filtered.map(project => <button key={project.id} onClick={() => openProject(project)}><span className="wb-project-top"><span className="wb-project-no">{String(projects.indexOf(project) + 1).padStart(2, '0')}</span><ProjectSymbol project={project}/></span><span className="wb-project-title"><small>{project.disciplines.join(', ')}</small><strong>{project.title}</strong></span><span className="wb-project-excerpt">{project.summary}</span><span className="wb-project-bottom"><span className="wb-project-status" data-open={project.status === 'open_for_interest'}>{project.status.replaceAll('_', ' ') || 'Not specified'}</span><ArrowUpRight size={22}/></span></button>)}</div>
              {!filtered.length && <div className="wb-empty"><p>{projects.length ? 'No matching projects.' : 'No projects are published yet.'}</p>{!route && Boolean(search || discipline) && <button className="wb-back" onClick={clearFilters}>Clear filters<RotateCcw size={15}/></button>}</div>}
            </>)}
            {route && ['join', 'about', 'page'].includes(view) && <div className="wb-live-content" tabIndex={-1} key={route.pathname}>{children}</div>}
            {!route && view === 'join' && <WorkbenchJoinForm project={selected?.title} onProgress={setProgress} onDone={goHome}/>}
            {view === 'events' && <WorkbenchEvents key={route?.search} events={calendarEvents} initialDate={calendarMonth} onJoin={() => open('join')}/>}
            {!route && view === 'about' && <div className="wb-about-layout"><header><Image src="/brand/oec-badge-circle.png" alt="Oberlin Engineering Club badge" width={144} height={144}/><p className="wb-label">Oberlin, Ohio</p><h2 tabIndex={-1}>About the club</h2></header><div><div className="wb-about-copy"><p>We work on engineering projects together: fixing printers, building electronics, and figuring out how things work.</p><p>Students from any major can join. You do not need to be in the 3-2 program or have previous engineering experience.</p><p>Join an existing project or bring something you want to work on.</p></div><div className="wb-about-actions"><button className="wb-primary" onClick={() => open('join')}>Join the club<ArrowRight size={20}/></button><button className="wb-secondary" onClick={() => open('projects')}>Explore projects<ArrowUpRight size={18}/></button></div></div></div>}
          </section>}
        </div>
      </div>
      <div className="wb-motion-tools"><button className="wb-icon" aria-label={paused ? 'Resume motion' : 'Pause motion'} title={paused ? 'Resume motion' : 'Pause motion'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button><button className="wb-icon" aria-label="Reset machine" title="Reset machine" onClick={() => { setReset(value => value + 1); setActive(false) }}><RotateCcw size={16}/></button></div>
    </div>
    {!route && <aside className="wb-preview-bar"><span><Check size={13}/>Design preview</span><p>Nothing is submitted from this version.</p><a href="https://oberlin32engineeringsociety.com/">Current site<ArrowUpRight size={15}/></a></aside>}
    {view === 'home' && <section className="wb-colophon"><header><div><span className="wb-label">Oberlin Engineering Club</span><h2>Projects</h2><p>Find something you want to work on.</p></div><button className="wb-secondary" onClick={() => { open('projects'); window.scrollTo({ top: 0, behavior: paused ? 'instant' : 'smooth' }) }}>Browse projects<ArrowRight size={19}/></button></header><div className="wb-bench-projects">{projects.slice(0, 3).map(project => <button key={project.id} onClick={() => { openProject(project); window.scrollTo({ top: 0, behavior: 'instant' }) }}><span className="wb-label">{project.disciplines[0] || 'Engineering'}</span><ProjectSymbol project={project}/><h3>{project.title}</h3><span className="wb-bench-project-action">View project<ArrowUpRight size={18}/></span></button>)}</div></section>}
    {route && <footer className="wb-site-footer"><Link href="/">Oberlin Engineering Club</Link><nav aria-label="Club links"><Link href="/get-involved?type=propose_project">Submit a project idea</Link><Link href="/get-involved?type=propose_project&focus=capstone">Explore a capstone</Link><Link href="/pathway">3-2 pathway</Link><Link href="/resources">Resources</Link><Link href="/opportunities">Opportunities</Link><Link href="/news">News</Link><Link href="/member/login">Member sign in</Link>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Officer login redirects to a separate origin. */}
      <a href="/admin/login">Officer sign in</a>
    </nav></footer>}
  </main>
}
