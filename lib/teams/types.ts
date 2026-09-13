export type TeamPerson = { userId: string | null; displayName: string; role: 'LEAD' | 'MEMBER' }
export type TeamProject = { id: string; title: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; published: boolean; canReview: boolean; canAccess?: boolean }
export type ClubTeam = {
  id: string; name: string; description: string; recruiting: boolean
  myRole: 'LEAD' | 'MEMBER' | null
  myRequest: { direction: 'INVITE' | 'JOIN'; status: string } | null
  roster: TeamPerson[]
  projects: TeamProject[]
  proposals: { id: string; title: string; status: string; feedback: string | null }[]
  requests: { userId: string; displayName: string; direction: 'INVITE' | 'JOIN'; message: string; status: string }[]
}
export type ClubInvitation = { teamId: string; teamName: string; message: string; status: string; expiresAt: string }
export type ProjectRoster = { projectId: string; title: string; members: TeamPerson[] }
