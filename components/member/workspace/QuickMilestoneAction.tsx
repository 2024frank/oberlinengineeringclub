'use client'
import { Check, Hand } from 'lucide-react'
import { useWorkspaceAction } from './useWorkspaceAction'

// One-click milestone actions for the dashboard; the full controls live in the workspace.
export function QuickMilestoneAction({ projectId, milestoneId, title, mode }: { projectId: string; milestoneId: string; title: string; mode: 'done' | 'claim' }) {
  const action = useWorkspaceAction(projectId)
  const run = () => void action.run(mode === 'done' ? { action: 'milestone-status', milestoneId, status: 'DONE' } : { action: 'milestone-claim', milestoneId, claim: true })
  return <span className="dash-quick">
    <button type="button" className="pt-btn pt-btn--small" disabled={action.busy} onClick={run} aria-label={mode === 'done' ? `Mark ${title} done` : `Take ${title}`}>
      {mode === 'done' ? <><Check size={14}/>{action.busy ? 'Saving...' : 'Mark done'}</> : <><Hand size={14}/>{action.busy ? 'Saving...' : "I'll take it"}</>}
    </button>
    {action.error && <span className="dash-quick__error" role="alert">{action.error}</span>}
  </span>
}
