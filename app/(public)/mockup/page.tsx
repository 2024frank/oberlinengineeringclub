import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  CalendarClock,
  CircuitBoard,
  GraduationCap,
  Mail,
  Users,
  Wrench
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Homepage redesign mockup',
  description: 'A design mockup for the Oberlin Engineering Club homepage.'
}

const signals = [
  'Open to every major',
  'No prior experience required',
  '3-2 enrollment is optional'
]

const nextSteps = [
  {
    icon: Users,
    kicker: 'Join',
    title: 'Submit interest',
    body: 'Tell the founding team what you want to build, learn, or help organize.',
    href: '/get-involved'
  },
  {
    icon: Wrench,
    kicker: 'Build',
    title: 'Shape first projects',
    body: 'Projects will be selected after member interest, tools, space, cost, and safety are reviewed.',
    href: '/projects'
  },
  {
    icon: GraduationCap,
    kicker: 'Plan',
    title: 'Understand 3-2',
    body: 'Use the guide as a starting point, then confirm requirements with advisers and partner schools.',
    href: '/pathway'
  }
]

const tracks = [
  ['Hardware nights', 'Robotics, circuits, sensors, CAD, fabrication, and practical beginner tasks.'],
  ['3-2 planning', 'Peer notes, partner-school links, prerequisite questions, and decision points.'],
  ['Community roles', 'Help with events, communications, project intake, documentation, and outreach.']
]

export default function MockupPage() {
  return (
    <div className="oec-mockup">
      <section className="oec-mockup-hero">
        <div className="oec-mockup-hero__media" aria-hidden="true">
          <Image
            src="/brand/auth-panel.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
          />
        </div>
        <div className="oec-mockup-shell oec-mockup-hero__grid">
          <div className="oec-mockup-hero__copy">
            <p className="oec-mockup-kicker">Founding for 2026-27</p>
            <h1>Engineering projects and 3-2 planning at Oberlin.</h1>
            <p className="oec-mockup-lead">
              A student-run club for people who want to build hardware, learn practical engineering skills,
              and compare notes on the 3-2 pathway.
            </p>
            <div className="oec-mockup-actions">
              <Link className="oec-mockup-button oec-mockup-button--primary" href="/get-involved">
                Submit membership interest <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link className="oec-mockup-button oec-mockup-button--secondary" href="/pathway">
                Read the 3-2 guide
              </Link>
            </div>
            <ul className="oec-mockup-signals" aria-label="Club access notes">
              {signals.map(signal => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </div>
          <aside className="oec-mockup-status" aria-label="Current club status">
            <div>
              <span>Status</span>
              <strong>Organizing now</strong>
            </div>
            <p>
              Members will help choose the first projects and events. Nothing is overpromised; the homepage
              should make the next step obvious.
            </p>
          </aside>
        </div>
      </section>

      <section className="oec-mockup-next">
        <div className="oec-mockup-shell oec-mockup-next__grid">
          <div className="oec-mockup-next__intro">
            <p className="oec-mockup-kicker">What you can do now</p>
            <h2>Join before the first build night is locked in.</h2>
          </div>
          <div className="oec-mockup-step-row">
            {nextSteps.map(item => {
              const Icon = item.icon
              return (
                <Link href={item.href} className="oec-mockup-step" key={item.title}>
                  <span className="oec-mockup-step__icon">
                    <Icon aria-hidden="true" size={20} />
                  </span>
                  <span className="oec-mockup-step__text">
                    <small>{item.kicker}</small>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </span>
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="oec-mockup-foundation">
        <div className="oec-mockup-shell oec-mockup-foundation__grid">
          <div>
            <p className="oec-mockup-kicker">Club foundation</p>
            <h2>Make the site feel active without pretending the club is already huge.</h2>
          </div>
          <div className="oec-mockup-track-list">
            {tracks.map(([title, body]) => (
              <article key={title}>
                <CircuitBoard aria-hidden="true" size={20} />
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="oec-mockup-strip">
        <div className="oec-mockup-shell oec-mockup-strip__inner">
          <div>
            <CalendarClock aria-hidden="true" size={24} />
            <p>
              Events should show up after date, room, organizer, and access details are confirmed.
            </p>
          </div>
          <Link href="mailto:oberlinengineeringclub@oberlin.edu">
            <Mail aria-hidden="true" size={18} /> Questions or introductions
          </Link>
        </div>
      </section>
    </div>
  )
}
