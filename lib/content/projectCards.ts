import type { PageRenderContext } from '@/lib/page-builder/types'
import type { ProjectCardData } from '@/components/public/ProjectCards'
import { teamPhase } from './teamStatsModel'
export function projectCards(records:Array<Record<string,unknown>>,media:PageRenderContext['media']={},stats:PageRenderContext['teamStats']={}):ProjectCardData[] {
  return records.map(p=>{const team=stats[String(p.id)];return{id:String(p.id),slug:String(p.slug),title:String(p.title??''),summary:String(p.summary??''),status:String(p.status??'proposed'),difficulty:String(p.difficulty??''),disciplines:Array.isArray(p.disciplines)?p.disciplines.map(String):[],image:media[String(p.cover_media_id)],phase:teamPhase(team,{status:String(p.status??'proposed'),recruiting:Boolean(p.recruiting)}),memberCount:team?.memberCount??0,milestonesDone:team?.milestonesDone??0,milestonesTotal:team?.milestonesTotal??0}})
}
