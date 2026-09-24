import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmailBatch } from '@/lib/email/client'
import { newProjectEmail } from '@/lib/email/templates'
import { memberSiteOrigin } from '@/lib/email/siteOrigin'

type Announcement = { announced: false } | { announced: true; projectId: string; slug: string; title: string; summary: string; recipients: { email: string; displayName: string }[] }

// Tells every active member about a project the first time it is published: a portal
// notice (added by the database function) and an email. Later republishes do nothing.
export async function announcePublishedProject(projectId: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.rpc('announce_published_project', { p_project_id: projectId })
  if (error) throw new Error(`PROJECT_ANNOUNCEMENT_FAILED:${error.message}`)
  const result = data as Announcement
  if (!result.announced) return { announced: false, emailsSent: 0 }
  const actionUrl = `${memberSiteOrigin()}/projects/${result.slug}`
  const emailsSent = await sendTransactionalEmailBatch({
    idempotencyKey: `project-announcement/${result.projectId}`,
    messages: result.recipients.filter(person => person.email).map(person => ({ to: person.email, message: newProjectEmail({ memberName: person.displayName, projectTitle: result.title, summary: result.summary, actionUrl }) })),
  })
  await admin.from('project_announcements').update({ emails_sent: emailsSent }).eq('project_id', result.projectId)
  return { announced: true, emailsSent }
}

export async function announcePublishedProjectSafely(projectId: string) {
  try { await announcePublishedProject(projectId) } catch { console.error('PROJECT_ANNOUNCEMENT_FAILED') }
}
