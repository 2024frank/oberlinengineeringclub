import '@/components/projects/project-teams.css'
import { ContentManager } from '@/components/admin/content/ContentManager'
import { listAdminContent } from '@/lib/cms/adminContent'
import { listMedia } from '@/lib/cms/media'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Active roster size per project, so the delete confirmation can warn when people are on the team.
// A failed lookup only hides the warning; the delete action itself still works.
async function teamSizes(){const sizes:Record<string,number>={};try{const {data}=await createSupabaseAdminClient().from('project_memberships').select('project_id').eq('status','ACTIVE');for(const row of data??[])sizes[row.project_id]=(sizes[row.project_id]??0)+1}catch{}return sizes}
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const admin=await requireAdmin();const [rows,mediaAssets,sizes]=await Promise.all([listAdminContent('projects'),listMedia(),teamSizes()]);const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'projects')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('projects'));return <ContentManager entityType="projects" title="Projects" rows={rows} mediaAssets={mediaAssets} canPublish={canPublish} canDelete={admin.role!=='EDITOR'} teamSizes={sizes} initialCreate={params.new==='1'} initialEditId={typeof params.edit==='string'?params.edit:undefined}/>}
