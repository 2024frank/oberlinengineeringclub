import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { officerMemberActionSchema, officerError } from '@/lib/leadership/input'
import { performOfficerAction } from '@/lib/leadership/server'
export async function POST(request: Request) {
  if (!await getCurrentMember()) return NextResponse.json({ error: 'Sign in with an active member account.' }, { status: 401 })
  const parsed = officerMemberActionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Check your statement and experience, then try again.' }, { status: 400 })
  try { await performOfficerAction(parsed.data); return NextResponse.json({ ok: true }) }
  catch (error) { return NextResponse.json({ error: officerError(error) }, { status: 400 }) }
}
