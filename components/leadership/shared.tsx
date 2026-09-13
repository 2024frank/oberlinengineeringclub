import type { OfficerApplication, OfficerPosition } from '@/lib/leadership/types'

export const applicationLabels: Record<OfficerApplication['status'], string> = {
  PENDING: 'Pending', SHORTLISTED: 'Shortlisted', NOT_SELECTED: 'Not selected', WITHDRAWN: 'Withdrawn',
}

export function isPositionOpen(position: OfficerPosition) {
  return position.closesAt === null || new Date(position.closesAt).getTime() > Date.now()
}

export function memberPositionHref(id: string) {
  return `/member/leadership?position=${encodeURIComponent(id)}`
}

export function LeadershipDate({ value }: { value: string }) {
  return <time dateTime={value}>{new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short',
  }).format(new Date(value))}</time>
}

export function ApplicationStatus({ status }: { status: OfficerApplication['status'] }) {
  return <span className={`leadership-status leadership-status--${status.toLowerCase()}`}>{applicationLabels[status]}</span>
}
