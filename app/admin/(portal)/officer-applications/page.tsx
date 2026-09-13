import { requireAdmin } from '@/lib/auth/requireRole'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { listOfficerApplications, listOfficerEmailStatus } from '@/lib/leadership/server'
import { OfficerApplicationQueue } from '@/components/leadership/OfficerApplicationQueue'
import { OfficerEmailDelivery } from '@/components/admin/leadership/EmailStatus'
import '@/components/leadership/leadership.css'

export default async function OfficerApplicationsPage() {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required" body="Officer application reviews are available to Admins and Super Admins."/>
  const [applications, emailStatus] = await Promise.all([listOfficerApplications(), listOfficerEmailStatus()])
  return <main className="admin-panel leadership-page">
    <div className="admin-page-heading"><h1>Officer applications</h1></div>
    <OfficerApplicationQueue applications={applications}/>
    <OfficerEmailDelivery rows={emailStatus}/>
  </main>
}
