import { SubmissionInbox } from '@/components/admin/submissions/SubmissionInbox'
import { listSubmissions } from '@/lib/cms/submissions'
import { listProjectLeadChoices } from '@/lib/projects/leadApproval'
import { requireAdmin } from '@/lib/auth/requireRole'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required" body="Only Admins and Super Admins can review requests and appoint project leads."/>
  const params = await searchParams
  const status = typeof params.status === 'string' && ['new', 'reviewed', 'approved', 'archived'].includes(params.status) ? params.status : ''
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Inbox</h1><p>Messages and requests from the club website.</p></div></div><SubmissionInbox initialRows={await listSubmissions()} initialStatus={status} projects={await listProjectLeadChoices()}/></main>
}
