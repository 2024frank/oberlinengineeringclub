'use client'

import { FormEvent, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { useFormReady } from './useFormReady'

export function MemberActivationForm() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ready = useFormReady()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirmation = String(form.get('confirmation') ?? '')
    try {
      if (password.length < 10) throw new Error('Use at least 10 characters for your password.')
      if (password !== confirmation) throw new Error('Passwords do not match.')
      const supabase = createSupabaseBrowserClient()
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      // Members and officers share an auth identity. An unchanged existing password
      // is already valid and must not prevent activation of the member profile.
      if (passwordError && passwordError.code !== 'same_password') {
        if (['session_not_found', 'session_expired', 'bad_jwt', 'refresh_token_not_found'].includes(passwordError.code ?? '') || passwordError.name === 'AuthSessionMissingError') throw new Error('Your setup session has expired. Ask an officer to resend your setup email, then open the newest link in this browser.')
        if (passwordError.code === 'weak_password') throw new Error('This password does not meet the account security requirements. Choose a longer, unique password.')
        if (passwordError.status === 429) throw new Error('Too many attempts. Please wait a minute before trying again.')
        throw new Error('Your password could not be saved. Please try again. If this continues, request a new setup email.')
      }
      const response = await fetch('/api/auth/member/activate', { method: 'POST' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Member activation failed.')
      window.location.assign('/member')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Member activation failed.') }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="settings-form"><fieldset disabled={!ready || busy} className="member-activation-fields">
    <label>Choose password<input name="password" type="password" minLength={10} autoComplete="new-password" required /></label>
    <label>Confirm password<input name="confirmation" type="password" minLength={10} autoComplete="new-password" required /></label>
    <button className="button--cardinal" type="submit" disabled={busy}>{busy ? 'Activating…' : 'Activate member account'}</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>
}
