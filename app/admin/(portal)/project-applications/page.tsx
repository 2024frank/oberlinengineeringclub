import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listAdminProjectApplications } from '@/lib/projects/applications'
import { ProjectApplicationQueue } from '@/components/admin/projects/ProjectApplicationQueue'
export default async function ProjectApplicationsAdminPage(){const admin=await requireAdmin();if(admin.role==='EDITOR')return <AccessDenied title="Admin access required"/>;const rows=await listAdminProjectApplications();return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Project applications</h1></div></div><ProjectApplicationQueue initialRows={rows}/></main>}
