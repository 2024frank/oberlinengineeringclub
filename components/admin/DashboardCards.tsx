import Link from 'next/link'
import { ArrowRight, CheckCircle2, ClipboardList, Inbox, Lightbulb, FileCheck } from 'lucide-react'
import type { DashboardSummary } from '@/lib/cms/dashboard'
import type { AdminRole } from '@/lib/permissions/types'

const reviews = [
  { key: 'newSubmissions', label: 'New messages', action: 'Open inbox', href: '/admin/submissions?status=new', icon: Inbox },
  { key: 'pendingMemberApprovals', label: 'Member requests', action: 'Review members', href: '/admin/member-applications', icon: ClipboardList },
  { key: 'pendingProjectProposals', label: 'Project ideas', action: 'Review ideas', href: '/admin/project-proposals', icon: Lightbulb },
  { key: 'pendingProjectUpdateReviews', label: 'Team updates', action: 'Review updates', href: '/admin/project-updates', icon: FileCheck },
] as const

export function DashboardCards({ summary, role = 'SUPER_ADMIN' }: { summary: DashboardSummary; role?: AdminRole }) {
  if (role === 'EDITOR') return null
  const pending = reviews.filter(item => summary[item.key] > 0).sort((a, b) => summary[b.key] - summary[a.key])
  return <section className="portal-section" aria-labelledby="admin-attention"><div className="portal-section-heading"><h2 id="admin-attention">Needs your attention</h2><span className="portal-muted">{pending.reduce((total, item) => total + summary[item.key], 0)} waiting</span></div>
    {pending.length ? <div className="portal-review-list">{pending.map(item => { const Icon = item.icon; return <Link key={item.key} href={item.href}><span className="portal-review-icon"><Icon size={22}/></span><span><strong>{item.label}</strong><small>{item.action}</small></span><span className="portal-count">{summary[item.key]}</span><ArrowRight size={20}/></Link> })}</div> : <div className="portal-empty"><CheckCircle2 size={25}/><div><h3>You&apos;re all caught up</h3><p>No new messages, member requests, project ideas, or team updates waiting.</p></div></div>}
  </section>
}
