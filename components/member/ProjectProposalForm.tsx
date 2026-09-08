'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useFormReady } from './useFormReady'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Send } from 'lucide-react'
import { normalizeProjectProposalInput } from '@/lib/projects/proposals'

const steps = ['Your idea', 'Team & details', 'Review']
const initial = { title: '', summary: '', problem: '', goal: '', disciplines: '', recruitingNeeds: '', links: '' }
export function ProjectProposalForm() {
  const [step, setStep] = useState(0), [values, setValues] = useState(initial)
  const ready = useFormReady()
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null), firstRender = useRef(true)
  useEffect(() => { if (firstRender.current) { firstRender.current = false; return } heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView?.({ block: 'nearest' }) }, [step, sent])
  function field(name: keyof typeof initial) { return { name, value: values[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues(previous => ({ ...previous, [name]: event.target.value })) } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || sent) return
    setError('')
    if (step === 0 && (values.title.trim().length < 3 || values.problem.trim().length < 10 || values.goal.trim().length < 10)) { setError('Add a title, the problem, and what you want to accomplish.'); return }
    const input = { ...values, disciplines: values.disciplines.split(',').map(value => value.trim()).filter(Boolean), links: values.links.split(/\r?\n/).map(value => value.trim()).filter(Boolean) }
    if (step === 1) {
      try { normalizeProjectProposalInput(input) }
      catch { setError('Add valid supporting links starting with https:// or http://.'); return }
    }
    if (step < 2) { setStep(step + 1); return }
    setBusy(true)
    try {
      const payload = normalizeProjectProposalInput(input)
      const response = await fetch('/api/member/project-proposals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error === 'PROJECT_LINK_INVALID' ? 'Check your supporting links and try again.' : 'Your idea could not be sent. Your draft is still here. Please try again.')
      setSent(true)
    } catch (error) { setError(error instanceof Error ? error.message : 'Your idea could not be sent. Please try again.') }
    finally { setBusy(false) }
  }
  if (sent) return <section className="portal-success" role="status"><CheckCircle2 size={32}/><h2 tabIndex={-1} ref={heading}>Idea submitted</h2><p>The club team will review {values.title}. Their decision and feedback will appear in My ideas.</p><Link className="button button--primary" href="/member/proposals">View my ideas <ArrowRight size={17}/></Link></section>
  return <form className="portal-form" onSubmit={submit}><fieldset className="portal-editor-fields" disabled={!ready || busy}>
    <ol className="portal-stepper" aria-label="Proposal progress">{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}><span>{index < step ? <Check size={15}/> : index + 1}</span>{label}</li>)}</ol>
    <h2 ref={heading} tabIndex={-1}>{step === 0 ? 'What would you like to build?' : step === 1 ? 'Who and what will you need?' : 'Review your idea'}</h2>
    {step === 0 && <><label>Project title<input {...field('title')} minLength={3} maxLength={160} required/></label><label>What problem are you solving?<textarea {...field('problem')} rows={3} minLength={10} maxLength={4000} required/></label><label>What should the project accomplish?<textarea {...field('goal')} rows={3} minLength={10} maxLength={4000} required/></label></>}
    {step === 1 && <><p className="portal-muted">These details are optional.</p><label>Short summary<textarea {...field('summary')} rows={2} maxLength={1200}/></label><label>Engineering disciplines <small>Separated by commas</small><input {...field('disciplines')} placeholder="Electrical, Mechanical, Computer Science"/></label><label>Who or what skills do you want to recruit?<textarea {...field('recruitingNeeds')} rows={3} maxLength={1200}/></label><label>Supporting links <small>One URL per line</small><textarea {...field('links')} rows={2}/></label></>}
    {step === 2 && <dl className="portal-review">{[['Project', values.title], ['Problem', values.problem], ['Goal', values.goal], ['Summary', values.summary], ['Disciplines', values.disciplines], ['Team needs', values.recruitingNeeds], ['Links', values.links]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {error && <p className="portal-form-error" role="alert">{error}</p>}
    <div className="portal-form-footer">{step > 0 ? <button className="button button--ghost" type="button" disabled={busy} onClick={() => { setError(''); setStep(step - 1) }}><ArrowLeft size={17}/>Back</button> : <Link className="portal-text-link" href="/member/proposals">Cancel</Link>}<button className="button button--primary" disabled={busy}>{step === 2 && <Send size={17}/>} {busy ? 'Submitting...' : step === 0 ? 'Continue' : step === 1 ? 'Review idea' : 'Submit idea'}{step < 2 && <ArrowRight size={17}/>}</button></div>
  </fieldset></form>
}
