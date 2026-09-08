import type { Metadata } from 'next'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { MemberActivationForm } from '@/components/member/MemberActivationForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function MemberActivatePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.from('member_profiles').select('status,oberlin_email').eq('user_id', user.id).maybeSingle() : { data: null }
  const eligible = user?.email && profile?.oberlin_email.toLowerCase() === user.email.toLowerCase() && ['APPROVED', 'ACTIVE'].includes(profile.status)
  return <main className="admin-login"><section className="admin-login__intro"><BrandLogo variant="badge"/><p className="eyebrow">Member account</p><h1>Welcome to the club.</h1></section><section className="admin-login__card"><BrandLogo variant="badge" /><h2>Finish account setup</h2>{eligible ? <MemberActivationForm/> : <div role="alert"><p>Open the newest setup email to continue. Your current browser session is not linked to an approved member account.</p><Link href="/member/login">Member sign in</Link></div>}</section></main>
}
