'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export function MemberLoginPanel() {
  const router = useRouter()
  const [mode,setMode] = useState<'password'|'magic'|'reset'|'request'>('password')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status')
    if (status === 'approval_required') setNotice('Your OEC member account must be approved and active before you can enter the member portal.')
    if (status === 'password_reset') setNotice('Password updated. Sign in with your new password.')
  }, [])
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
        if (String(body.error ?? '').startsWith('MEMBERSHIP_REQUEST_EXISTS:')) throw new Error('A membership request already exists for that Oberlin email.')
        throw new Error(body.error === 'OBERLIN_EMAIL_REQUIRED' ? 'Use your @oberlin.edu email.' : body.error ?? 'Could not submit membership request.')
      }
      setNotice('Verification email sent. Verify your Oberlin email, then an OEC Admin will review your request.')
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
    <div className="auth-options">{mode==='password'?<><button type="button" onClick={()=>setMode('magic')}>Sign in with an email link</button><button type="button" onClick={()=>setMode('reset')}>Forgot password?</button></>:<button type="button" onClick={()=>setMode('password')}>Back to sign in</button>}</div>
  </section></div>
}
