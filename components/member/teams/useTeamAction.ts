'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TeamAction } from '@/lib/teams/input'

export function useTeamAction(admin = false) {
  const router = useRouter()
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  async function run(action: TeamAction, success = 'Saved.') {
    if (busy) return null
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/${admin ? 'admin' : 'member'}/teams`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'The change could not be saved.')
      const result = body.result as { teamId: string; status: string | null }
      const expected = action.action === 'respond' ? (action.decision === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED') : null
      setMessage(result.status === 'EXPIRED' ? 'This invitation expired. Ask the team lead for a new one.' : expected && result.status !== expected ? `This invitation was already answered. Status: ${result.status?.toLowerCase() ?? 'unavailable'}.` : success)
      router.refresh()
      return result
    } catch (error) { setError(error instanceof Error ? error.message : 'The change could not be saved. Please try again.'); return null }
    finally { setBusy(false) }
  }
  return { run, busy, error, message, router }
}
