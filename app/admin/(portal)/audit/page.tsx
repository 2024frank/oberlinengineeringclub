import { requireAdmin } from '@/lib/auth/requireRole'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function text(value: unknown) { return typeof value === 'string' ? value.trim() : '' }

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const p = await searchParams
  const actor = text(p.actor), action = text(p.action), entity = text(p.entity), from = text(p.from), to = text(p.to)
  const s = await createSupabaseServerClient()
  // Officers search by name or email; actor_id is a UUID column, so resolve people first.
  let actorIds: string[] | null = null
  if (actor) {
    if (uuidPattern.test(actor)) actorIds = [actor]
    else {
      const [staff, members] = await Promise.all([
        s.from('admin_profiles').select('user_id').ilike('display_name', `%${actor}%`).limit(50),
        s.from('member_profiles').select('user_id').or(`display_name.ilike.%${actor.replaceAll(/[,()]/g, ' ')}%,oberlin_email.ilike.%${actor.replaceAll(/[,()]/g, ' ')}%`).limit(50),
      ])
      actorIds = Array.from(new Set([...(staff.data ?? []), ...(members.data ?? [])].map(row => row.user_id)))
    }
  }
  let rows: Array<{ id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string; before_snapshot: unknown; after_snapshot: unknown; created_at: string }> = []
  if (!actorIds || actorIds.length) {
    let q = s.from('audit_log').select('id,actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot,created_at').order('created_at', { ascending: false }).limit(100)
    if (actorIds) q = q.in('actor_id', actorIds)
    if (action) q = q.ilike('action', `%${action}%`)
    if (entity) q = q.eq('entity_type', entity)
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) q = q.gte('created_at', `${from}T00:00:00Z`)
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) q = q.lte('created_at', `${to}T23:59:59Z`)
    const { data, error } = await q
    if (error) throw new Error(`AUDIT_LOAD_FAILED:${error.message}`)
    rows = data ?? []
  }
  const ids = Array.from(new Set(rows.map(row => row.actor_id).filter((id): id is string => Boolean(id))))
  const [staffNames, memberNames] = ids.length ? await Promise.all([
    s.from('admin_profiles').select('user_id,display_name').in('user_id', ids),
    s.from('member_profiles').select('user_id,display_name').in('user_id', ids),
  ]) : [{ data: [] }, { data: [] }]
  const names = new Map<string, string>([...(memberNames.data ?? []), ...(staffNames.data ?? [])].filter(row => row.display_name).map(row => [row.user_id, row.display_name]))
  return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">System</p><h1>Audit History</h1><p>Review who changed public content, project teams and administrative settings.</p></div></div>
    <form className="audit-filters"><label>Person<input name="actor" defaultValue={actor} placeholder="Name, email or ID"/></label><label>Action<input name="action" defaultValue={action}/></label><label>Entity type<input name="entity" defaultValue={entity}/></label><label>From<input type="date" name="from" defaultValue={from}/></label><label>To<input type="date" name="to" defaultValue={to}/></label><button type="submit">Filter</button></form>
    {!rows.length && <p className="portal-muted">{actor && actorIds?.length === 0 ? `No one matches “${actor}”.` : 'No activity matches these filters.'}</p>}
    <div className="audit-list">{rows.map(row => <details key={row.id}><summary><strong>{row.action}</strong><span>{row.entity_type} · {row.entity_id}</span><span>{row.actor_id ? `by ${names.get(row.actor_id) ?? 'unknown account'}` : 'by the system'}</span><time>{new Date(row.created_at).toLocaleString('en-US', { timeZone: 'America/New_York' })}</time></summary><div className="audit-diff"><section><h3>Before</h3><pre>{JSON.stringify(row.before_snapshot ?? {}, null, 2)}</pre></section><section><h3>After</h3><pre>{JSON.stringify(row.after_snapshot ?? {}, null, 2)}</pre></section></div></details>)}</div>
  </main>
}
