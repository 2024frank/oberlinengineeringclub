'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useLeadershipAction(endpoint: string) {
  const router = useRouter()
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(payload: Record<string, string>) {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok || result?.ok !== true) {
        throw new Error(typeof result?.error === 'string' ? result.error : 'Your changes could not be saved. Please try again.')
      }
      router.refresh()
      return true
    } catch (cause) {
      setError(cause instanceof Error && !(cause instanceof SyntaxError) ? cause.message : 'Your changes could not be saved. Please try again.')
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return { run, busy, error }
}
