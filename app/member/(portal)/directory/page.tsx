import Link from 'next/link'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { filterDirectoryMembers, searchMemberDirectory } from '@/lib/members/directory'
import { listClubTeams, listProjectRosters } from '@/lib/teams/server'
import { DirectoryFilters } from '@/components/member/DirectoryFilters'
import { MemberCard } from '@/components/member/MemberCard'
import { TeamInviteControl } from '@/components/member/teams/TeamForms'

const one = (value: string | string[] | undefined) => typeof value === 'string' ? value : ''
const uniq = (values: (string | undefined)[]) => Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a,b) => a.localeCompare(b))
const uniqList = (values: (string[] | undefined)[]) => uniq(values.flatMap(value => value ?? []))
export default async function MemberDirectoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const current = await requireActiveMember()
  const params = await searchParams
  const query = one(params.q)
  const [safeMembers, teams, projects] = await Promise.all([searchMemberDirectory(query), listClubTeams(), listProjectRosters()])
  const filters = { discipline:one(params.discipline), skill:one(params.skill), major:one(params.major), classYear:one(params.year), interest:one(params.interest), availability:one(params.availability) }
  const members = filterDirectoryMembers(safeMembers,filters)
  const options = { disciplines:uniqList(safeMembers.map(m=>m.disciplines)), skills:uniqList(safeMembers.map(m=>m.skills)), majors:uniq(safeMembers.map(m=>m.major)), classYears:Array.from(new Set(safeMembers.map(m=>m.classYear).filter((v):v is number=>typeof v==='number'))).sort((a,b)=>a-b), interests:uniqList(safeMembers.map(m=>m.projectInterests)) }
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Find teammates</h1><p>Meet members, see their projects, and invite them to work with you.</p></div></div>
    <DirectoryFilters initial={{ q:query,...filters,year:filters.classYear }} options={options}/><p className="directory-result-count">{members.length} members shown</p>
    {members.length ? <div className="member-directory-grid">{members.map(member => {
      const joinedTeams = teams.filter(team => team.roster.some(person => person.userId === member.userId))
      const joinedProjects = projects.filter(project => project.members.some(person => person.userId === member.userId))
      const invitableTeams = teams.filter(team => team.myRole === 'LEAD' && !team.roster.some(person => person.userId === member.userId))
      return <MemberCard key={member.userId} member={member}><div className="team-membership-links">
        {joinedTeams.map(team => <Link key={team.id} href={`/member/teams/group/${team.id}`}>Team: {team.name}</Link>)}
        {joinedProjects.map(project => <span key={project.projectId}>Project: {project.title}</span>)}
        {!joinedTeams.length && !joinedProjects.length && <span className="portal-muted">No shared teams or projects listed.</span>}
      </div>{member.userId !== current.userId && member.displayName && <TeamInviteControl userId={member.userId} memberName={member.displayName} teams={invitableTeams}/>}</MemberCard>
    })}</div> : <div className="portal-empty"><div><h2>No matching members</h2><p>Try clearing one or more filters.</p></div></div>}
  </main>
}
