import { CircuitBoard, Cog, Cpu, FlaskConical, Bot, Waves } from 'lucide-react'
import type { z } from 'zod'
import type { disciplineGridSchema } from '@/lib/page-builder/schemas/engineering'
const icons=[Cog,CircuitBoard,Cpu,FlaskConical,Bot,Waves]
export function DisciplineGridSection({section}:{section:z.infer<typeof disciplineGridSchema>}) {
return <section className="cms-section disciplines-section"><div className="shell"><div className="section-heading"><h2>{section.heading}</h2></div><div className="discipline-grid">{section.items.map((item,index)=>{const Icon=icons[index%icons.length];return <article key={item.name}><Icon size={26} strokeWidth={1.4}/><h3>{item.name}</h3><p>{item.description}</p></article>})}</div></div></section>
}
