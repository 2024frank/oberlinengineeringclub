'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Bell, Bookmark, BookOpen, Briefcase, CalendarDays, ChevronDown, ClipboardList, FileText, FolderKanban, History, House, Image, Inbox, Lightbulb, Navigation, Search, Settings, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { isPortalItemActive, portalPath, type PortalNavGroup } from '@/lib/navigation/portal'

const icons = { home: House, inbox: Inbox, requests: ClipboardList, idea: Lightbulb, projects: FolderKanban, calendar: CalendarDays, people: Users, pages: FileText, updates: History, briefcase: Briefcase, book: BookOpen, image: Image, settings: Settings, navigation: Navigation, shield: ShieldCheck, history: History, search: Search, bell: Bell, bookmark: Bookmark, profile: UserRound }

export function PortalSidebar({ portal, groups, displayName, roleLabel, onNavigate }: { portal: 'admin' | 'member'; groups: PortalNavGroup[]; displayName?: string; roleLabel?: string; onNavigate?: () => void }) {
  const pathname = portalPath(usePathname(), portal)
  const [query, setQuery] = useState('')
  const visible = groups.map(group => ({ ...group, items: group.items.filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase())) })).filter(group => group.items.length)
  const links = (group: PortalNavGroup) => group.items.map(item => {
    const Icon = icons[item.icon as keyof typeof icons] ?? FileText
    return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isPortalItemActive(pathname, item.href) ? 'page' : undefined}><Icon size={18} aria-hidden="true"/><span>{item.label}</span></Link>
  })
  return <aside className="portal-sidebar" aria-label={`${portal === 'admin' ? 'Officer' : 'Member'} portal navigation`}>
    <Link href={`/${portal}`} className="portal-brand" onClick={onNavigate}><BrandLogo variant="badge"/><span><strong>Oberlin Engineering</strong><small>{portal === 'admin' ? 'Club administration' : 'Member workspace'}</small></span></Link>
    <div className="portal-nav-search"><Search size={17} aria-hidden="true"/><input type="search" aria-label={`Find a ${portal} page`} placeholder="Find a page" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" aria-label="Clear navigation search" title="Clear navigation search" onClick={() => setQuery('')}><X size={16}/></button>}</div>
    <nav>{visible.map(group => group.collapsed ? <details key={`${group.label}-${query ? 'search' : pathname}`} open={Boolean(query) || group.items.some(item => isPortalItemActive(pathname, item.href)) || undefined}><summary>{group.label}<ChevronDown size={15} aria-hidden="true"/></summary><div>{links(group)}</div></details> : <section key={group.label} aria-label={group.label}><p>{group.label}</p>{links(group)}</section>)}</nav>
    {!visible.length && <p className="portal-nav-empty" role="status">No matching pages.</p>}
    <div className="portal-sidebar-footer"><span className="portal-avatar" aria-hidden="true">{displayName?.trim().slice(0, 1).toUpperCase() || 'O'}</span><div><strong>{displayName}</strong><small>{roleLabel ?? 'Club member'}</small></div><a href={process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oberlin32engineeringsociety.com/'} title="Club website" aria-label="Club website" onClick={onNavigate}><ArrowUpRight size={18}/></a></div>
  </aside>
}
