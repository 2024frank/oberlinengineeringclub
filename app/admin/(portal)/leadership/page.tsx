import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { listAdminContent } from '@/lib/cms/adminContent'
import { listMedia } from '@/lib/cms/media'
import { ContentManager } from '@/components/admin/content/ContentManager'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
export default async function LeadershipPage() {
  const admin = await requireAdmin()
  const [rows, mediaAssets, audience] = await Promise.all([
    listAdminContent('leaders'), listMedia(),
    createSupabaseAdminClient().from('member_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
  ])
  const canPublish = can(admin.role, 'PUBLISH_CONTENT', admin.scopes, 'leaders') || (admin.role === 'EDITOR' && admin.canPublish && admin.scopes.includes('leaders'))
  return <><div className="admin-panel"><Link className="text-link" href="https://oberlin32engineeringsociety.com/leadership">View posted positions</Link>{admin.role !== 'EDITOR' && <> · <Link className="text-link" href="/admin/officer-applications">Officer applications</Link></>}</div><ContentManager entityType="leaders" title="Leadership" rows={rows} canPublish={canPublish} mediaAssets={mediaAssets} notificationAudienceCount={audience.error ? undefined : audience.count ?? 0}/></>
}
