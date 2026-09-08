import { ContentManager } from '@/components/admin/content/ContentManager'
import { listAdminContent } from '@/lib/cms/adminContent'
import { listMedia } from '@/lib/cms/media'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const admin=await requireAdmin();const [rows,mediaAssets]=await Promise.all([listAdminContent('events'),listMedia()]);const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'events')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('events'));return <ContentManager entityType="events" title="Events" rows={rows} mediaAssets={mediaAssets} canPublish={canPublish} initialCreate={params.new==='1'}/>}
