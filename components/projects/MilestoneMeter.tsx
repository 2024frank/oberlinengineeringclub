import './milestone-meter.css'

export type MeterSegment = 'done' | 'active' | 'blocked' | 'todo'
const fromStatus: Record<string, MeterSegment> = { DONE: 'done', IN_PROGRESS: 'active', BLOCKED: 'blocked', TODO: 'todo' }

// A build meter: one segment per milestone, so progress reads as steps rather than a percentage.
export function MilestoneMeter({ done = 0, total = 0, statuses, showLabel = true }: { done?: number; total?: number; statuses?: string[]; showLabel?: boolean }) {
  const segments: MeterSegment[] = statuses ? statuses.map(status => fromStatus[status] ?? 'todo') : Array.from({ length: total }, (_, index) => index < done ? 'done' : 'todo')
  const count = segments.length
  if (!count) return null
  const finished = segments.filter(segment => segment === 'done').length
  const label = finished === count ? `All ${count} milestones done` : `${finished} of ${count} milestones done`
  return <div className="milestone-meter">
    <span className="milestone-meter__track" role="img" aria-label={label}>
      {count <= 24 ? segments.map((segment, index) => <span key={index} className={`milestone-meter__seg is-${segment}`}/>)
        : <>{finished > 0 && <span className="milestone-meter__seg is-done" style={{ flexGrow: finished }}/>}{finished < count && <span className="milestone-meter__seg is-todo" style={{ flexGrow: count - finished }}/>}</>}
    </span>
    {showLabel && <span className="milestone-meter__label" aria-hidden="true">{label}</span>}
  </div>
}
