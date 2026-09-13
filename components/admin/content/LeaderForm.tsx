'use client'
import { Check, Field, TextArea } from './fields'
import { MediaPicker } from '@/components/admin/media/MediaPicker'
import type { MediaAsset } from '@/lib/cms/media'

function localTime(value: unknown) {
  if (!value) return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export function LeaderForm({ value, onChange, mediaAssets }: { value: Record<string, unknown>; onChange: (name: string, value: unknown) => void; mediaAssets?: MediaAsset[] }) {
  const open = Boolean(value.openSeat)
  function change(name: string, next: unknown) {
    onChange(name, next)
    if (name === 'openSeat' && next) { onChange('name', value.roleTitle || 'Open position'); onChange('advisor', false); onChange('current', true) }
    if (name === 'roleTitle' && open) onChange('name', next)
  }
  return <div className="editor-form">
    <Check label="Accept applications for this role" name="openSeat" value={open} onChange={change}/>
    <div className="form-grid">
      {!open && <Field label="Name" name="name" value={value.name} onChange={change} required/>}
      <Field label="Role title" name="roleTitle" value={value.roleTitle} onChange={change} required/>
      <Field label="Term" name="term" value={value.term} onChange={change}/>
      {open ? <Field label="Application deadline (your local time, optional)" name="applicationClosesAt" type="datetime-local" value={localTime(value.applicationClosesAt)} onChange={(name, next) => change(name, next ? new Date(String(next)).toISOString() : null)}/> : <>
        <Field label="Class year" name="classYear" value={value.classYear} onChange={change}/>
        <Field label="Major" name="major" value={value.major} onChange={change}/>
        <Field label="Email" name="email" value={value.email} onChange={change} type="email"/>
      </>}
    </div>
    <TextArea label={open ? 'Responsibilities and who should apply' : 'Bio'} name="bio" value={value.bio} onChange={change}/>
    {!open && <><Field label="LinkedIn URL" name="linkedinUrl" value={value.linkedinUrl} onChange={change} type="url"/>
      <div className="form-field-group"><label>Photo</label>{mediaAssets && <MediaPicker assets={mediaAssets} value={typeof value.photoMediaId === 'string' ? value.photoMediaId : null} onChange={id => change('photoMediaId', id)}/>}</div></>}
    <div className="check-row"><Check label="Current" name="current" value={value.current} onChange={change}/>{!open && <Check label="Advisor" name="advisor" value={value.advisor} onChange={change}/>}</div>
  </div>
}
