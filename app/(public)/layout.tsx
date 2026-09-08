import { OrganizationSchema } from '@/components/public/OrganizationSchema'
import { getPublicSiteSettings } from '@/lib/page-builder/publicPages'
import { listPublishedProjects } from '@/lib/content/projects'
import { listPublishedEvents } from '@/lib/content/events'
import { WorkbenchSite } from '@/components/concepts/workbench/WorkbenchSite'
import '../concepts/concepts.css'
import '../concepts/workbench/workbench.css'
import '../concepts/workbench/workbench-live.css'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [publishedProjects, publishedEvents, settings] = await Promise.all([listPublishedProjects(), listPublishedEvents({ when: 'all' }), getPublicSiteSettings()])
  const projects = publishedProjects.map(p => ({ id: p.id, slug: p.slug, title: p.title, summary: p.summary ?? '', status: p.status ?? '', disciplines: p.disciplines ?? [], recruiting: Boolean(p.recruiting), skills: 'skills' in p && Array.isArray(p.skills) ? p.skills : [] }))
  const events = publishedEvents.map(e => ({ id: e.id, slug: e.slug, title: e.title, start: e.start_at, location: e.location ?? '', eventType: e.event_type ?? '' }))
  return <><OrganizationSchema siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oberlin32engineeringsociety.com'} contactEmail={settings.contact.email} socialLinks={settings.social}/><WorkbenchSite projects={projects} events={events}>{children}</WorkbenchSite></>
}
