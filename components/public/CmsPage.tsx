import { PageRenderer } from '@/components/page-builder/PageRenderer'
import { getCmsRenderContext } from '@/lib/page-builder/publicPages'
import type { PageSnapshot } from '@/lib/page-builder/types'
export async function CmsPage({page,mode='public'}:{page:PageSnapshot;mode?:'public'|'preview'}){
  const sections = [...page.sections]
  // Move the original homepage introduction below discovery; custom arrangements stay intact.
  if (page.slug === 'home' && sections[0]?.stableKey === 'hero' && sections[1]?.stableKey === 'disciplines' && sections[2]?.stableKey === 'projects') {
    [sections[1], sections[2]] = [sections[2], sections[1]]
  }
  const hasVisibleHero=sections.some(section=>section.type==='hero'&&section.isVisible)
  return <>{!hasVisibleHero&&<h1 className="sr-only">{page.title}</h1>}<PageRenderer sections={sections} context={{...await getCmsRenderContext(),pageSlug:page.slug}} mode={mode}/></>
}
