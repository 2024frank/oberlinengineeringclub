import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listAdminProjectApplications } from '@/lib/projects/applications'
import { ProjectApplicationQueue } from '@/components/admin/projects/ProjectApplicationQueue'
export default async function ProjectApplicationsAdminPage() {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required" body="Only Admins and Super Admins can review project applications."/>
  const rows = await listAdminProjectApplications()
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Project applications</h1><p>Members asking to join a project. <strong>Add to team</strong> makes them a regular team member; choose <strong>Make lead</strong> only for the person who will run the project.</p></div></div><ProjectApplicationQueue initialRows={rows}/></main>
}
