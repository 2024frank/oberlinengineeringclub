import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { requireAdmin } from '@/lib/auth/requireRole'
import { MemberApplicationQueue } from '@/components/admin/members/MemberApplicationQueue'
import { listMembershipRequests } from '@/lib/auth/memberServer'

export default async function MembersAdminPage() {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required"/>
  return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">Community</p><h1>Members</h1></div></div><MemberApplicationQueue initial={await listMembershipRequests('ALL')} initialFilter="all"/></main>
}
