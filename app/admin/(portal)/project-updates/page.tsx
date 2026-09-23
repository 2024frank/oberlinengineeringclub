import { ContentManager } from '@/components/admin/content/ContentManager'
import { TeamUpdateReviewQueue } from '@/components/admin/projects/TeamUpdateReviewQueue'
import { listAdminContent } from '@/lib/cms/adminContent'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { listAdminTeamUpdateReviews } from '@/lib/projects/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'
async function projectChoices(){const s=await createSupabaseServerClient();const{data}=await s.from('projects').select('id,title').order('title');return data??[]}
export default async function Page(){const admin=await requireAdmin();const[rows,reviews,projects]=await Promise.all([listAdminContent('project_updates'),admin.role==='EDITOR'?Promise.resolve([]):listAdminTeamUpdateReviews(),projectChoices()]);const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'project_updates')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('project_updates'));return <>{admin.role!=='EDITOR'&&<TeamUpdateReviewQueue initial={reviews}/>}<ContentManager entityType="project_updates" title="Project Updates" rows={rows} canPublish={canPublish} projectChoices={projects}/></>}
