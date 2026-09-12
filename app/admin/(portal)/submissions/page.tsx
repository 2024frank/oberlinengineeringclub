import { SubmissionInbox } from '@/components/admin/submissions/SubmissionInbox'
import { listSubmissions } from '@/lib/cms/submissions'
import { listProjectLeadChoices } from '@/lib/projects/leadApproval'
export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const status = typeof params.status === 'string' && ['new', 'reviewed', 'approved', 'archived'].includes(params.status) ? params.status : ''
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Inbox</h1><p>Messages and requests from the club website.</p></div></div><SubmissionInbox initialRows={await listSubmissions()} initialStatus={status} projects={await listProjectLeadChoices()}/></main>
}
