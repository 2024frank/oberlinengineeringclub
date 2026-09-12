import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email/client'
import type { ProjectLeadApprovalInput } from './leadApprovalInput'

type ApprovalResult = {
  projectId: string; projectTitle: string; userId: string; memberName: string;
  memberEmail: string; role: 'LEAD'; alreadyApproved: boolean;
}

export async function approveProjectInterestAsLead(input: ProjectLeadApprovalInput) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('approve_project_interest_as_lead', {
    p_source: input.source,
    p_request_id: input.requestId,
    p_project_id: input.source === 'submission' ? input.projectId : null,
  })
  if (error) throw new Error(error.message)
  const result = data as ApprovalResult
  let emailSent = false
  if (!result.alreadyApproved) {
    const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://oberlin32engineeringsociety.com'
    try {
      emailSent = await sendTransactionalEmail({
        to: result.memberEmail, required: false,
        message: {
          subject: `You are a project lead: ${result.projectTitle}`,
          text: `Hi ${result.memberName},\n\nYour interest in ${result.projectTitle} has been approved, and you are now a project lead.\n\nSign in to your member account and open My teams. You can invite teammates, review applications, set milestones, and share project updates.\n\nOpen your project: ${base}/member/teams/${result.projectId}\n\nOberlin Engineering Club`,
        },
      })
    } catch {
      // The appointment and in-app notification are already committed.
      emailSent = false
    }
  }
  return { result, emailSent }
}

export async function listProjectLeadChoices() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('projects').select('id,title').eq('publication_state', 'published').order('title')
  if (error) throw new Error(error.message)
  return data ?? []
}
