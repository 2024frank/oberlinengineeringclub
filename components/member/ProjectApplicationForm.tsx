'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useFormReady } from './useFormReady'
import { ArrowLeft, ArrowRight, CheckCircle2, Send } from 'lucide-react'

export function ProjectApplicationForm({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const ready = useFormReady()
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || sent) return
    const form = new FormData(event.currentTarget)
    const motivation = String(form.get('motivation') ?? '').trim()
    if (motivation.length < 10) { setError('Add a little more about why this project interests you.'); return }
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/member/project-applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId, motivation, skills: String(form.get('skills') ?? '').split(',').map(value => value.trim()).filter(Boolean) }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Your application could not be sent. Please try again.')
      setSent(true)
    } catch (error) { setError(error instanceof Error ? error.message : 'Your application could not be sent. Please try again.') }
    finally { setBusy(false) }
  }
  if (sent) return <section className="portal-success" role="status"><CheckCircle2 size={32}/><h2>Application sent</h2><p>The project lead for {projectTitle} will review your request.</p><Link className="button button--primary" href="/member/applications">View my applications <ArrowRight size={17}/></Link></section>
  return <form className="portal-form member-profile-form" onSubmit={submit}><fieldset className="portal-editor-fields" disabled={!ready || busy}><Link className="portal-text-link" href="/member/projects"><ArrowLeft size={16}/>Back to projects</Link><h2>Apply to {projectTitle}</h2><label>Why do you want to join?<textarea name="motivation" rows={5} minLength={10} maxLength={3000} required/></label><label>Relevant skills <small>Optional, separated by commas</small><input name="skills" placeholder="CAD, C++, prototyping"/></label>{error && <p className="portal-form-error" role="alert">{error}</p>}<div className="portal-form-footer"><span>Sent to the project lead for review</span><button className="button button--primary" disabled={busy}><Send size={17}/>{busy ? 'Sending...' : 'Send application'}</button></div></fieldset></form>
}
