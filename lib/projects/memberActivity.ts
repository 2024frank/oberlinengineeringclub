import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { MilestoneStatus, ProjectOverview, TeamPostKind } from './workspace'

export type DashboardMilestone = { id: string; title: string; status: MilestoneStatus; dueDate: string | null; projectId: string; projectTitle: string }
export type DashboardPost = { id: string; projectId: string; projectTitle: string; kind: TeamPostKind; body: string; authorName: string; authorUserId: string | null; officer: boolean; createdAt: string }
export type MemberWork = { mine: DashboardMilestone[]; unclaimed: DashboardMilestone[]; posts: DashboardPost[] }

// Everything here is read with the member's own session, so RLS limits it to
// projects they are on. Project titles come from the overview RPC because
// draft projects are not publicly readable.
export async function getMemberWork(userId: string, projects: ProjectOverview[]): Promise<MemberWork> {
  const ids = projects.map(project => project.projectId)
  if (!ids.length) return { mine: [], unclaimed: [], posts: [] }
  const titles = new Map(projects.map(project => [project.projectId, project.title]))
  const s = await createSupabaseServerClient()
  const [mine, unclaimed, posts] = await Promise.all([
    s.from('project_milestones').select('id,title,status,due_date,project_id').eq('assignee_user_id', userId).neq('status', 'DONE').in('project_id', ids).order('due_date', { ascending: true, nullsFirst: false }).limit(12),
    s.from('project_milestones').select('id,title,status,due_date,project_id').is('assignee_user_id', null).neq('status', 'DONE').in('project_id', ids).order('due_date', { ascending: true, nullsFirst: false }).limit(6),
    s.from('project_team_posts').select('id,project_id,kind,body,author_name,author_user_id,officer,created_at').in('project_id', ids).order('created_at', { ascending: false }).limit(6),
  ])
  const milestone = (row: { id: string; title: string; status: MilestoneStatus; due_date: string | null; project_id: string }): DashboardMilestone =>
    ({ id: row.id, title: row.title, status: row.status, dueDate: row.due_date, projectId: row.project_id, projectTitle: titles.get(row.project_id) ?? 'Project' })
  return {
    mine: (mine.data ?? []).map(milestone),
    unclaimed: (unclaimed.data ?? []).map(milestone),
    posts: (posts.data ?? []).map(row => ({ id: row.id, projectId: row.project_id, projectTitle: titles.get(row.project_id) ?? 'Project', kind: row.kind, body: row.body, authorName: row.author_name, authorUserId: row.author_user_id, officer: row.officer, createdAt: row.created_at })),
  }
}
