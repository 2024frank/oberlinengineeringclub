'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, RotateCcw } from 'lucide-react'

type Event = { id: string; slug?: string; title: string; start: string; location: string }
type Props = { events: Event[]; onJoin: () => void; initialMonth?: string; initialDate?: string }
const localDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
const monthLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long' })
const dayLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })
function dateKey(value: Date) {
  if (!Number.isFinite(value.getTime())) return ''
  const parts = localDate.formatToParts(value)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
}

export function WorkbenchEvents({ events, onJoin, initialMonth, initialDate }: Props) {
  const [month, setMonth] = useState(() => initialMonth ?? dateKey(initialDate ? new Date(initialDate) : new Date()).slice(0, 7))
  const [selected, setSelected] = useState<string | null>(null)
  const first = new Date(`${month}-01T00:00:00Z`)
  const days = Array.from({ length: 42 }, (_, index) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), index - first.getUTCDay() + 1)))
  const eventDates = new Set(events.map(event => dateKey(new Date(event.start))))
  const visible = events.filter(event => {
    const key = dateKey(new Date(event.start))
    return selected ? key === selected : key.startsWith(month)
  }).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const move = (delta: number) => {
    setMonth(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + delta, 1)).toISOString().slice(0, 7))
    setSelected(null)
  }
  return <div className="wb-events-console">
    <div className="wb-events-intro"><p className="wb-label">The club calendar</p><h2 tabIndex={-1}>Workshops<br/>&amp; meetups</h2><div className="wb-event-list" aria-live="polite">
      {visible.length ? visible.map(event => <article key={event.id}><time dateTime={event.start}>{new Date(event.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}</time><div><h3>{event.slug ? <Link href={`/events/${encodeURIComponent(event.slug)}`}>{event.title}</Link> : event.title}</h3><p>{new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET</p>{event.location && <p className="wb-event-location"><MapPin size={14}/>{event.location}</p>}</div></article>) : <div className="wb-calendar-empty"><CalendarDays size={32} strokeWidth={1.3}/><p>{!events.length ? 'No events are published yet. Club dates will appear here when they are announced.' : selected ? 'No events on this date.' : 'No events scheduled this month.'}</p></div>}
    </div><button className="wb-primary" onClick={onJoin}>Join the club<ArrowRight size={20}/></button></div>
    <section className="wb-calendar" aria-label="Club calendar"><header><button className="wb-icon" aria-label="Previous month" title="Previous month" onClick={() => move(-1)}><ChevronLeft size={20}/></button><h3 aria-live="polite">{monthLabel.format(first)}</h3><button className="wb-icon" aria-label="Next month" title="Next month" onClick={() => move(1)}><ChevronRight size={20}/></button></header><div className="wb-calendar-weekdays" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={index}>{day}</span>)}</div><div className="wb-calendar-days">{days.map(day => {
      const key = day.toISOString().slice(0, 10), currentMonth = key.startsWith(month)
      return currentMonth ? <button key={key} aria-label={dayLabel.format(day)} aria-pressed={key === selected} data-has-event={eventDates.has(key)} onClick={() => setSelected(key)}>{day.getUTCDate()}</button> : <span key={key} aria-hidden="true">{day.getUTCDate()}</span>
    })}</div><footer>{selected ? <button className="wb-back" onClick={() => setSelected(null)}><RotateCcw size={14}/>All dates this month</button> : <span>Oberlin, Ohio</span>}<span>{events.filter(event => dateKey(new Date(event.start)).startsWith(month)).length} events</span></footer></section>
  </div>
}
