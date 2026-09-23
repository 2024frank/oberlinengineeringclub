'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WorkspaceAction } from '@/lib/projects/workspaceInput'
import { workspaceErrorMessage } from '@/lib/projects/workspaceInput'

export function useWorkspaceAction(projectId: string) {
  const router = useRouter()
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  async function run(action: WorkspaceAction, success = '', { refresh = true } = {}) {
    if (busy) return false
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/member/projects/${projectId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) { setError(workspaceErrorMessage(body.error ?? '')); return false }
      setMessage(success)
      if (refresh) router.refresh()
      return true
    } catch { setError('Could not reach the server. Nothing changed; please try again.'); return false }
    finally { setBusy(false) }
  }
  return { run, busy, error, message, router }
}

export function WorkspaceNotice({ error, message }: { error: string; message: string }) {
  if (error) return <p className="portal-form-error" role="alert">{error}</p>
  if (message) return <p className="pt-notice" role="status">{message}</p>
  return null
}
