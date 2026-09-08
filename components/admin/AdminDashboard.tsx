import Link from 'next/link'
import { ArrowRight, CalendarPlus, FilePenLine, FolderPlus } from 'lucide-react'
import type { CurrentAdmin } from '@/lib/auth/session'
import type { DashboardSummary } from '@/lib/cms/dashboard'
import { DashboardCards } from './DashboardCards'
import { ActivityFeed } from './ActivityFeed'

export function AdminDashboard({ admin, summary, activity }: { admin: CurrentAdmin; summary: DashboardSummary; activity: { id: string; action: string; entity_type: string; entity_id: string; created_at: string }[] }) {
  const actions = [
    { title: 'Add a project', detail: 'Start a project draft.', href: '/admin/projects?new=1', scope: 'projects', icon: FolderPlus },
    { title: 'Post an event', detail: 'Set the details for a club event.', href: '/admin/events?new=1', scope: 'events', icon: CalendarPlus },
    { title: 'Update the website', detail: 'Edit an existing page.', href: '/admin/pages', scope: 'pages', icon: FilePenLine },
  ].filter(action => admin.role !== 'EDITOR' || admin.scopes.includes(action.scope))
  return <main className="admin-panel portal-home"><div className="admin-page-heading"><div><p className="eyebrow">Club administration</p><h1>What needs doing?</h1></div></div>
    <DashboardCards summary={summary} role={admin.role}/>
    <section className="portal-section" aria-labelledby="admin-actions"><div className="portal-section-heading"><h2 id="admin-actions">Common tasks</h2></div><div className="portal-task-grid">{actions.map(action => { const Icon = action.icon; return <Link className="portal-task" key={action.href} href={action.href}><Icon size={24}/><h3>{action.title}</h3><p>{action.detail}</p><span>Get started <ArrowRight size={18}/></span></Link> })}</div></section>
    <section className="portal-section" aria-label="Club status"><div className="portal-summary-links"><Link href="/admin/projects"><strong>{summary.activeProjects}</strong><span>Active projects</span><ArrowRight size={17}/></Link><Link href="/admin/events"><strong>{summary.upcomingEvents}</strong><span>Upcoming events</span><ArrowRight size={17}/></Link><Link href="/admin/opportunities"><strong>{summary.closingOpportunities}</strong><span>Deadlines in the next 14 days</span><ArrowRight size={17}/></Link></div></section>
    <ActivityFeed items={activity}/>
  </main>
}
