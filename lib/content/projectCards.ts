import type { PageRenderContext } from '@/lib/page-builder/types'
import type { ProjectCardData } from '@/components/public/ProjectCards'
export function projectCards(records:Array<Record<string,unknown>>,media:PageRenderContext['media']={}):ProjectCardData[] {
  return records.map(p=>({id:String(p.id),slug:String(p.slug),title:String(p.title??''),summary:String(p.summary??''),status:String(p.status??'proposed'),difficulty:String(p.difficulty??''),disciplines:Array.isArray(p.disciplines)?p.disciplines.map(String):[],image:media[String(p.cover_media_id)]}))
}
