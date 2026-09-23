import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { addProjectTeamLink, claimProjectMilestone, deleteProjectMilestone, deleteProjectTeamPost, getProjectWorkspace, leaveProject, postProjectTeamUpdate, removeProjectMember, removeProjectTeamLink, resubmitTeamProjectUpdate, setProjectMilestoneStatus, updateProjectMilestone } from '@/lib/projects/workspace'
import { publicWorkspaceError, workspaceActionSchema, type WorkspaceAction } from '@/lib/projects/workspaceInput'

type Params = { params: Promise<{ projectId: string }> }
const projectIdSchema = z.string().uuid()

export async function GET(_request: Request, { params }: Params) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  try { return NextResponse.json({ workspace: await getProjectWorkspace((await params).projectId) }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'WORKSPACE_LOAD_FAILED' }, { status: 403 }) }
}

function run(projectId: string, input: WorkspaceAction) {
  switch (input.action) {
    case 'milestone': return updateProjectMilestone(projectId, input)
    case 'milestone-status': return setProjectMilestoneStatus(input.milestoneId, input.status)
    case 'milestone-claim': return claimProjectMilestone(input.milestoneId, input.claim)
    case 'milestone-delete': return deleteProjectMilestone(input.milestoneId)
    case 'remove-member': return removeProjectMember(projectId, input.userId)
    case 'post': return postProjectTeamUpdate(projectId, input.kind, input.body)
    case 'post-delete': return deleteProjectTeamPost(input.postId)
    case 'link-add': return addProjectTeamLink(projectId, input.label, input.url)
    case 'link-remove': return removeProjectTeamLink(input.linkId)
    case 'leave': return leaveProject(projectId)
    case 'resubmit-update': return resubmitTeamProjectUpdate(input.updateId, input)
  }
}

export async function PUT(request: Request, { params }: Params) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const projectId = (await params).projectId
  const parsed = workspaceActionSchema.safeParse(await request.json().catch(() => null))
  if (!projectIdSchema.safeParse(projectId).success || !parsed.success) {
    const linkIssue = parsed.error?.issues.some(issue => issue.message === 'TEAM_LINK_INVALID' || issue.path.includes('url'))
    return NextResponse.json({ error: linkIssue ? 'TEAM_LINK_INVALID' : 'WORKSPACE_ACTION_INVALID' }, { status: 400 })
  }
  try { return NextResponse.json({ ok: true, result: (await run(projectId, parsed.data)) ?? null }) }
  catch (error) { return NextResponse.json({ error: publicWorkspaceError(error instanceof Error ? error.message : '') }, { status: 400 }) }
}
