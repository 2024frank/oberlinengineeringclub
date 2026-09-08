import Image from 'next/image'
import Link from 'next/link'
import type { z } from 'zod'
import type { textImageSchema } from '@/lib/page-builder/schemas/content'
import type { PageRenderContext } from '@/lib/page-builder/types'
export function TextImageSection({section,context}:{section:z.infer<typeof textImageSchema>;context?:PageRenderContext}) {
  const media=section.imageId?context?.media?.[section.imageId]:undefined
  return <section className="cms-section"><div className={media?'shell split-section split-section--'+section.layout:'shell text-section'}><div><h2>{section.heading}</h2><p>{section.body}</p>{section.cta&&<Link className="text-link" href={section.cta.href}>{section.cta.label}</Link>}</div>{media&&<div className="media-frame"><Image src={media.url} alt={section.imageAlt||media.alt} width={800} height={600}/></div>}</div></section>
}
