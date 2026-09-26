import type { z } from 'zod'
import Image from 'next/image'
import type { disciplineGridSchema } from '@/lib/page-builder/schemas/engineering'
import type { PageRenderContext } from '@/lib/page-builder/types'
export function DisciplineGridSection({section,context}:{section:z.infer<typeof disciplineGridSchema>;context?:PageRenderContext}) {
return <>{context?.pageSlug==='home'&&<figure className="home-band"><Image src="https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/site/home-workshop-wide.jpg" alt="Three students in safety glasses assembling a machine at a workshop bench" fill sizes="100vw"/></figure>}<section className="cms-section disciplines-section"><div className="shell"><div className="section-heading"><h2>{section.heading}</h2></div><div className="discipline-grid">{section.items.map((item,index)=><article key={item.name}><span className="discipline-index" aria-hidden="true">{String(index+1).padStart(2,"0")}</span><h3>{item.name}</h3><p>{item.description}</p></article>)}</div></div></section></>
}
