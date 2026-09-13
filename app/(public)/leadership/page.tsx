import type { Metadata } from 'next'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listOfficerPositions } from '@/lib/leadership/server'
import { OfficerPositions } from '@/components/leadership/OfficerPositions'
import '@/components/leadership/leadership.css'

export const metadata: Metadata = { title: 'Open officer positions' }

export default async function LeadershipPage() {
  const [positions, member] = await Promise.all([listOfficerPositions(), getCurrentMember()])
  return <section className="leadership-page shell">
    <header className="leadership-heading"><p className="eyebrow">Oberlin Engineering Club</p><h1>Open officer positions</h1></header>
    <OfficerPositions positions={positions} signedIn={Boolean(member)}/>
  </section>
}
