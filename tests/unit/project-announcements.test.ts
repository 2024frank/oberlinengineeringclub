import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { newProjectEmail } from '@/lib/email/templates'

const sql = readFileSync('database/migrations/028_project_announcements.sql', 'utf8')
const read = (path: string) => readFileSync(path, 'utf8')

describe('new project announcements', () => {
  it('announces each published project once, to active members, in the portal', () => {
    expect(sql).toContain("publication_state='published'")
    expect(sql).toContain('on conflict do nothing;\n  if not found then return')
    expect(sql).toMatch(/insert into public\.member_notifications[\s\S]*'NEW_PROJECT'[\s\S]*from public\.member_profiles where status='ACTIVE'/)
  })

  it('treats projects already on the website as announced', () => {
    expect(sql).toMatch(/insert into public\.project_announcements\(project_id\)\nselect id from public\.projects where publication_state='published'/)
  })

  it('keeps the function server-only', () => {
    expect(sql).toContain('revoke all on function public.announce_published_project(uuid) from public,anon,authenticated;')
    expect(sql).toContain('grant execute on function public.announce_published_project(uuid) to service_role;')
  })

  it('announces from manual and scheduled publishing', () => {
    expect(read('app/api/publish/content/route.ts')).toContain("if(entityType==='projects')after(()=>announcePublishedProjectSafely(entityId))")
    expect(read('app/api/cron/publish/route.ts')).toContain("if(row.target_type==='projects') after(()=>announcePublishedProjectSafely(row.target_id))")
  })

  it('emails the project name, summary, and link', () => {
    const message = newProjectEmail({ memberName: 'Ada', projectTitle: 'Solar Cart', summary: 'Build a solar charging cart.', actionUrl: 'https://example.org/projects/solar-cart' })
    expect(message.subject).toBe('New OEC project: Solar Cart')
    expect(message.text).toContain('Hi Ada,')
    expect(message.text).toContain('Build a solar charging cart.')
    expect(message.text).toContain('https://example.org/projects/solar-cart')
  })
})
