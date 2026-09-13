import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth/session'
import { officerReviewSchema, officerError } from '@/lib/leadership/input'
import { performOfficerAction } from '@/lib/leadership/server'
export async function POST(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role === 'EDITOR') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const parsed = officerReviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Check the review details and try again.' }, { status: 400 })
  try { await performOfficerAction(parsed.data); return NextResponse.json({ ok: true }) }
  catch (error) { return NextResponse.json({ error: officerError(error) }, { status: 400 }) }
}
