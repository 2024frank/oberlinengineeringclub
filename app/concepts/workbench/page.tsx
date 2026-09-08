import type { Metadata } from 'next'
import { getCmsRenderContext } from '@/lib/page-builder/publicPages'
import { WorkbenchPreview } from '@/components/concepts/workbench/WorkbenchPreview'
import '../concepts.css'
import './workbench.css'

export const metadata: Metadata = { title: 'Workshop design preview | Oberlin Engineering Club', robots: { index: false, follow: false } }

export default async function WorkbenchPage() {
  const content = await getCmsRenderContext()
  const projects = (content.projects ?? []).map(project => ({ id: project.id, slug: project.slug, title: project.title, summary: project.summary ?? '', status: project.status ?? '', disciplines: project.disciplines ?? [] }))
  const events = (content.events ?? []).map(event => ({ id: event.id, title: event.title, start: event.start_at, location: event.location ?? '' }))
  return <WorkbenchPreview projects={projects} events={events}/>
}
