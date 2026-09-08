import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { z } from 'zod'
import type { eventListSchema } from '@/lib/page-builder/schemas/community'
import type { PageRenderContext } from '@/lib/page-builder/types'
export function EventListSection({section,context}:{section:z.infer<typeof eventListSchema>;context?:PageRenderContext}) {
const items=(context?.events??[]).slice(0,section.limit)
return <section className="cms-section events-section"><div className="shell"><div className="section-heading section-heading--row"><h2>{section.heading}</h2><Link className="text-link" href="/events">All events <ArrowUpRight size={18}/></Link></div>{items.length?<div className="list-stack">{items.map(e=><article key={String(e.id)}><div><small>{e.start_at?new Date(String(e.start_at)).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'}):'Date to be announced'}</small><h3>{String(e.title)}</h3><p>{String(e.location??'')}</p></div><Link className="text-link" href={'/events/'+String(e.slug)}>Details <ArrowUpRight size={18}/></Link></article>)}</div>:<div className="event-planning"><p>Fall events are being planned. Dates and locations will be posted when confirmed.</p><div>{[['Build nights','Work on projects with other members.'],['Technical workshops','Practice electronics, fabrication, and software.'],['Alumni conversations','Talk about engineering study and careers.']].map(([title,body])=><article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></div>}</div></section>
}
