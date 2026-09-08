'use client'
import type { CurrentAdmin } from '@/lib/auth/session'
import { PortalShell } from '@/components/portal/PortalShell'
import { adminPortalGroups } from '@/lib/navigation/portal'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({ admin, children }: { admin: CurrentAdmin; children: React.ReactNode }) {
  return <PortalShell portal="admin" groups={adminPortalGroups(admin.role)} sidebar={<AdminSidebar admin={admin}/>}>{children}</PortalShell>
}
