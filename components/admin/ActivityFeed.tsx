import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
const names: Record<string, string> = { page: 'Website page', pages: 'Website page', projects: 'Project', project_updates: 'Project update', events: 'Event', leaders: 'Leadership', resources: 'Resource', news_posts: 'News post', opportunities: 'Opportunity' }
export function ActivityFeed({ items }: { items: { id: string; action: string; entity_type: string; entity_id: string; created_at: string }[] }) {
  return <section className="admin-card"><div className="portal-section-heading"><h2>Recent activity</h2><Link href="/admin/audit">Full history <ArrowRight size={16}/></Link></div>{items.length ? <ol className="activity-feed">{items.map(item => <li key={item.id}><span>{item.action.replaceAll('_', ' ').toLowerCase()}</span><div><strong>{names[item.entity_type] ?? item.entity_type.replaceAll('_', ' ')}</strong></div><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time></li>)}</ol> : <p className="portal-muted">No recent activity.</p>}</section>
}
