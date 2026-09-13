import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireActiveMember } from '@/lib/auth/memberSession'
import { listClubTeams } from '@/lib/teams/server'
import { TeamBrowser } from '@/components/member/teams/TeamBrowser'
export default async function FindTeamsPage() {
  await requireActiveMember()
  return <main className="admin-panel"><div className="admin-page-heading"><div><h1>Find a team</h1><p>See who is working together and where you can help.</p></div><Link className="button button--primary" href="/member/teams/new"><Plus size={18}/>Create team</Link></div><TeamBrowser teams={await listClubTeams()}/></main>
}
