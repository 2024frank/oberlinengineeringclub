import type { Metadata } from 'next'
import type { PageSnapshot } from '@/lib/page-builder/types'
import { getCmsRenderContext, getPublicSiteSettings } from '@/lib/page-builder/publicPages'

const retiredSharePath = '/storage/v1/object/public/oec-media/site/home-hero-workbench.jpg'

export async function metadataForCmsPage(page: PageSnapshot): Promise<Metadata> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oberlin32engineeringsociety.com').replace(/\/$/, '')
  const path = page.slug === 'home' ? '' : `/${page.slug}`
  const settings = await getPublicSiteSettings()
  const rawTitle = page.seoTitle || page.title
  const patterned = settings.seo.titlePattern.includes('%s') ? settings.seo.titlePattern.replace('%s', rawTitle) : rawTitle
  const title = page.slug === 'home' ? rawTitle : patterned
  const description = page.seoDescription || undefined
  let image: { url: string; alt: string; width?: number; height?: number } = {
    url: `${base}/brand/workbench/share-20260906.jpg`,
    alt: 'Oberlin Engineering Club interactive workbench',
    width: 1200,
    height: 660,
  }
  const mediaId = page.ogMediaId ?? settings.seo.defaultOgMediaId
  if (mediaId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const context = await getCmsRenderContext()
    const media = context.media?.[mediaId]
    if (media?.url) {
      try {
        const url = new URL(media.url, `${base}/`)
        // Retire the old stock photo without overriding other CMS sharing images.
        if (['http:', 'https:'].includes(url.protocol) && url.pathname !== retiredSharePath) {
          image = { url: url.href, alt: media.alt || 'Oberlin Engineering Club' }
        }
      } catch {
        // A malformed media URL must not break the public page.
      }
    }
  }
  return {
    // The CMS pattern already includes the club name; do not apply the root template again.
    title: { absolute: title },
    description,
    alternates: { canonical: `${base}${path}` },
    openGraph: { title, description, url: `${base}${path}`, siteName: 'Oberlin Engineering Club', type: 'website', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}
