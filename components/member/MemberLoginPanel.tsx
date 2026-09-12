'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export function MemberLoginPanel({ authError, status }: { authError?: string; status?: string } = {}) {
  const router = useRouter()
  const [mode,setMode] = useState<'password'|'magic'|'reset'|'request'>('password')
  const [error, setError] = useState(authError === 'auth_link' ? 'This email link has expired or has already been used. Request a new setup email below and open the newest message.' : '')
  const [notice, setNotice] = useState(status === 'approval_required'
    ? 'Your OEC member account must be approved and active before you can enter the member portal.'
    : status === 'password_reset' ? 'Password updated. Sign in with your new password.' : '')
  const [busy, setBusy] = useState('')

  async function passwordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('password'); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: String(form.get('email') ?? '').trim().toLowerCase(),
        password: String(form.get('password') ?? ''),
      })
      if (authError) throw new Error('Sign-in failed. Check your Oberlin email and password.')
      router.replace('/member'); router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.')
    } finally { setBusy('') }
  }

  async function magicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('magic'); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/member/magic-link', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: String(form.get('email') ?? '') }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error === 'ACTIVE_MEMBER_REQUIRED' ? 'That email does not have an active approved OEC member account.' : body.error ?? 'Could not send sign-in link.')
      setNotice('Sign-in link sent to your approved Oberlin email.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send sign-in link.') }
    finally { setBusy('') }
  }



  async function passwordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('reset'); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/member/password-reset', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: String(form.get('email') ?? '') }),
      })
      if (!response.ok) throw new Error('Could not send a password reset right now.')
      setNotice('If that address belongs to an active OEC member, a password reset link was sent to the Oberlin email.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send password reset.') }
    finally { setBusy('') }
  }

  async function requestMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('request'); setError(''); setNotice('')
    const element=event.currentTarget
    const form = new FormData(element)
    try {
      const response = await fetch('/api/auth/member/request', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: String(form.get('displayName') ?? ''), email: String(form.get('email') ?? '') }),
      })
      const body = await response.json()
      if (!response.ok) {
        const messages: Record<string, string> = {
          OBERLIN_EMAIL_REQUIRED: 'Use your @oberlin.edu email.',
          DISPLAY_NAME_REQUIRED: 'Enter your full name.',
          MEMBERSHIP_REQUEST_BLOCKED: 'An officer needs to help with this account. Please contact the club.',
          MEMBERSHIP_EMAIL_RATE_LIMITED: 'Too many email requests. Please wait 15 minutes before trying again.',
          MEMBERSHIP_EMAIL_FAILED: 'Your request is saved, but the email could not be sent. Wait a minute and try again. You do not need to start over.',
        }
        throw new Error(messages[body.error] ?? 'Could not complete your request right now. Please try again in a minute.')
      }
      if (body.status === 'ACTIVE') setNotice('Your account is already set up. Sign in, or use Forgot password if you need a new password.')
      else if (body.status === 'PENDING_APPROVAL') setNotice('Your email is verified. You are waiting for an officer to approve your account. You do not need to submit another request.')
      else if (body.retryAfter) setNotice('We already sent an email in the last minute. Check your inbox and spam folder, and use the newest message. Wait a minute before requesting another.')
      else if (body.status === 'APPROVED') setNotice('Setup email sent. Open the newest message to choose a password and finish setting up your account.')
      else setNotice('Check your inbox and spam folder for the newest verification email. If you were already invited, your approval is kept. Open the link to continue setup.')
      element.reset()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not submit membership request.') }
    finally { setBusy('') }
  }

  return <div className="member-auth-grid"><section className="admin-login__card">
    <div className="auth-tabs" aria-label="Account access">{(['password','request'] as const).map(tab=><button key={tab} type="button" aria-pressed={tab==='password'?mode!=='request':mode==='request'} onClick={()=>{setMode(tab);setError('');setNotice('')}}>{tab==='password'?'Sign in':'Request an account'}</button>)}</div>
    <h2>{mode==='password'?'Member sign in':mode==='magic'?'Email sign-in link':mode==='reset'?'Reset your password':'Request an account'}</h2>
    <p>{mode==='request'?'Verify your Oberlin email, then wait for the club to approve your account.':'Use your approved Oberlin email.'}</p>
    <form className="settings-form" onSubmit={mode==='password'?passwordSignIn:mode==='magic'?magicLink:mode==='reset'?passwordReset:requestMembership}>
    {mode==='request'&&<label>Full name<input name="displayName" autoComplete="name" minLength={2} required/></label>}
    <label>Oberlin email<input name="email" type="email" autoComplete={mode==='password'?'username':'email'} required/></label>
    {mode==='password'&&<label>Password<input name="password" type="password" autoComplete="current-password" required/></label>}
    {(error||notice)&&<p className="member-auth-message" role={error?'alert':'status'}>{error||notice}</p>}
    <button type="submit" disabled={Boolean(busy)}>{busy?'Please wait...':mode==='password'?'Sign in':mode==='magic'?'Send sign-in link':mode==='reset'?'Send reset link':'Request account'}</button>
    </form>
    <div className="auth-options">{mode==='password'?<><button type="button" onClick={()=>{setMode('magic');setError('');setNotice('')}}>Sign in with an email link</button><button type="button" onClick={()=>{setMode('reset');setError('');setNotice('')}}>Forgot password?</button></>:<button type="button" onClick={()=>{setMode('password');setError('');setNotice('')}}>Back to sign in</button>}{mode!=='request'&&<button type="button" onClick={()=>{setMode('request');setError('');setNotice('')}}>Request a new setup email</button>}</div>
  </section></div>
}
