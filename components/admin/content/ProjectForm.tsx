'use client'
import { Check, CsvField, Field, TextArea } from './fields'
import { usePageAddress } from './usePageAddress'
import { MediaPicker } from '@/components/admin/media/MediaPicker'
import type { MediaAsset } from '@/lib/cms/media'

export function ProjectForm({ value, onChange, autoSlug = false, mediaAssets }: { value: Record<string, unknown>; onChange: (name: string, value: unknown) => void; autoSlug?: boolean; mediaAssets?: MediaAsset[] }) {
  const change = usePageAddress(onChange, autoSlug)
  return <div className="editor-form">
    <Field label="Title" name="title" value={value.title} onChange={change} required/>
    <TextArea label="Summary" name="summary" value={value.summary} onChange={change}/>
    <div className="form-grid"><label>Project stage<select value={String(value.status ?? 'proposed')} onChange={event => change('status', event.target.value)}><option value="proposed">Proposed</option><option value="open_for_interest">Open for interest</option><option value="scoping">Planning</option><option value="active">Active</option><option value="complete">Complete</option></select></label><Field label="Primary discipline" name="discipline" value={value.discipline} onChange={change}/></div>
    <Check label="Accepting member applications" name="recruiting" value={value.recruiting} onChange={change}/>
    <label>Difficulty<select value={String(value.difficulty ?? '')} onChange={event => change('difficulty', event.target.value)}><option value="">Not set</option><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Intermediate–Advanced">Intermediate–Advanced</option><option value="Advanced">Advanced</option></select></label>
    <div className="form-field-group"><label>Background image</label>{mediaAssets ? <MediaPicker assets={mediaAssets} value={typeof value.coverMediaId === 'string' ? value.coverMediaId : null} onChange={id => change('coverMediaId', id)}/> : <p className="hint">Upload an image in the Media Library first, then come back to select it here.</p>}</div>
    <div className="form-grid"><Field label="Lead name" name="leadName" value={value.leadName} onChange={change} required={value.status === 'active'}/><Field label="Next step" name="nextStep" value={value.nextStep} onChange={change} required={value.status === 'active'}/></div>
    <details className="portal-editor-details"><summary>More project details</summary><div><TextArea label="Problem" name="problem" value={value.problem} onChange={change}/><TextArea label="Goal" name="goal" value={value.goal} onChange={change}/><CsvField label="Disciplines" name="disciplines" value={value.disciplines} onChange={change}/><CsvField label="Skills" name="skills" value={value.skills} onChange={change}/><CsvField label="Team names" name="teamNames" value={value.teamNames} onChange={change}/><Field label="GitHub URL" name="githubUrl" value={value.githubUrl} onChange={change} type="url"/><Field label="External URL" name="externalUrl" value={value.externalUrl} onChange={change} type="url"/><Field label="Page address" name="slug" value={value.slug} onChange={change}/></div></details>
  </div>
}
