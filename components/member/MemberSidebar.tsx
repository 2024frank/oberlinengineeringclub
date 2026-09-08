'use client'
import { PortalSidebar } from '@/components/portal/PortalSidebar'
import { memberPortalGroups } from '@/lib/navigation/portal'

export function MemberSidebar({ displayName, onNavigate }: { displayName?: string; onNavigate?: () => void }) {
  return <PortalSidebar portal="member" groups={memberPortalGroups} displayName={displayName} onNavigate={onNavigate}/>
}
