import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { getDashboardSummary, getRecentActivity } from '@/lib/cms/dashboard'
import { requireAdmin } from '@/lib/auth/requireRole'

export default async function AdminDashboardPage() {
  const admin = await requireAdmin()
  const [summary, activity] = await Promise.all([getDashboardSummary(admin.role), getRecentActivity(5)])
  return <AdminDashboard admin={admin} summary={summary} activity={activity}/>
}
