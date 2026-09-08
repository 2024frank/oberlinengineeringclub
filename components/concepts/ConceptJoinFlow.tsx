'use client'

import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Bot, CircuitBoard, Code2, Cog, FlaskConical, Leaf, Check, CheckCheck } from 'lucide-react'

const interests = [
  { name: 'Robotics', icon: Bot }, { name: 'Electronics', icon: CircuitBoard },
  { name: 'Code & computing', icon: Code2 }, { name: 'Design & fabrication', icon: Cog },
  { name: 'Materials', icon: FlaskConical }, { name: 'Energy & environment', icon: Leaf }
]

export function ConceptJoinFlow({ project, onProgress, onDone }: { project: string; onProgress: (step: number) => void; onDone: () => void }) {
  const [step, setStep] = useState(0), [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [major, setMajor] = useState(''), [error, setError] = useState('')
  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 1 && !name.trim()) { setError('Please enter your name.'); return }
    const next = step + 1; setStep(next); onProgress(next + 1); setError('')
  }
  if (step === 3) return <section className="concept-success" aria-live="polite">
    <CheckCheck size={44} strokeWidth={1.5}/><p className="concept-kicker">Preview complete</p>
    <h2>You belong<br/>in the workshop.</h2><p>Thanks, {name.trim().split(' ')[0]}. This was a test run. Nothing has been sent to the club.</p>
    <button className="concept-primary" onClick={onDone}>Back to exploring<ArrowRight size={20}/></button>
  </section>
  return <form className="concept-join" onSubmit={advance}>
    <p className="concept-kicker">Join the club <span>0{step + 1} / 03</span></p>
    <div className="concept-progress" aria-label={`Step ${step + 1} of 3`}><span style={{ width: `${(step + 1) / 3 * 100}%` }}/></div>
    <h2>{step === 0 ? 'What pulls you in?' : step === 1 ? 'Make yourself at home.' : 'Looking good.'}</h2>
    <p>{step === 0 ? 'Pick your interests. No experience required.' : step === 1 ? 'Every major and every experience level is welcome.' : 'Take one last look at your details.'}</p>
    {project && <p className="concept-project-choice">Project: <strong>{project}</strong></p>}
    {step === 0 && <fieldset className="concept-interests"><legend className="concept-sr">Your interests</legend>{interests.map(({ name: label, icon: Icon }) => <label key={label} className={selected.includes(label) ? 'selected' : ''}>
      <input type="checkbox" checked={selected.includes(label)} onChange={() => setSelected(s => s.includes(label) ? s.filter(v => v !== label) : [...s, label])}/>
      <Icon size={26} strokeWidth={1.5}/><span>{label}</span><Check size={16}/>
    </label>)}</fieldset>}
    {step === 1 && <div className="concept-fields">
      <label>Full name<input name="name" autoComplete="name" required maxLength={120} value={name} onChange={e => setName(e.target.value)}/></label>
      <label>Email<input name="email" autoComplete="email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>
      <label>Major or area of study <small>Optional</small><input name="major" maxLength={160} value={major} onChange={e => setMajor(e.target.value)}/></label>
    </div>}
    {step === 2 && <dl className="concept-review"><div><dt>Name</dt><dd>{name}</dd></div><div><dt>Email</dt><dd>{email}</dd></div>{major && <div><dt>Area of study</dt><dd>{major}</dd></div>}<div><dt>Interests</dt><dd>{selected.join(', ') || 'Still exploring'}</dd></div></dl>}
    {error && <p role="alert" className="concept-error">{error}</p>}
    <div className="concept-form-actions">
      {step > 0 && <button type="button" className="concept-icon" title="Previous step" aria-label="Previous step" onClick={() => { setStep(step - 1); onProgress(step); setError('') }}><ArrowLeft size={20}/></button>}
      <button className="concept-primary" type="submit">{step === 2 ? 'Finish preview' : 'Continue'}<ArrowRight size={20}/></button>
    </div>
    <p className="concept-preview-note">Design preview. Your details stay on this screen and are not submitted.</p>
  </form>
}
