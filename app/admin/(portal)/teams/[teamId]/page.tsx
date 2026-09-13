import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/requireRole'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { listClubTeams } from '@/lib/teams/server'
import { TeamWorkspace } from '@/components/member/teams/TeamWorkspace'
export default async function AdminTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required"/>
  const { teamId } = await params
  if (!z.string().uuid().safeParse(teamId).success) notFound()
  const [team] = await listClubTeams(teamId)
  if (!team) notFound()
  return <main className="admin-panel"><TeamWorkspace team={team} admin/></main>
}
