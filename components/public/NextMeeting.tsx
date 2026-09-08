import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { refreshSeedEvent } from '@/lib/content/publicCopy'

export function NextMeeting({ events }: { events: Array<Record<string, unknown>> }) {
  // eslint-disable-next-line react-hooks/purity -- The public homepage selects its next event at server request time.
  const now = Date.now()
  const event = events.map(refreshSeedEvent).filter(event => new Date(String(event.start_at)).getTime() >= now)
    .sort((a, b) => new Date(String(a.start_at)).getTime() - new Date(String(b.start_at)).getTime())[0]
  if (!event) return null
  const date = new Date(String(event.start_at))
  const zone = { timeZone: 'America/New_York' }
  const time = (value: unknown) => new Date(String(value)).toLocaleTimeString('en-US', { ...zone, hour: 'numeric', minute: '2-digit' })
  const end = new Date(String(event.end_at)).getTime()
  return <Link href={'/events/' + String(event.slug)} className="next-meeting">
    <div className="shell next-meeting__inner">
      <time dateTime={date.toISOString()} className="next-meeting__date">
        <span>{date.toLocaleDateString('en-US', { ...zone, weekday: 'short' })}</span>
        <strong>{date.toLocaleDateString('en-US', { ...zone, day: 'numeric' })}</strong>
        <span>{date.toLocaleDateString('en-US', { ...zone, month: 'short' })}</span>
      </time>
      <div className="next-meeting__title"><small>Coming up</small><h2>{String(event.title)}</h2></div>
      <div className="next-meeting__where"><span>{String(event.location || 'Location to be confirmed')}</span><span>{time(event.start_at)}{Number.isFinite(end) && end > date.getTime() ? ` - ${time(event.end_at)}` : ''}</span></div>
      <ArrowUpRight size={24} aria-hidden="true"/>
    </div>
  </Link>
}
