import { requireActiveMember } from '@/lib/auth/memberSession'
import { listOfficerApplications, listOfficerPositions } from '@/lib/leadership/server'
import { MemberOfficerOpenings } from '@/components/leadership/MemberOfficerOpenings'
import '@/components/leadership/leadership.css'

export default async function MemberLeadershipPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireActiveMember()
  const params = await searchParams
  const [positions, applications] = await Promise.all([listOfficerPositions(), listOfficerApplications()])
  return <main className="admin-panel leadership-page">
    <div className="admin-page-heading"><h1>Officer openings</h1></div>
    <MemberOfficerOpenings positions={positions} applications={applications.filter(application => application.userId === member.userId)} positionId={typeof params.position === 'string' ? params.position : undefined}/>
  </main>
}
