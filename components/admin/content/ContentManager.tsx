'use client'
import { formatPortalDate } from '@/lib/format/portalDate'
import { useRef, useState } from 'react'
import { Check, Pencil, Plus, Save, Search, Upload } from 'lucide-react'
import type { ContentEntityType } from '@/lib/cms/contentDrafts'
import type { AdminContentRow } from '@/lib/cms/adminContent'
import type { MediaAsset } from '@/lib/cms/media'
import { EditorDrawer } from '@/components/admin/EditorDrawer'
import { formRegistry, defaultsByType } from './formRegistry'
import { useToast } from '@/components/ui/Toast'
import { projectPublishSchema } from '@/lib/validation/projects'
import { eventPublishSchema } from '@/lib/validation/events'

type Draft = { id: string; payload: Record<string, unknown>; title: string }
type Props = { entityType: ContentEntityType; title: string; rows: AdminContentRow[]; canPublish: boolean; initialCreate?: boolean; mediaAssets?: MediaAsset[]; onSaveDraft?: (id: string, payload: Record<string, unknown>) => Promise<void>; onPublishDraft?: (id: string) => Promise<void> }

export function ContentManager({ entityType, title, rows: initial, canPublish, initialCreate = false, mediaAssets, onSaveDraft, onPublishDraft }: Props) {
  const singular = ({ news_posts: 'News post', resources: 'Resource', opportunities: 'Opportunity', leaders: 'Leader', partner_schools: 'Partner school' } as Partial<Record<ContentEntityType, string>>)[entityType] ?? title.replace(/s$/, '')
  const newDraft = (): Draft => ({ id: crypto.randomUUID(), title: '', payload: structuredClone(defaultsByType[entityType]) })
  const [rows, setRows] = useState(initial), [query, setQuery] = useState(''), [stateFilter, setStateFilter] = useState('')
  const [current, setCurrent] = useState<Draft | null>(() => initialCreate ? newDraft() : null)
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null), [feedback, setFeedback] = useState(''), [error, setError] = useState(''), [confirmClose, setConfirmClose] = useState(false)
  const [savedPayload, setSavedPayload] = useState(() => JSON.stringify(current?.payload))
  const fields = useRef<HTMLFieldSetElement>(null)
  const toast = useToast(), Form = formRegistry[entityType]
  const dirty = Boolean(current && JSON.stringify(current.payload) !== savedPayload)
  const visibleRows = rows.filter(row => row.title.toLowerCase().includes(query.trim().toLowerCase()) && (!stateFilter || (stateFilter === 'draft' ? row.hasDraft || row.status === 'draft' : row.status === stateFilter)))
  function open(draft: Draft) { setSavedPayload(JSON.stringify(draft.payload)); setCurrent(draft); setFeedback(''); setError(''); setConfirmClose(false) }
  function close() { if (busy) return; if (dirty) setConfirmClose(true); else setCurrent(null) }
  function change(name: string, value: unknown) {
    setCurrent(draft => draft ? { ...draft, payload: { ...draft.payload, [name]: value }, title: name === 'title' || name === 'name' ? String(value) : draft.title } : draft)
    setFeedback(''); setError('')
  }
  function updateRow(draft: Draft, published: boolean) {
    setRows(previous => {
      const existing = previous.find(row => row.id === draft.id)
      const next = { id: draft.id, title: draft.title || 'Untitled', status: published ? 'published' : existing?.status ?? 'draft', updatedAt: new Date().toISOString(), hasDraft: !published, payload: structuredClone(draft.payload) }
      return existing ? previous.map(row => row.id === draft.id ? next : row) : [next, ...previous]
    })
  }
  async function saveDraft(draft: Draft) {
    if (onSaveDraft) await onSaveDraft(draft.id, draft.payload)
    else {
      const response = await fetch('/api/admin/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entityType, entityId: draft.id, payload: draft.payload }) })
      if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? 'Could not save the draft.') }
    }
    updateRow(draft, false)
    setSavedPayload(JSON.stringify(draft.payload))
  }
  async function save(publish: boolean) {
    if (!current || busy) return
    if (publish) {
      const schema = entityType === 'projects' ? projectPublishSchema : entityType === 'events' ? eventPublishSchema : null
      const result = schema?.safeParse(current.payload)
      if (result && !result.success) {
        const labels: Record<string, string> = { slug: 'Page address', title: 'Title', startAt: 'Start time', endAt: 'End time', organizerName: 'Organizer name', location: 'Location or access details', leadName: 'Lead name', nextStep: 'Next step', externalUrl: 'External URL', githubUrl: 'GitHub URL', registrationUrl: 'Registration URL' }
        const messages = result.error.issues.map(issue => {
          const name = String(issue.path[0] ?? '')
          const label = labels[name] ?? name.replace(/([A-Z])/g, ' $1')
          if (!name) return issue.message
          if (issue.code === 'too_big') return `${label} exceeds the ${issue.maximum} limit`
          return label
        })
        setError(`Before publishing, check: ${[...new Set(messages)].join('; ')}. Your changes are still in the editor.`)
        setFeedback('')
        const firstName = String(result.error.issues[0].path[0] ?? 'leadName')
        const first = fields.current?.elements.namedItem(firstName)
        if (first instanceof HTMLElement) { const details = first.closest('details'); if (details) details.open = true; first.focus() }
        return
      }
    }
    setBusy(publish ? 'publish' : 'save'); setError(''); setFeedback('')
    try {
      await saveDraft(current)
      if (publish) {
        if (onPublishDraft) await onPublishDraft(current.id)
        else {
          const response = await fetch('/api/publish/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entityType, entityId: current.id }) })
          if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? 'Publishing failed. Your draft is saved.') }
        }
        updateRow(current, true)
      }
      const message = publish ? 'Published to the club website.' : 'Draft saved. Not published.'
      setFeedback(message); toast(message)
    } catch (error) { const message = error instanceof Error ? error.message : 'Could not save. Please try again.'; setError(message); toast(message, 'error') }
    finally { setBusy(null) }
  }
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>{title}</h1><p>{rows.length} {title.toLowerCase()}</p></div><button className="button button--cardinal" onClick={() => open(newDraft())}><Plus size={18}/>New {singular}</button></div>
    <div className="content-search"><label><Search size={18}/><input type="search" aria-label={`Search ${title}`} placeholder={`Search ${title.toLowerCase()}`} value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="Publication status" value={stateFilter} onChange={event => setStateFilter(event.target.value)}><option value="">All statuses</option><option value="draft">Draft changes</option><option value="published">Published</option></select><span role="status">{visibleRows.length} shown</span></div>
    <div className="manager-list">{visibleRows.map(row => <article key={row.id}><div><strong>{row.title}</strong><small className={row.hasDraft || row.status === 'draft' ? 'portal-draft-label' : 'portal-published-label'}>{row.hasDraft ? 'Unpublished changes' : row.status === 'published' ? 'Published' : row.status.replaceAll('_', ' ')}</small></div><time dateTime={row.updatedAt}>{formatPortalDate(row.updatedAt)}</time><button type="button" aria-label={`Edit ${row.title}`} onClick={() => open({ id: row.id, title: row.title, payload: structuredClone(row.payload) })}><Pencil size={17}/><span>Edit</span></button></article>)}</div>
    {!visibleRows.length && <div className="portal-empty"><div><h2>{rows.length ? 'No matching records.' : `No ${title.toLowerCase()} yet.`}</h2>{rows.length ? <button className="button button--ghost" onClick={() => { setQuery(''); setStateFilter('') }}>Clear filters</button> : <button className="button button--primary" onClick={() => open(newDraft())}><Plus size={17}/>Create first {singular.toLowerCase()}</button>}</div></div>}
    <EditorDrawer open={Boolean(current)} title={current?.title || `New ${singular.toLowerCase()}`} onClose={close}>{current && <>
      {confirmClose ? <div className="portal-discard" role="alert"><h3>Discard unsaved changes?</h3><p>Your latest edits have not been saved.</p><div><button className="button button--primary" onClick={() => setConfirmClose(false)}>Keep editing</button><button className="button button--ghost" onClick={() => { setConfirmClose(false); setCurrent(null) }}>Discard changes</button></div></div> : <>
        <fieldset ref={fields} className="portal-editor-fields" disabled={Boolean(busy)}><Form key={current.id} value={current.payload} onChange={change} mediaAssets={mediaAssets} autoSlug={!rows.some(row => row.id === current.id)}/></fieldset>
        {error && <p className="portal-form-error" role="alert">{error}</p>}{feedback && <p className="portal-save-feedback" role="status"><Check size={17}/>{feedback}</p>}
        <footer className="editor-actions"><span className="portal-save-state">{dirty ? 'Unsaved changes' : feedback ? 'Saved' : 'Draft editor'}</span><button type="button" disabled={Boolean(busy)} onClick={close}>Close</button><button type="button" disabled={Boolean(busy)} onClick={() => void save(false)}><Save size={16}/>{busy === 'save' ? 'Saving...' : 'Save draft'}</button>{canPublish && <button className="button--cardinal" type="button" disabled={Boolean(busy)} onClick={() => void save(true)}><Upload size={16}/>{busy === 'publish' ? 'Publishing...' : 'Publish'}</button>}</footer>
      </>}
    </>}</EditorDrawer>
  </main>
}
