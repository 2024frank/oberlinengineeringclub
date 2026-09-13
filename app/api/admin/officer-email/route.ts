import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentAdmin } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendQueuedOfficerEmails } from '@/lib/leadership/emailServer'
export const maxDuration = 60
export async function POST(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role === 'EDITOR') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const parsed = z.object({ positionId: z.string().uuid() }).strict().safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid opening.' }, { status: 400 })
  const s = await createSupabaseServerClient()
  const { error } = await s.rpc('retry_officer_emails', { p_position_id: parsed.data.positionId })
  if (error) return NextResponse.json({ error: 'Could not queue the retry.' }, { status: 400 })
  after(async () => { try { await sendQueuedOfficerEmails() } catch { console.error('OFFICER_EMAIL_WORKER_FAILED') } })
  return NextResponse.json({ ok: true })
}
