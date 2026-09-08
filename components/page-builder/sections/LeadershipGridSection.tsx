import Image from 'next/image'
import type { z } from 'zod'
import type { leadershipGridSchema } from '@/lib/page-builder/schemas/community'
import type { PageRenderContext } from '@/lib/page-builder/types'
export function LeadershipGridSection({section,context}:{section:z.infer<typeof leadershipGridSchema>;context?:PageRenderContext}) {
const items=(context?.leaders??[]).slice(0,section.limit)
if(!items.length)return null
return <section className="cms-section"><div className="shell"><div className="section-heading"><h2>{section.heading}</h2></div><div className="leadership-grid">{items.map(person=>{const name=String(person.name??'');const photo=context?.media?.[String(person.photo_media_id)];return <article key={String(person.id)}>{photo?<Image src={photo.url} alt={name} width={400} height={400}/>:<div className="leader-initials">{name.split(' ').map(p=>p[0]).slice(0,2).join('')}</div>}<h3>{name}</h3><p className="text-link">{String(person.role_title??'')}</p><p>{String(person.bio??'')}</p></article>})}</div></div></section>
}
