import { ContentManager } from '@/components/admin/content/ContentManager'
import { listAdminContent } from '@/lib/cms/adminContent'
import { listMedia } from '@/lib/cms/media'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
export default async function Page(){const admin=await requireAdmin();const [rows,mediaAssets]=await Promise.all([listAdminContent('news_posts'),listMedia()]);const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'news_posts')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('news_posts'));return <ContentManager entityType="news_posts" title="News" rows={rows} mediaAssets={mediaAssets} canPublish={canPublish}/>}
