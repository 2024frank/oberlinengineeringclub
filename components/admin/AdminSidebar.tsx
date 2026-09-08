'use client'
import type { CurrentAdmin } from '@/lib/auth/session'
import { adminPortalGroups } from '@/lib/navigation/portal'
import { PortalSidebar } from '@/components/portal/PortalSidebar'

export function AdminSidebar({ admin, onNavigate }: { admin: CurrentAdmin; onNavigate?: () => void }) {
  return <PortalSidebar portal="admin" groups={adminPortalGroups(admin.role)} displayName={admin.displayName} roleLabel={admin.role === 'SUPER_ADMIN' ? 'Super admin' : admin.role === 'ADMIN' ? 'Administrator' : 'Editor'} onNavigate={onNavigate}/>
}
