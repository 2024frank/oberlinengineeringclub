import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import type { OfficerPosition } from '@/lib/leadership/types'
import { isPositionOpen, LeadershipDate, memberPositionHref } from './shared'

export function OfficerPositions({ positions, signedIn }: { positions: OfficerPosition[]; signedIn: boolean }) {
  const openPositions = positions.filter(isPositionOpen)
  if (!openPositions.length) return <p className="leadership-empty">No open positions right now.</p>
  return <div className="leadership-list">{openPositions.map(position => {
    const next = memberPositionHref(position.id)
    return <article className="leadership-position" id={`position-${position.id}`} key={position.id} aria-label={position.roleTitle}>
      <div><h2>{position.roleTitle}</h2><p className="leadership-meta">{position.term}</p>
        <p className="leadership-copy">{position.bio}</p>
        {position.closesAt && <p className="leadership-deadline"><CalendarDays size={16} aria-hidden="true"/><span>Apply by <LeadershipDate value={position.closesAt}/></span></p>}
      </div>
      <Link className="button button--ghost" href={signedIn ? next : `/member/login?next=${encodeURIComponent(next)}`}>
        {signedIn ? 'Apply' : 'Sign in to apply'}<ArrowRight size={17} aria-hidden="true"/>
      </Link>
    </article>
  })}</div>
}
