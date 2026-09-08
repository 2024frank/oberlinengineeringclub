import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { previewMedia, publicPreviewEnabled } from './previewProjects'
import type { PageRenderContext } from '@/lib/page-builder/types'
export async function publicMedia(ids:string[]):Promise<NonNullable<PageRenderContext['media']>> {
  if(publicPreviewEnabled())return previewMedia
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!ids.length)return {}
  const s=await createSupabaseServerClient()
  const {data}=await s.from('media').select('id,public_url,alt_text').in('id',[...new Set(ids)])
  return Object.fromEntries((data??[]).map(m=>[m.id,{url:m.public_url,alt:m.alt_text??''}]))
}
