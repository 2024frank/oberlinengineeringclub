import Link from 'next/link'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { MemberLoginPanel } from '@/components/member/MemberLoginPanel'
export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  return <main className="member-login-page"><header className="member-login-heading"><Link href="/" aria-label="Oberlin Engineering Club home"><BrandLogo variant="badge"/></Link><h1>Member portal</h1><p>Project teams, applications, and saved resources.</p><Link className="text-link" href="/">Back to the club website</Link></header><MemberLoginPanel authError={typeof params.error === 'string' ? params.error : undefined} status={typeof params.status === 'string' ? params.status : undefined}/></main>
}
