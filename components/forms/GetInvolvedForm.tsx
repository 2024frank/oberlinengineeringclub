'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, CheckCheck, CircuitBoard, Cog, Cpu, FlaskConical, Bot, Waves, Copy } from 'lucide-react'
import { submissionSchema } from '@/lib/submissions/schema'

const options = [['join_club', 'Join the club'], ['join_project', 'Join a project'], ['propose_project', 'Propose a project'], ['leadership_interest', 'Explore leadership'], ['event_volunteer', 'Help with events']] as const
const interests = [
  { label: '3D printing & design', icon: Cog },
  { label: 'Electronics', icon: CircuitBoard },
  { label: 'Software & AI', icon: Cpu },
  { label: 'Materials & chemistry', icon: FlaskConical },
  { label: 'Robotics', icon: Bot },
  { label: 'Energy & environment', icon: Waves }
]
const initialFields = { fullName: '', email: '', major: '', classYear: '', projectIdea: '', organization: '', message: '', honeypot: '', interests: '' }
type Fields = typeof initialFields & { project: string }

export function GetInvolvedForm({ defaultType = 'join_club', defaultProject = '', defaultFocus = '' }: { defaultType?: string; defaultProject?: string; defaultFocus?: string }) {
  const [started] = useState(() => Date.now())
  const [type, setType] = useState(options.some(([value]) => value === defaultType) ? defaultType : 'join_club')
  const [fields, setFields] = useState<Fields>({ ...initialFields, project: defaultProject })
  const [selected, setSelected] = useState<number[]>([])
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState<'idle' | 'busy' | 'success'>('idle')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({})
  const [copied, setCopied] = useState(false)
  const [capstone, setCapstone] = useState(defaultFocus === 'capstone')
  const proposal = type === 'propose_project'
  const capstoneRequest = proposal && capstone
  const steps = [proposal ? 'Project idea' : 'Interests', 'Your details', 'Review & send']
  const heading = useRef<HTMLHeadingElement>(null)
  const flow = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    heading.current?.focus({ preventScroll: true })
    const tablet = flow.current?.closest<HTMLElement>('.workbench-surface, .robot-terminal-content')
    if (tablet) tablet.scrollTo({ top: 0, behavior: 'instant' })
    else flow.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [step])
  const title = options.find(([value]) => value === type)?.[1] ?? 'Join the club'
  const payload = () => ({ ...fields, type, message: capstoneRequest ? `[Capstone exploration]\n${fields.message}` : fields.message, interests: [...selected.map(index => interests[index].label), fields.interests].filter(Boolean).join('; '), formStartedAt: started })
  const update = (name: keyof Fields, value: string) => setFields(previous => ({ ...previous, [name]: value }))
  function validate(names: string[]) {
    const result = submissionSchema.safeParse(payload())
    const errors = result.success ? {} : result.error.flatten().fieldErrors
    const relevant = Object.fromEntries(Object.entries(errors).filter(([name]) => names.includes(name)))
    setFieldErrors(relevant)
    return Object.keys(relevant).length === 0
  }
  function advance() {
    const names = step === 0 ? ['project', 'projectIdea', 'organization'] : ['fullName', 'email', 'major', 'classYear', 'interests', 'message']
    if (validate(names)) { setError(''); setStep(value => value + 1) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < 2) { advance(); return }
    const parsed = submissionSchema.safeParse(payload())
    if (!parsed.success) { setFieldErrors(parsed.error.flatten().fieldErrors); setStep(1); return }
    if (status === 'busy') return
    setStatus('busy'); setError('')
    try {
      const response = await fetch('/api/submissions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(parsed.data) })
      const data = await response.json()
      if (response.ok) { setStatus('success'); return }
      setStatus('idle')
      setFieldErrors(data.fieldErrors ?? {})
      if (data.fieldErrors) setStep(Object.keys(data.fieldErrors).some(name => ['project', 'projectIdea', 'organization'].includes(name)) ? 0 : 1)
      setError(data.error === 'RATE_LIMITED' ? 'Too many submissions from this network. Please try again later.' : 'Your message was not sent. Please check your details and try again.')
    } catch { setStatus('idle'); setError('We could not send your message. Your details are still here. Please try again.') }
  }
  function input(name: keyof Fields, label: string, required = false, inputType = 'text') {
    return <label>{label}{!required && <span className="field-optional">Optional</span>}
      <input aria-label={label} name={name} type={inputType} value={fields[name]} onChange={event => update(name, event.target.value)} required={required} autoComplete={name === 'fullName' ? 'name' : name === 'email' ? 'email' : undefined} maxLength={name === 'email' ? 320 : name === 'classYear' ? 40 : name === 'project' || name === 'organization' ? 200 : 160} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? name + '-error' : undefined}/>
      {fieldErrors[name] && <small id={name + '-error'} role="alert">{fieldErrors[name]?.[0]}</small>}
    </label>
  }
  const phase = status === 'success' ? 3 : step
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('oec-join-progress', { detail: { phase, interest: selected.at(-1) ?? 0 } }))
  }, [phase, selected])
  return <section className="join-experience">
    <div className="join-flow" ref={flow}>
      {status === 'success' ? <div className="join-success" role="status">
        <CheckCheck size={32}/><p className="eyebrow">Request received</p>
        <h1 ref={heading} tabIndex={-1}>Thanks, {fields.fullName.trim().split(' ')[0]}.</h1>
        <p>Your message is with the OEC team. We will use the email you provided to follow up.</p>
        <div className="button-row"><button className="button button--primary" onClick={async () => { try { await navigator.clipboard.writeText('https://oberlin32engineeringsociety.com/get-involved'); setCopied(true) } catch { setError('Copy this link: https://oberlin32engineeringsociety.com/get-involved') } }}><Copy size={16}/>{copied ? 'Link copied' : 'Copy club link'}</button><Link className="text-link" href="/projects">Explore projects<ArrowRight size={17}/></Link></div>
        {error && <p role="alert">{error}</p>}
      </div> : <form onSubmit={submit} noValidate className="join-form">
        <nav aria-label="Join progress" className="join-progress">{steps.map((label, index) => <button type="button" key={label} disabled={index > step || status === 'busy'} aria-current={index === step ? 'step' : undefined} onClick={() => { setStep(index); setError('') }}><span>{index < step ? <Check size={12}/> : '0' + (index + 1)}</span>{label}</button>)}</nav>
        <div className="join-step" key={step}>
          <p className="eyebrow">Oberlin Engineering Club</p>
          <h1 ref={heading} tabIndex={-1}>{step === 0 ? capstoneRequest ? 'Discuss a capstone' : title : step === 1 ? 'Your details' : 'Review your request'}</h1>
          <p className="join-intro">{step === 0 ? proposal ? 'Tell us what you want to work on and what help you need.' : 'All majors are welcome. No previous engineering experience required.' : step === 1 ? 'We will follow up at the email you provide.' : 'Your request will go to the club officers.'}</p>
          {step === 0 && <>
            <label>I would like to<select name="type" value={type} onChange={event => { setType(event.target.value); setFieldErrors({}) }}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {type === 'join_project' && input('project', 'Project', true)}
            {proposal && <>
              <label>What would you like to build?<textarea aria-label="What would you like to build?" name="projectIdea" value={fields.projectIdea} onChange={event => update('projectIdea', event.target.value)} rows={5} maxLength={5000} required aria-invalid={Boolean(fieldErrors.projectIdea)} aria-describedby={fieldErrors.projectIdea ? 'project-idea-error' : undefined}/>{fieldErrors.projectIdea && <small id="project-idea-error" role="alert">{fieldErrors.projectIdea[0]}</small>}</label>
              <label className="capstone-choice"><input type="checkbox" checked={capstone} onChange={event => setCapstone(event.target.checked)}/><span>Explore this as a capstone</span></label>
              {capstoneRequest && <p className="capstone-notice">OEC can help you explore directions and find teammates. Confirm course requirements and academic credit with your adviser.</p>}
              <p className="proposal-member-link">Already a member? <Link href="/member/proposals">Submit in your workspace.</Link></p>
            </>}
            {type === 'partnership_inquiry' && input('organization', 'Organization or group', true)}
            {!proposal && type !== 'partnership_inquiry' && <fieldset className="interest-choices"><legend className="sr-only">Your interests</legend>{interests.map(({ label, icon: Icon }, index) => <label key={label} className={selected.includes(index) ? 'is-selected' : ''}><input type="checkbox" checked={selected.includes(index)} onChange={() => setSelected(previous => previous.includes(index) ? previous.filter(item => item !== index) : [...previous, index])}/><Icon size={22} strokeWidth={1.5}/><span>{label}</span><Check size={14} className="interest-check"/></label>)}</fieldset>}
          </>}
          {step === 1 && <><div className="join-field-grid">{input('fullName', 'Full name', true)}{input('email', 'Email', true, 'email')}{input('major', 'Major or area of study')}{input('classYear', 'Class year')}</div>
            <label>Other interests or skills<span className="field-optional">Optional</span><input name="interests" value={fields.interests} maxLength={900} onChange={event => update('interests', event.target.value)}/>{fieldErrors.interests && <small role="alert">{fieldErrors.interests[0]}</small>}</label>
            <label>{proposal ? 'Timeline, teammates, or support you need' : 'Anything else?'}<span className="field-optional">Optional</span><textarea name="message" value={fields.message} rows={3} maxLength={capstoneRequest ? 4970 : 5000} onChange={event => update('message', event.target.value)}/>{fieldErrors.message && <small role="alert">{fieldErrors.message[0]}</small>}</label>
          </>}
          {step === 2 && <dl className="join-review"><div><dt>I would like to</dt><dd>{capstoneRequest ? 'Capstone exploration' : title}</dd></div><div><dt>Name</dt><dd>{fields.fullName}</dd></div><div><dt>Email</dt><dd>{fields.email}</dd></div><div><dt>Interests</dt><dd>{payload().interests || 'Exploring what interests me'}</dd></div>{type === 'join_project' && <div><dt>Project</dt><dd>{fields.project}</dd></div>}{type === 'propose_project' && <div><dt>Project idea</dt><dd>{fields.projectIdea}</dd></div>}{type === 'partnership_inquiry' && <div><dt>Organization</dt><dd>{fields.organization}</dd></div>}{fields.message && <div><dt>Message</dt><dd>{fields.message}</dd></div>}</dl>}
        </div>
        <div className="honeypot" aria-hidden="true"><input name="honeypot" tabIndex={-1} autoComplete="off" value={fields.honeypot} onChange={event => update('honeypot', event.target.value)}/></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="join-actions">{step > 0 && <button type="button" className="join-back" aria-label="Previous step" onClick={() => setStep(value => value - 1)} disabled={status === 'busy'}><ArrowLeft size={18}/></button>}<button type="submit" className="button button--primary" disabled={status === 'busy'}>{status === 'busy' ? 'Sending...' : step === 2 ? 'Send to OEC' : 'Continue'}<ArrowRight size={17}/></button></div>
      </form>}
    </div>
  </section>
}
