import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { MemberApplicationQueue } from '@/components/admin/members/MemberApplicationQueue'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listMembershipRequests } from '@/lib/auth/memberServer'

export default async function MemberApplicationsPage() {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required" />
  return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">Community</p><h1>Member requests</h1></div></div><MemberApplicationQueue initial={await listMembershipRequests('ALL')}/></main>
}
