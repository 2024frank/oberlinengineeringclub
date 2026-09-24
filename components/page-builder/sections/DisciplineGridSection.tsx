import type { z } from 'zod'
import type { disciplineGridSchema } from '@/lib/page-builder/schemas/engineering'
export function DisciplineGridSection({section}:{section:z.infer<typeof disciplineGridSchema>}) {
return <section className="cms-section disciplines-section"><div className="shell"><div className="section-heading"><h2>{section.heading}</h2></div><div className="discipline-grid">{section.items.map(item=><article key={item.name}><h3>{item.name}</h3><p>{item.description}</p></article>)}</div></div></section>
}
