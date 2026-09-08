'use client'
import { Check, Field, TextArea } from './fields'
import { usePageAddress } from './usePageAddress'
import { MediaPicker } from '@/components/admin/media/MediaPicker'
import type { MediaAsset } from '@/lib/cms/media'

function localTime(value: unknown) {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function EventForm({ value, onChange, autoSlug = false, mediaAssets }: { value: Record<string, unknown>; onChange: (name: string, value: unknown) => void; autoSlug?: boolean; mediaAssets?: MediaAsset[] }) {
  const change = usePageAddress(onChange, autoSlug)
  return <div className="editor-form"><Field label="Title" name="title" value={value.title} onChange={change} required/><TextArea label="Summary" name="summary" value={value.summary} onChange={change}/><div className="form-grid"><Field label="Start time" name="startAt" value={localTime(value.startAt)} onChange={(name,next)=>change(name,next?new Date(String(next)).toISOString():null)} type="datetime-local" required/><Field label="End time" name="endAt" value={localTime(value.endAt)} onChange={(name,next)=>change(name,next?new Date(String(next)).toISOString():null)} type="datetime-local"/></div><Field label="Location" name="location" value={value.location} onChange={change}/><Field label="Organizer name" name="organizerName" value={value.organizerName} onChange={change} required/><TextArea label="Access details" name="accessDetails" value={value.accessDetails} onChange={change}/><div className="form-field-group"><label>Background image</label>{mediaAssets ? <MediaPicker assets={mediaAssets} value={typeof value.coverMediaId === 'string' ? value.coverMediaId : null} onChange={id => change('coverMediaId', id)}/> : <p className="hint">Upload an image in the Media Library first, then come back to select it here.</p>}</div><details className="portal-editor-details"><summary>More event details</summary><div><TextArea label="Description" name="description" value={value.description} onChange={change}/><Field label="Event type" name="eventType" value={value.eventType} onChange={change}/><Field label="Registration URL" name="registrationUrl" value={value.registrationUrl} onChange={change} type="url"/><Check label="Feature this event" name="featured" value={value.featured} onChange={change}/><Field label="Page address" name="slug" value={value.slug} onChange={change}/></div></details></div>
}
