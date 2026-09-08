import type { z } from 'zod'
import type { projectTimelineSchema } from '@/lib/page-builder/schemas/engineering'
export function ProjectTimelineSection({section}:{section:z.infer<typeof projectTimelineSchema>}) {
return <section className="cms-section"><div className="shell"><div className="section-heading"><h2>{section.heading}</h2></div><ol className="pathway-timeline">{section.items.map(item=><li key={item.label+item.title}><span>{item.label}</span><div><h3>{item.title}</h3><p>{item.body}</p></div></li>)}</ol></div></section>
}
