import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from 'lucide-react'
import { SaveButton } from '@/components/member/SaveButton'
import { MilestoneMeter } from '@/components/projects/MilestoneMeter'
import { ProjectCards } from '@/components/public/ProjectCards'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { getPublishedProject, listPublishedProjects } from '@/lib/content/projects'
import { projectCards } from '@/lib/content/projectCards'
import { getProjectTeamStats } from '@/lib/content/projectTeamStats'
import { teamPhase, teamPhaseLabels } from '@/lib/content/teamStatsModel'
import { isSavedItem } from '@/lib/members/saves'
import { publicMedia } from '@/lib/content/publicMedia'
import { listMyProjectApplications } from '@/lib/projects/applications'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { stageLabels } from '@/lib/projects/labels'
import { formatPortalDate } from '@/lib/format/portalDate'

const stages = Object.keys(stageLabels)
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const project=await getPublishedProject((await params).slug)
  return {title:project?.title??'Project not found',description:project?.summary}
}

// Where this visitor stands with the project decides the one action we offer.
async function viewerState(member: Awaited<ReturnType<typeof getCurrentMember>>, projectId: string) {
  if (!member) return 'visitor' as const
  try {
    const [teams, applications] = await Promise.all([listMyProjectWorkspaces(), listMyProjectApplications(member.userId)])
    if (teams.some(team => team.projectId === projectId)) return 'on-team' as const
    if (applications.some(application => application.projectId === projectId && application.status === 'PENDING')) return 'applied' as const
  } catch { /* fall back to the plain member view */ }
  return 'member' as const
}

// Up to three other projects, those sharing a discipline first. A failure here must not break the page.
async function relatedProjects(project: { id: string; disciplines?: string[] }) {
  try {
    const all = (await listPublishedProjects({ skills: [] })) as Array<Record<string, unknown>>
    const shares = (other: Record<string, unknown>) => Array.isArray(other.disciplines) && other.disciplines.some(d => project.disciplines?.includes(String(d)))
    const others = all.filter(other => other.id !== project.id).sort((a, b) => Number(shares(b)) - Number(shares(a))).slice(0, 3)
    const ids = others.map(other => String(other.id))
    const [media, stats] = await Promise.all([publicMedia(others.map(other => other.cover_media_id).filter(Boolean) as string[]), getProjectTeamStats(ids)])
    return projectCards(others, media, stats)
  } catch { return [] }
}

export default async function ProjectPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params
  const p=await getPublishedProject(slug)
  if(!p)notFound()
  const member=await getCurrentMember()
  const [media, stats, viewer, saved, related] = await Promise.all([
    p.cover_media_id ? publicMedia([p.cover_media_id]) : Promise.resolve({} as Record<string, { url: string; alt: string }>),
    getProjectTeamStats([p.id]),
    viewerState(member, p.id),
    member ? isSavedItem(member.userId,'PROJECT',p.id) : Promise.resolve(false),
    relatedProjects(p),
  ])
  const cover = media[p.cover_media_id]
  const team = stats[p.id]
  const phase = teamPhase(team, { status: String(p.status), recruiting: Boolean(p.recruiting) })
  const applyPath = `/member/applications?project=${p.id}`
  const stageIndex = stages.indexOf(String(p.status))
  const timeline=(p.timeline??[]) as Array<{label?:string;title?:string;body?:string;description?:string}>
  return <><section className="project-detail-heading"><div className="shell"><Link className="breadcrumb" href="/projects"><ArrowLeft size={16}/>All projects</Link><h1>{p.title}</h1>{(p.problem||p.goal)&&<p>{p.summary}</p>}<div className="tag-row">{(p.disciplines??[]).map((d:string)=><span key={d}>{capitalize(d)}</span>)}</div>
    {stageIndex >= 0 && <ol className="project-stage-track" aria-label="Project stage">{stages.map((stage, index) => <li key={stage} className={index < stageIndex ? 'is-done' : index === stageIndex ? 'is-current' : undefined} aria-current={index === stageIndex ? 'step' : undefined}><span aria-hidden="true">{index < stageIndex ? <Check size={13}/> : index + 1}</span>{stageLabels[stage]}</li>)}</ol>}
  </div></section>
  <section className="detail-body"><div className="shell detail-grid"><div className="prose">
    {cover && <figure className="project-cover"><Image src={cover.url} alt={cover.alt || p.title} width={1200} height={800} sizes="(max-width:950px) 100vw, 760px" priority/></figure>}
    {!p.problem&&!p.goal&&p.summary&&<><h2>Project brief</h2><p>{p.summary}</p></>}
    {p.problem&&<><h2>Problem</h2><p>{p.problem}</p></>}
    {p.goal&&<><h2>Goal</h2><p>{p.goal}</p></>}
    {p.skills?.length>0&&<><h2>Skills you can contribute</h2><ul className="project-detail-skills" aria-label="Project skills">{p.skills.map((skill:string)=><li key={skill}>{skill}</li>)}</ul></>}
    {timeline.length>0&&<><h2>Timeline</h2><ol className="project-detail-timeline">{timeline.map((step,index)=><li key={index}><small>{step.label}</small><h3>{step.title}</h3><p>{step.body??step.description}</p></li>)}</ol></>}
    {p.updates?.length>0&&<><h2>Project updates</h2>{p.updates.map((u:{id:string;update_date?:string;title:string;summary:string})=><article className="update" key={u.id}><small>{u.update_date}</small><h3>{u.title}</h3><p>{u.summary}</p></article>)}</>}
  </div>
  <aside className="detail-aside project-join" aria-labelledby="project-join-heading">
    <h2 id="project-join-heading">{viewer === 'on-team' ? 'You are on this team' : 'Join this project'}</h2>
    <div className={`project-team project-team--${phase}`}><span className="project-team__phase">{teamPhaseLabels[phase]}</span>{Boolean(team?.memberCount) && <span className="project-team__count">{team!.memberCount} {team!.memberCount === 1 ? 'member' : 'members'}</span>}</div>
    {team?.startedAt && <p className="project-join__note">Started {formatPortalDate(team.startedAt)}</p>}
    {Boolean(team?.milestonesTotal) && <MilestoneMeter done={team!.milestonesDone} total={team!.milestonesTotal}/>}
    <div className="project-join__actions">
      {viewer === 'on-team' ? <Link className="button button--primary" href={`/member/teams/${p.id}`}>Open your workspace <ArrowRight size={17}/></Link>
        : viewer === 'applied' ? <><p className="project-join__note">Your application is waiting for a decision.</p><Link className="button button--secondary" href="/member/applications">View your application</Link></>
        : p.recruiting ? viewer === 'member'
          ? <Link className="button button--primary" href={applyPath}>Apply to join <ArrowRight size={17}/></Link>
          : <><Link className="button button--primary" href={`/member/login?next=${encodeURIComponent(applyPath)}`}>Sign in to apply <ArrowRight size={17}/></Link><p className="project-join__note">New to the club? <Link href="/get-involved">Join OEC first</Link>. No engineering experience needed.</p></>
        : <><p className="project-join__note">This team is not taking new members right now.</p>{viewer === 'visitor' && <Link className="text-link" href={'/get-involved?type=join_project&project='+encodeURIComponent(p.title)}>Ask the club about this project <ArrowUpRight size={16}/></Link>}</>}
      <SaveButton itemType="PROJECT" itemId={p.id} canSave={Boolean(member)} initialSaved={saved}/>
    </div>
    <dl>{p.difficulty&&<><dt>Difficulty</dt><dd>{p.difficulty}</dd></>}{p.lead_name&&<><dt>Lead</dt><dd>{p.lead_name}</dd></>}{p.next_step&&<><dt>Next step</dt><dd>{p.next_step}</dd></>}</dl>
    {p.github_url&&<a className="text-link" href={p.github_url} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={16}/></a>}{p.external_url&&<a className="text-link" href={p.external_url} target="_blank" rel="noreferrer">Project website <ArrowUpRight size={16}/></a>}
  </aside></div></section>
  {related.length > 0 && <section className="more-projects" aria-labelledby="more-projects"><div className="shell"><div className="more-projects__heading"><h2 id="more-projects">More projects</h2><Link className="text-link" href="/projects">All projects <ArrowUpRight size={16}/></Link></div><ProjectCards projects={related}/></div></section>}
  </>
}
