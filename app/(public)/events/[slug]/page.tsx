import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { CoverImage } from '@/components/public/CoverImage'
import { notFound } from 'next/navigation'
import { getPublishedEvent } from '@/lib/content/events'

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublishedEvent((await params).slug)
  if (!event) notFound()
  const start = event.start_at ? new Date(event.start_at) : null
  const hasDate = start && Number.isFinite(start.getTime())
  const end = event.end_at ? new Date(event.end_at) : null
  const hasEnd = hasDate && end && Number.isFinite(end.getTime()) && end > start
  const zone = { timeZone: 'America/New_York' }
  const time = (date: Date) => date.toLocaleTimeString('en-US', { ...zone, hour: 'numeric', minute: '2-digit' })
  const interestMeeting = event.slug === 'founding-meetup'
  const hasCover = Boolean(event.cover_media_id) && !interestMeeting

  return <>
    <section className={`detail-hero${hasCover ? ' detail-hero--image' : ''}`}>
      {hasCover && <CoverImage mediaId={event.cover_media_id}/>}
      <div className="shell">
        <Link className="text-link" href="/events"><ArrowLeft size={16}/>All events</Link>
        <h1>{event.title}</h1>
        <p>{event.summary}</p>
      </div>
    </section>
    <section className="detail-body event-detail"><div className="shell detail-grid">
      <div className="prose"><h2>{interestMeeting ? 'About the meeting' : 'About this event'}</h2><p>{event.description}</p></div>
      <aside className="detail-aside"><dl>
        <dt>Date</dt><dd>{hasDate ? start.toLocaleDateString('en-US', { ...zone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date to be announced'}</dd>
        {hasDate && <><dt>Time</dt><dd>{time(start)}{hasEnd ? ` - ${time(end)}` : ''}</dd></>}
        <dt>Location</dt><dd>{event.location || 'Location to be announced'}</dd>
        {event.organizer_name && <><dt>Organizer</dt><dd>{event.organizer_name}</dd></>}
        {event.access_details && <><dt>Access</dt><dd>{event.access_details}</dd></>}
      </dl>
        {event.registration_url && <a className="button button--cardinal" href={event.registration_url}>{interestMeeting ? 'Request membership access' : 'Register'}<ArrowUpRight size={18}/></a>}
      </aside>
    </div></section>
  </>
}
