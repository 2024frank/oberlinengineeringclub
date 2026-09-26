import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { z } from 'zod'
import type { projectGridSchema } from '@/lib/page-builder/schemas/engineering'
import type { PageRenderContext } from '@/lib/page-builder/types'
import { ProjectCards } from '@/components/public/ProjectCards'
import { projectCards } from '@/lib/content/projectCards'
export function ProjectGridSection({section,context}:{section:z.infer<typeof projectGridSchema>;context?:PageRenderContext}) {
  // Projects have no featured flag; this option shows projects that are accepting members.
  const records=(context?.projects??[]).filter(p=>!section.featuredOnly||p.recruiting).slice(0,section.limit)
  const home = context?.pageSlug === 'home'
  // The homepage shows a lead project and eight more in a grid; the full list is one click away.
  if (home) records.splice(9)
  return <section className={'cms-section projects-section' + (home ? ' projects-section--home' : '')}><div className="shell"><div className="section-heading section-heading--row"><h2>{home ? 'Projects' : section.heading}</h2><Link className="text-link" href="/projects">All projects <ArrowUpRight size={18}/></Link></div>{records.length?<ProjectCards projects={projectCards(records,context?.media,context?.teamStats)} searchable={!home} layout={home ? 'magazine' : 'grid'}/>:<div className="empty-state"><h3>Project details will be posted here.</h3><Link className="text-link" href="/get-involved?type=propose_project">Propose a project <ArrowUpRight size={18}/></Link></div>}<div className="project-proposal-prompt"><h3>Have a project in mind?</h3><Link className="text-link" href="/get-involved?type=propose_project">Propose a project <ArrowUpRight size={18}/></Link></div></div></section>
}
