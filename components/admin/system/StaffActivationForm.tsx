'use client'

import { FormEvent, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { staffActivationErrorMessage } from '@/lib/auth/staffInviteMessages'

export function StaffActivationForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirmation = String(form.get('confirmation') ?? '')
    try {
      if (password.length < 10) throw new Error('Use at least 10 characters for your password.')
      if (password !== confirmation) throw new Error('Passwords do not match.')
      const supabase = createSupabaseBrowserClient()
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      // Members and officers share an auth identity. A member who keeps their existing
      // password must still be able to activate officer access.
      if (passwordError && passwordError.code !== 'same_password') {
        if (['session_not_found', 'session_expired', 'bad_jwt', 'refresh_token_not_found'].includes(passwordError.code ?? '') || passwordError.name === 'AuthSessionMissingError') throw new Error(staffActivationErrorMessage('AUTHENTICATED_INVITE_SESSION_REQUIRED'))
        if (passwordError.code === 'weak_password') throw new Error('This password does not meet the account security requirements. Choose a longer, unique password.')
        if (passwordError.status === 429) throw new Error('Too many attempts. Please wait a minute before trying again.')
        throw new Error('Could not set your password. Open the invitation link again and retry.')
      }
      let response: Response
      try {
        response = await fetch('/api/auth/staff/accept', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        })
      } catch {
        throw new Error('Could not reach the server. Check your connection and try again.')
      }
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(staffActivationErrorMessage(body.error))
      window.location.assign('/admin')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : staffActivationErrorMessage(''))
    } finally {
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className="settings-form">
    <p>If you already have an OEC member account, this sets the password for that same account. You can enter your current password.</p>
    <label>Choose password<input name="password" type="password" minLength={10} autoComplete="new-password" required /></label>
    <label>Confirm password<input name="confirmation" type="password" minLength={10} autoComplete="new-password" required /></label>
    <button className="button--cardinal" type="submit" disabled={busy}>{busy ? 'Activating…' : 'Activate officer account'}</button>
    {error && <p role="alert">{error}</p>}
  </form>
}
