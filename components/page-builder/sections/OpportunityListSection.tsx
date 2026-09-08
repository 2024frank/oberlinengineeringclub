import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { z } from 'zod'
import type { opportunityListSchema } from '@/lib/page-builder/schemas/community'
import type { PageRenderContext } from '@/lib/page-builder/types'
export function OpportunityListSection({section,context}:{section:z.infer<typeof opportunityListSchema>;context?:PageRenderContext}) {
const items=(context?.opportunities??[]).slice(0,section.limit)
if(!items.length)return null
return <section className="cms-section"><div className="shell"><div className="section-heading section-heading--row"><h2>{section.heading}</h2><Link className="text-link" href="/opportunities">All opportunities <ArrowUpRight size={18}/></Link></div><div className="list-stack">{items.map(item=><article key={String(item.id)}><div><small>{String(item.organization??'')}</small><h3>{String(item.title??'')}</h3><p>{String(item.summary??'')}</p></div>{item.url?<a className="text-link" href={String(item.url)} target="_blank" rel="noreferrer">Official page <ArrowUpRight size={18}/></a>:<Link href="/opportunities">Details</Link>}</article>)}</div></div></section>
}
