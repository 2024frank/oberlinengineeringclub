import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { z } from 'zod'
import type { ctaSchema } from '@/lib/page-builder/schemas/cta'
export function CtaSection({section}:{section:z.infer<typeof ctaSchema>}) {
return <section className={'cms-section cta-section cta-section--'+section.tone}><div className="shell cta-inner"><div><h2>{section.heading}</h2><p>{section.body}</p></div><div className="button-row"><Link className="button button--primary" href={section.primaryCta.href}>{section.primaryCta.label}<ArrowUpRight size={18}/></Link>{section.secondaryCta&&<Link className="text-link" href={section.secondaryCta.href}>{section.secondaryCta.label}<ArrowUpRight size={17}/></Link>}</div></div></section>
}
