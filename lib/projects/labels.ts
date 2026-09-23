export const stageLabels: Record<string, string> = { proposed: 'Proposed', open_for_interest: 'Open for interest', scoping: 'Planning', active: 'Active', complete: 'Complete' }
export const milestoneStatusLabels = { TODO: 'To do', IN_PROGRESS: 'In progress', BLOCKED: 'Blocked', DONE: 'Done' } as const
export const postKindLabels = { UPDATE: 'Progress update', WIN: 'Win', BLOCKER: 'Blocker', QUESTION: 'Question' } as const

export const stageLabel = (status: string) => stageLabels[status] ?? status.replaceAll('_', ' ')
export const publicationLabel = (state: string) => state === 'published' ? 'On the website' : state === 'archived' ? 'Hidden from website' : 'Draft'

export function relativeTime(value: string | null | undefined, now = Date.now()) {
  if (!value) return ''
  const minutes = Math.round((now - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
}

export function formatDueDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })
}
export function isOverdue(dueDate: string | null, status: string, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(dueDate && status !== 'DONE' && dueDate < today)
}
