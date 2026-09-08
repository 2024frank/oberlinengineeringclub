import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { SaveButton } from '@/components/member/SaveButton'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { getPublishedProject } from '@/lib/content/projects'
import { isSavedItem } from '@/lib/members/saves'
import { publicMedia } from '@/lib/content/publicMedia'
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const project=await getPublishedProject((await params).slug)
  return {title:project?.title??'Project not found',description:project?.summary}
}
export default async function ProjectPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params
  const p=await getPublishedProject(slug)
  if(!p)notFound()
  const member=await getCurrentMember()
  const media = p.cover_media_id ? await publicMedia([p.cover_media_id]) : {}
  const cover = media[p.cover_media_id]
  const saved=member?await isSavedItem(member.userId,'PROJECT',p.id):false
  const timeline=(p.timeline??[]) as Array<{label?:string;title?:string;body?:string;description?:string}>
  return <><section className="project-detail-heading"><div className="shell"><Link className="breadcrumb" href="/projects"><ArrowLeft size={16}/>All projects</Link><span className="project-state">{String(p.status).replaceAll('_',' ')}</span><h1>{p.title}</h1>{(p.problem||p.goal)&&<p>{p.summary}</p>}<div className="tag-row">{(p.disciplines??[]).map((d:string)=><span key={d}>{d}</span>)}</div></div></section>
  <section className="detail-body"><div className="shell detail-grid"><div className="prose">
    {cover && <figure className="project-cover"><Image src={cover.url} alt={cover.alt || p.title} width={1200} height={800} sizes="(max-width:950px) 100vw, 760px" priority/></figure>}
    {!p.problem&&!p.goal&&p.summary&&<><h2>Project brief</h2><p>{p.summary}</p></>}
    {p.problem&&<><h2>Problem</h2><p>{p.problem}</p></>}
    {p.goal&&<><h2>Goal</h2><p>{p.goal}</p></>}
    {p.skills?.length>0&&<><h2>Skills you can contribute</h2><ul className="project-detail-skills" aria-label="Project skills">{p.skills.map((skill:string)=><li key={skill}>{skill}</li>)}</ul></>}
    {timeline.length>0&&<><h2>Timeline</h2><ol className="project-detail-timeline">{timeline.map((step,index)=><li key={index}><small>{step.label}</small><h3>{step.title}</h3><p>{step.body??step.description}</p></li>)}</ol></>}
    {p.updates?.length>0&&<><h2>Project updates</h2>{p.updates.map((u:{id:string;update_date?:string;title:string;summary:string})=><article className="update" key={u.id}><small>{u.update_date}</small><h3>{u.title}</h3><p>{u.summary}</p></article>)}</>}
  </div>
  <aside className="detail-aside"><h2>Take part</h2><p>Contact the club about joining this project.</p><Link className="button button--primary" href={'/get-involved?type=join_project&project='+encodeURIComponent(p.title)}>Express interest <ArrowUpRight size={17}/></Link><SaveButton itemType="PROJECT" itemId={p.id} canSave={Boolean(member)} initialSaved={saved}/><dl>{p.difficulty&&<><dt>Difficulty</dt><dd>{p.difficulty}</dd></>}{p.lead_name&&<><dt>Lead</dt><dd>{p.lead_name}</dd></>}{p.next_step&&<><dt>Next step</dt><dd>{p.next_step}</dd></>}</dl>{p.recruiting&&<Link className="text-link" href={member?'/member/applications?project='+p.id:'/member/login'}>{member?'Apply to join project':'Sign in to apply'}</Link>}{p.github_url&&<a className="text-link" href={p.github_url} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={16}/></a>}{p.external_url&&<a className="text-link" href={p.external_url} target="_blank" rel="noreferrer">Project website <ArrowUpRight size={16}/></a>}</aside></div></section></>
}
