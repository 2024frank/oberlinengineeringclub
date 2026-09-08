import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PageSnapshot } from '@/lib/page-builder/types'
import { metadataForCmsPage } from '@/lib/seo/metadata'

const cms = vi.hoisted(() => ({
  settings: { seo: { titlePattern: '%s - OEC', defaultOgMediaId: null as string | null } },
  media: {} as Record<string, { url: string; alt: string }>,
}))
vi.mock('@/lib/page-builder/publicPages', () => ({
  getPublicSiteSettings: async () => cms.settings,
  getCmsRenderContext: async () => ({ media: cms.media }),
}))

const base = 'https://oberlin32engineeringsociety.com'
const shareImage = `${base}/brand/workbench/share-20260906.jpg`
const retiredImage = 'https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/site/home-hero-workbench.jpg'
const home: PageSnapshot = { pageId: '00000000-0000-4000-8000-000000000101', slug: 'home', title: 'Home', seoTitle: 'Oberlin Engineering Club', seoDescription: 'Build projects together.', ogMediaId: null, sections: [] }

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', `${base}/`)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://database.example.com')
  cms.settings.seo.defaultOgMediaId = null
  cms.media = {}
})
afterEach(() => vi.unstubAllEnvs())

describe('public sharing metadata', () => {
  it('uses the workbench with dimensions for Open Graph and Twitter by default', async () => {
    const metadata = await metadataForCmsPage(home)
    expect(metadata).toMatchObject({
      title: { absolute: home.seoTitle },
      alternates: { canonical: base },
      openGraph: { images: [{ url: shareImage, width: 1200, height: 660, alt: expect.stringContaining('workbench') }] },
      twitter: { card: 'summary_large_image', images: [{ url: shareImage }] },
    })
  })

  it.each(['site', 'page'])('replaces the retired photo selected at %s level', async source => {
    cms.media.old = { url: retiredImage, alt: 'Old stock photo' }
    cms.settings.seo.defaultOgMediaId = source === 'site' ? 'old' : null
    const metadata = await metadataForCmsPage({ ...home, ogMediaId: source === 'page' ? 'old' : null })
    expect(metadata.openGraph).toMatchObject({ images: [{ url: shareImage }] })
    expect(metadata.twitter).toMatchObject({ images: [{ url: shareImage }] })
  })

  it('preserves a custom page image ahead of the site default', async () => {
    cms.settings.seo.defaultOgMediaId = 'old'
    cms.media.old = { url: retiredImage, alt: 'Old stock photo' }
    cms.media.custom = { url: 'https://cdn.example.com/project.jpg', alt: 'A club project' }
    const metadata = await metadataForCmsPage({ ...home, slug: 'projects', seoTitle: 'Projects', ogMediaId: 'custom' })
    expect(metadata).toMatchObject({
      title: { absolute: 'Projects - OEC' },
      alternates: { canonical: `${base}/projects` },
      openGraph: { images: [{ url: cms.media.custom.url, alt: 'A club project' }] },
      twitter: { images: [{ url: cms.media.custom.url }] },
    })
  })

  it('preserves a custom site-wide sharing image', async () => {
    cms.settings.seo.defaultOgMediaId = 'custom'
    cms.media.custom = { url: 'https://cdn.example.com/event.jpg', alt: 'Club event' }
    expect((await metadataForCmsPage(home)).openGraph).toMatchObject({ images: [{ url: cms.media.custom.url }] })
  })

  it('uses the fallback when a selected media record is missing', async () => {
    expect((await metadataForCmsPage({ ...home, ogMediaId: 'missing' })).openGraph).toMatchObject({ images: [{ url: shareImage }] })
  })

  it('uses the real public domain when environment configuration is absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined)
    expect(await metadataForCmsPage(home)).toMatchObject({ alternates: { canonical: base }, openGraph: { images: [{ url: shareImage }] } })
  })
})
