'use client'
import { PortalShell } from '@/components/portal/PortalShell'
import { memberPortalGroups } from '@/lib/navigation/portal'
import { MemberSidebar } from './MemberSidebar'

export function MemberShell({ member, children }: { member: { displayName: string; email: string }; children: React.ReactNode }) {
  return <PortalShell portal="member" groups={memberPortalGroups} sidebar={<MemberSidebar displayName={member.displayName}/>}>{children}</PortalShell>
}
