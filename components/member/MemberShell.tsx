'use client'
import { PortalShell } from '@/components/portal/PortalShell'
import { memberPortalGroups } from '@/lib/navigation/portal'
import { MemberSidebar } from './MemberSidebar'

export function MemberShell({ member, unreadNotifications = 0, children }: { member: { displayName: string; email: string }; unreadNotifications?: number; children: React.ReactNode }) {
  return <PortalShell portal="member" groups={memberPortalGroups} unreadNotifications={unreadNotifications} sidebar={<MemberSidebar displayName={member.displayName}/>}>{children}</PortalShell>
}
