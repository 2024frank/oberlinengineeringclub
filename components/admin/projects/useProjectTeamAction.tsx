'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectTeamAction } from '@/lib/projects/teamAdminInput'
import { projectTeamErrorMessage } from '@/lib/projects/teamAdminInput'

type Body = { ok?: boolean; error?: string; emailSent?: boolean; emailsSent?: number; result?: Record<string, unknown> }

export function useProjectTeamAction() {
  const router = useRouter()
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  async function run(action: ProjectTeamAction, success: (body: Body) => string, { refresh = true } = {}) {
    if (busy) return null
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/project-teams', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action) })
      const body = await response.json().catch(() => ({})) as Body
      if (!response.ok) { setError(projectTeamErrorMessage(body.error ?? '')); return null }
      setMessage(success(body))
      if (refresh) router.refresh()
      return body
    } catch { setError('Could not reach the server. Nothing changed; please try again.'); return null }
    finally { setBusy(false) }
  }
  return { run, busy, error, message, router }
}

export function ActionNotice({ error, message }: { error: string; message: string }) {
  if (error) return <p className="portal-form-error" role="alert">{error}</p>
  if (message) return <p className="pt-notice" role="status">{message}</p>
  return null
}
