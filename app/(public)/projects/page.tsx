import type { Metadata } from 'next'
import { metadataForCmsPage } from '@/lib/seo/metadata'
import { getPublishedPageBySlug } from '@/lib/page-builder/publicPages'
import { DirectoryHero } from '@/components/public/DirectoryHero'
import { ProjectCards } from '@/components/public/ProjectCards'
import { ProjectFilters } from '@/components/public/filters/ProjectFilters'
import { listPublishedProjects,parseProjectFilters } from '@/lib/content/projects'
import { projectCards } from '@/lib/content/projectCards'
import { publicMedia } from '@/lib/content/publicMedia'
import Link from 'next/link'
export async function generateMetadata():Promise<Metadata>{return metadataForCmsPage(await getPublishedPageBySlug('projects'))}
export default async function ProjectsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const raw=await searchParams
  const params=new URLSearchParams()
  for(const [key,value] of Object.entries(raw)){if(Array.isArray(value))value.forEach(v=>params.append(key,v));else if(value)params.set(key,value)}
  const filters=parseProjectFilters(params)
  const [projects,allProjects]=await Promise.all([listPublishedProjects(filters),listPublishedProjects({skills:[]})])
  const media=await publicMedia(projects.map(p=>p.cover_media_id).filter(Boolean))
  return <><DirectoryHero slug="projects" eyebrow="Projects" title="Projects" description="Explore project teams, the work involved, and how to take part."/><section className="directory"><div className="shell">{allProjects.length>=4&&<details className="advanced-filters" open={Boolean(filters.status||filters.discipline||filters.recruiting!==undefined)}><summary>More filters</summary><ProjectFilters defaults={filters}/></details>}
  {projects.length?<ProjectCards projects={projectCards(projects,media)} searchable/>:<div className="empty-state"><h2>{allProjects.length?'No projects match these filters.':'Project teams are forming.'}</h2><p>{allProjects.length?'Try clearing your filters to see all projects.':'Contact the club to join a team or propose a project.'}</p><Link className="button button--primary" href={allProjects.length?'/projects':'/get-involved?type=propose_project'}>{allProjects.length?'Clear filters':'Propose a project'}</Link></div>}
  </div></section></>
}
