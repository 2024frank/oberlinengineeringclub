'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, Check, ChevronDown, GraduationCap, Menu, X } from 'lucide-react'
import s from './preview.module.css'

const live = 'https://oberlin32engineeringsociety.com'
const projects = [
  { title: 'Ender 3 Repair & Klipper Upgrade', category: 'Electronics', slug: 'ender-3-klipper-upgrade', skills: 'Firmware / Electronics / Tuning', description: 'Upgrade the control board and extruder, install Klipper, and tune an Ender 3 for faster, more reliable printing.' },
  { title: 'Build Plate Carriage Repair', category: 'Fabrication', slug: 'large-format-build-plate-carriage', skills: 'CAD / Mechanical design / Fabrication', description: 'Design or source a replacement carriage for a large-format printer, then fabricate, install, and recalibrate it.' },
  { title: 'PET Bottle-to-Filament Recycling', category: 'Sustainability', slug: 'pet-bottle-filament-recycling', skills: 'Materials / Electronics / Testing', description: 'Assemble and test a system that converts PET bottles into usable 3D-printer filament.' },
  { title: 'Control System Replacement', category: 'Electronics', slug: 'large-format-control-system', skills: 'Electronics / Firmware / Integration', description: 'Install a new controller, connect motors and sensors, and test the rebuilt printer.' },
  { title: 'Printer Performance Upgrades', category: 'Fabrication', slug: 'large-format-performance-upgrades', skills: 'Mechanical design / Testing / Tuning', description: 'Test hardware and firmware changes to improve print quality, speed, and reliability.' },
  { title: 'Multi-Material Printing System', category: 'Fabrication', slug: 'multi-material-printing-system', skills: 'Assembly / Firmware / Calibration', description: 'Assemble a multi-material unit, configure its firmware, and calibrate filament handling.' }
]
const categories = ['All projects', 'Fabrication', 'Electronics', 'Sustainability']
const faqs = [
  ['Do I need engineering experience?', 'No. The club welcomes students at every experience level. Share what you are curious about when you submit your interest.'],
  ['Do I have to be in the 3-2 program?', 'No. You can join to build projects and meet people, whether or not you are considering the 3-2 pathway.'],
  ['How do I join a project?', 'Explore a project to read its full scope, then submit your interest through the club website. The team is forming project groups as the club gets started.']
]

export default function DesignPreview() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [category, setCategory] = useState('All projects')
  const filtered = projects.filter(p => category === 'All projects' || p.category === category)
  return (
    <div className={s.page}>
      <a className={s.skip} href="#content">Skip to content</a>
      <header className={s.header}>
        <a className={s.brand} href="#" aria-label="Oberlin Engineering Club home"><Image src="/brand/oec-badge-circle.png" alt="" width={45} height={45} /><span>OBERLIN<span>ENGINEERING CLUB</span></span></a>
        <nav className={s.desktopNav} aria-label="Main navigation"><a href="#projects">Projects</a><a href="#community">Community</a><a href="#pathway">3-2 pathway</a><a href={`${live}/about`}>About</a></nav>
        <a className={s.joinHeader} href={`${live}/get-involved`}>Join the club <ArrowUpRight size={17} /></a>
        <button className={s.menuButton} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        {menuOpen && <nav id="mobile-nav" className={s.mobileNav} aria-label="Mobile navigation" onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(false) }}>{[['Projects', '#projects'], ['Community', '#community'], ['3-2 pathway', '#pathway'], ['About the club', `${live}/about`], ['Join the club', `${live}/get-involved`]].map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight size={18} /></a>)}</nav>}
      </header>
      <main id="content">
        <section className={s.hero} aria-labelledby="hero-title">
          <Image className={s.heroImage} src="https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/site/home-hero-workbench.jpg" alt="Students working together at an electronics workbench" fill priority sizes="100vw" />
          <div className={s.heroShade} />
          <div className={s.heroContent}><h1 id="hero-title">Oberlin<br />Engineering<br /><em>Club.</em></h1><h2>Build things. Learn together.</h2><p className={s.heroDescription}>Engineering projects, technical workshops, and support for students exploring the 3-2 pathway at Oberlin College.</p><a className={s.primary} href="#projects">Explore projects <ArrowRight size={19} /></a></div>
        </section>
        <div className={s.welcome}><span><Check size={16} /> Open to all majors</span><span><Check size={16} /> No experience required</span></div>

        <section className={s.projects} id="projects">
          <div className={s.sectionHeading}><h2>Projects</h2><p>Explore this semester&apos;s projects and find a group to join.</p></div>
          <div className={s.filterBar}><div className={s.filters} aria-label="Filter projects">{categories.map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}{c === 'All projects' && <span>06</span>}</button>)}</div><span className={s.projectCount} role="status">{filtered.length} opportunities</span></div>
          <div className={s.projectList}>{filtered.map(p => <a className={s.project} key={p.slug} href={`${live}/projects/${p.slug}`}><div className={s.projectImage}><Image src={`https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/2026/projects-${p.slug}.jpg`} alt={p.title} fill sizes="(max-width: 600px) 88vw, (max-width: 1000px) 43vw, 380px" /></div><div className={s.projectText}><span className={s.skills}>{p.skills}</span><h3>{p.title}</h3><p>{p.description}</p></div><div className={s.projectMeta}><span className={s.status}><span /> Open for interest</span><ArrowUpRight className={s.projectArrow} size={22} /></div></a>)}</div>
          <div className={s.projectBottom}><span>Have an idea of your own?</span><a href={`${live}/get-involved`}>Bring it to the club <ArrowRight size={17} /></a></div>
        </section>

        <section className={s.community} id="community"><div className={s.sectionHeading}><h2>Events</h2><p>Fall events are being planned. Dates and locations will be posted when confirmed.</p></div><div className={s.eventGrid}>{[['01', 'Build nights', 'Work on projects with other club members.'], ['02', 'Technical workshops', 'Practice skills in electronics, fabrication, and software.'], ['03', 'Alumni conversations', 'Talk with alumni about engineering study and careers.']].map(([n, title, desc]) => <article key={n}><div className={s.eventTop}><span>{n}</span><span>BEING PLANNED</span></div><h3>{title}</h3><p>{desc}</p></article>)}</div><div className={s.eventFoot}><a href={`${live}/events`}>View events <ArrowUpRight size={17} /></a></div></section>

        <section className={s.pathway} id="pathway"><div className={s.pathwayMark}><GraduationCap size={28} /><span>3<span>+</span>2</span></div><div><h2>3-2 Engineering<br />Pathway</h2><p>Find partner-school information, planning resources, and questions to discuss with your adviser.</p><a href={`${live}/pathway`}>Explore the 3-2 pathway <ArrowUpRight size={19} /></a></div></section>

        <section className={s.faq}><div><h2>Joining the club</h2><a className={s.primary} href={`${live}/get-involved`}>Join the club <ArrowUpRight size={19} /></a></div><div className={s.questions}>{faqs.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={19} /></summary><p>{a}</p></details>)}</div></section>
      </main>
      <footer className={s.footer}><a className={s.brand} href="#"><Image src="/brand/oec-badge-circle.png" alt="" width={45} height={45} /><span>OBERLIN<span>ENGINEERING CLUB</span></span></a><p>Build things. Learn together.</p><div><a href="mailto:oberlinengineeringclub@oberlin.edu">Get in touch <ArrowUpRight size={15} /></a><a href="https://www.instagram.com/oberlinengineeringclub/">Instagram <ArrowUpRight size={15} /></a></div><small>A student organization at Oberlin College</small></footer>
    </div>
  )
}
