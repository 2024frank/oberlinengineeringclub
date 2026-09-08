import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCmsRenderContext } from '@/lib/page-builder/publicPages'
import { ConceptExperience } from '@/components/concepts/ConceptExperience'
import type { Direction } from '@/components/concepts/worlds'
import '../concepts.css'
import '../machine.css'

const directions = ['robot', 'machine', 'hall']
export const metadata: Metadata = { title: 'Design concepts | Oberlin Engineering Club', robots: { index: false, follow: false } }
export default async function ConceptPage({ params }: { params: Promise<{ direction: string }> }) {
  const { direction } = await params
  if (!directions.includes(direction)) notFound()
  const content = await getCmsRenderContext()
  const projects = (content.projects ?? []).map(p => ({ id: p.id, title: p.title, summary: p.summary ?? '', status: p.status ?? '', disciplines: p.disciplines ?? [] }))
  const events = ('events' in content ? content.events ?? [] : []).map(e => ({ id: e.id, title: e.title, start: e.start_at, location: e.location ?? '' }))
  return <ConceptExperience key={direction} direction={direction as Direction} projects={projects} events={events}/>
}
