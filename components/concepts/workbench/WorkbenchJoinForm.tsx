'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ReceiptText } from 'lucide-react'

const interests = ['Robotics', 'Electronics', 'Software', 'Fabrication', 'Materials', 'Energy']
const steps = ['Interests', 'Your details', 'Review']

type WorkbenchJoinFormProps = {
  project?: string
  onProgress: (step: number) => void
  onDone: () => void
}

export function WorkbenchJoinForm({ project, onProgress, onDone }: WorkbenchJoinFormProps) {
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [major, setMajor] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const heading = useRef<HTMLHeadingElement>(null)
  const reportedStep = useRef<number | null>(null)
  const id = useId()
  const finished = step === 4

  useEffect(() => {
    if (reportedStep.current === step) return
    reportedStep.current = step
    heading.current?.closest<HTMLElement>('.workbench-surface')?.scrollTo({ top: 0, behavior: 'instant' })
    heading.current?.focus({ preventScroll: true })
    onProgress(step)
  }, [step, onProgress])

  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (finished) return
    if (step === 2) {
      const nextErrors: typeof errors = {}
      if (!name.trim()) nextErrors.name = 'Please enter your name.'
      if (!email.trim()) nextErrors.email = 'Please enter your email.'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Please enter a valid email address.'
      setErrors(nextErrors)
      if (nextErrors.name || nextErrors.email) {
        const field = event.currentTarget.elements.namedItem(nextErrors.name ? 'name' : 'email')
        if (field instanceof HTMLInputElement) field.focus()
        return
      }
    }
    setErrors({})
    setStep(step + 1)
  }

  const review = <dl className="wb-field-grid">
    <div><dt>Name</dt><dd>{name.trim()}</dd></div>
    <div><dt>Email</dt><dd>{email.trim()}</dd></div>
    {major.trim() && <div><dt>Major or area of study</dt><dd>{major.trim()}</dd></div>}
    <div><dt>Interests</dt><dd>{selected.join(', ') || 'No interests selected'}</dd></div>
    {project && <div><dt>Project</dt><dd>{project}</dd></div>}
  </dl>

  return <section className={finished ? 'wb-paper wb-receipt' : 'wb-paper'} aria-labelledby={`${id}-heading`}>
    <header className="wb-paper-head">
      <p>Oberlin Engineering Club</p>
      <span className="wb-step-number" aria-hidden="true">{finished ? <Check size={42}/> : `0${step}`}</span>
      <p className="wb-small">{finished ? '3 of 3 steps complete' : `Step ${step} of 3`}</p>
      <h2 id={`${id}-heading`} ref={heading} tabIndex={-1}>
        {step === 1 ? 'Join the club' : step === 2 ? 'Your details' : step === 3 ? 'Review your request' : 'Preview complete'}
      </h2>
    </header>
    <ol className="wb-form-steps" aria-label="Registration steps">
      {steps.map((label, index) => <li key={label} aria-current={index + 1 === step ? 'step' : undefined}>
        <span>{index + 1}</span> {label}
      </li>)}
    </ol>
    {finished ? <>
      <span className="wb-receipt-stamp" aria-hidden="true">Preview only</span>
      <ReceiptText size={28} aria-hidden="true"/>
      <p role="status">Nothing was sent to the club. This preview did not register you as a member.</p>
      {review}
      <p className="wb-small">Preview receipt only. Your details have not been saved.</p>
      <div className="wb-form-actions">
        <button type="button" className="wb-secondary" onClick={onDone}>
          <ArrowLeft size={18} aria-hidden="true"/>Back to exploring
        </button>
      </div>
    </> : <form key={step} className="wb-registration-step" onSubmit={advance} noValidate autoComplete="off" aria-describedby={`${id}-disclosure`}>
      {project && step < 3 && <p className="wb-small">Project: <strong>{project}</strong></p>}
      {step === 1 && <fieldset className="wb-interest-list">
        <legend>Your interests</legend>
        {interests.map(label => <label key={label}>
          <input type="checkbox" name="interests" value={label} checked={selected.includes(label)} onChange={() => setSelected(previous => previous.includes(label) ? previous.filter(value => value !== label) : [...previous, label])}/>
          <span>{label}</span>
        </label>)}
      </fieldset>}
      {step === 2 && <div className="wb-field-grid">
        <div>
          <label htmlFor={`${id}-name`}>Full name
            <input id={`${id}-name`} name="name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${id}-name-error` : undefined}/>
          </label>
          {errors.name && <span id={`${id}-name-error`} role="alert" className="wb-error">{errors.name}</span>}
        </div>
        <div>
          <label htmlFor={`${id}-email`}>Email
            <input id={`${id}-email`} name="email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? `${id}-email-error` : undefined}/>
          </label>
          {errors.email && <span id={`${id}-email-error`} role="alert" className="wb-error">{errors.email}</span>}
        </div>
        <label htmlFor={`${id}-major`}>Major or area of study <span className="wb-small">(optional)</span>
          <input id={`${id}-major`} name="major" maxLength={160} value={major} onChange={event => setMajor(event.target.value)}/>
        </label>
      </div>}
      {step === 3 && review}
      <p id={`${id}-disclosure`} className="wb-small">
        {step === 3 ? 'Finishing this preview does not send a request or register you with the club. Your details are not saved.' : 'Local preview only. Your details are not sent to the club or saved.'}
      </p>
      <div className="wb-form-actions">
        {step > 1 && <button type="button" className="wb-secondary wb-icon" aria-label="Previous step" title="Previous step" onClick={() => { setErrors({}); setStep(step - 1) }}>
          <ArrowLeft size={18} aria-hidden="true"/>
        </button>}
        <button type="submit" className="wb-primary">
          {step === 3 ? 'Finish preview' : 'Continue'}
          {step === 3 ? <Check size={18} aria-hidden="true"/> : <ArrowRight size={18} aria-hidden="true"/>}
        </button>
      </div>
    </form>}
  </section>
}
