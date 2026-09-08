import type { AdminRole } from '@/lib/permissions/types'

export type PortalNavItem = { label: string; href: string; icon: string }
export type PortalNavGroup = { label: string; items: PortalNavItem[]; collapsed?: boolean }
const item = (label: string, href: string, icon: string): PortalNavItem => ({ label, href, icon })

export function adminPortalGroups(role: AdminRole): PortalNavGroup[] {
  return [
    { label: 'Start here', items: [item('Overview', '/admin', 'home'), ...(role === 'EDITOR' ? [] : [item('Inbox', '/admin/submissions', 'inbox'), item('Member requests', '/admin/member-applications', 'requests'), item('Project ideas', '/admin/project-proposals', 'idea'), item('Project applications', '/admin/project-applications', 'requests')])] },
    { label: 'Club', items: [item('Projects', '/admin/projects', 'projects'), item('Events', '/admin/events', 'calendar'), ...(role === 'EDITOR' ? [] : [item('Members', '/admin/members', 'people')]), item('Website pages', '/admin/pages', 'pages')] },
    { label: 'More publishing tools', collapsed: true, items: [item('Project updates', '/admin/project-updates', 'updates'), item('News', '/admin/news', 'pages'), item('Opportunities', '/admin/opportunities', 'briefcase'), item('Leadership', '/admin/leadership', 'people'), item('Resources', '/admin/resources', 'book'), item('Documents', '/admin/documents', 'pages'), item('Sponsors', '/admin/sponsors', 'people'), item('Media library', '/admin/media', 'image')] },
    { label: 'Settings', collapsed: true, items: [...(role === 'SUPER_ADMIN' ? [item('Site settings', '/admin/settings', 'settings'), item('Navigation', '/admin/navigation', 'navigation'), item('Redirects', '/admin/redirects', 'navigation'), item('Staff access', '/admin/users', 'shield')] : []), item('Activity history', '/admin/audit', 'history')] },
  ]
}

export const memberPortalGroups: PortalNavGroup[] = [
  { label: 'Workspace', items: [item('Dashboard', '/member', 'home'), item('Find a project', '/member/projects', 'search'), item('My teams', '/member/teams', 'projects')] },
  { label: 'My activity', items: [item('My applications', '/member/applications', 'requests'), item('Invitations', '/member/invitations', 'inbox'), item('My ideas', '/member/proposals', 'idea'), item('Notifications', '/member/notifications', 'bell')] },
  { label: 'Community', items: [item('Find teammates', '/member/directory', 'people'), item('Saved items', '/member/saved', 'bookmark'), item('My profile', '/member/profile', 'profile')] },
]

export function portalPath(pathname: string, portal: 'admin' | 'member') {
  if (portal === 'admin' && !/^\/admin(?:\/|$)/.test(pathname)) return pathname === '/' ? '/admin' : `/admin${pathname}`
  return pathname
}

export function isPortalItemActive(pathname: string, href: string) {
  return pathname === href || (!['/admin', '/member'].includes(href) && pathname.startsWith(`${href}/`))
}
