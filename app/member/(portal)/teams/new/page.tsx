import { requireActiveMember } from '@/lib/auth/memberSession'
import { TeamCreateForm } from '@/components/member/teams/TeamForms'
export default async function NewTeamPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireActiveMember()
  const params = await searchParams
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Create a team</h1><p>You can choose a project after your team is together.</p></div></div><TeamCreateForm inviteUserId={typeof params.invite === 'string' ? params.invite : undefined}/></main>
}
