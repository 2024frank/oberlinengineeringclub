'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function WithdrawApplicationButton({ applicationId, projectTitle }: { applicationId: string; projectTitle: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function withdraw() {
    if (!window.confirm(`Withdraw your application to ${projectTitle}?`)) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/member/project-applications', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ applicationId }) })
      if (!response.ok) { setError('This application was already decided. Refresh the page to see where it stands.'); return }
      router.refresh()
    } catch { setError('Could not reach the server. Please try again.') }
    finally { setBusy(false) }
  }
  return <>{error && <p className="portal-form-error" role="alert">{error}</p>}<button type="button" className="button button--ghost" disabled={busy} onClick={() => void withdraw()}>{busy ? 'Withdrawing...' : 'Withdraw application'}</button></>
}
