'use client'
import { Check, CsvField, Field, TextArea } from './fields'
import { usePageAddress } from './usePageAddress'

export function ProjectForm({ value, onChange, autoSlug = false }: { value: Record<string, unknown>; onChange: (name: string, value: unknown) => void; autoSlug?: boolean }) {
  const change = usePageAddress(onChange, autoSlug)
  return <div className="editor-form">
    <Field label="Title" name="title" value={value.title} onChange={change} required/>
    <TextArea label="Summary" name="summary" value={value.summary} onChange={change}/>
    <div className="form-grid"><label>Project stage<select value={String(value.status ?? 'proposed')} onChange={event => change('status', event.target.value)}><option value="proposed">Proposed</option><option value="open_for_interest">Open for interest</option><option value="scoping">Planning</option><option value="active">Active</option><option value="complete">Complete</option></select></label><Field label="Primary discipline" name="discipline" value={value.discipline} onChange={change}/></div>
    <Check label="Accepting member applications" name="recruiting" value={value.recruiting} onChange={change}/>
    <div className="form-grid"><Field label="Lead name" name="leadName" value={value.leadName} onChange={change} required={value.status === 'active'}/><Field label="Next step" name="nextStep" value={value.nextStep} onChange={change} required={value.status === 'active'}/></div>
    <details className="portal-editor-details"><summary>More project details</summary><div><TextArea label="Problem" name="problem" value={value.problem} onChange={change}/><TextArea label="Goal" name="goal" value={value.goal} onChange={change}/><CsvField label="Disciplines" name="disciplines" value={value.disciplines} onChange={change}/><CsvField label="Skills" name="skills" value={value.skills} onChange={change}/><CsvField label="Team names" name="teamNames" value={value.teamNames} onChange={change}/><Field label="GitHub URL" name="githubUrl" value={value.githubUrl} onChange={change} type="url"/><Field label="External URL" name="externalUrl" value={value.externalUrl} onChange={change} type="url"/><Field label="Page address" name="slug" value={value.slug} onChange={change}/></div></details>
  </div>
}
