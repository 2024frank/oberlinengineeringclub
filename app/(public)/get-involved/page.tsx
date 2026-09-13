import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { metadataForCmsPage } from '@/lib/seo/metadata'
import { getPublishedPageBySlug, getCmsRenderContext } from '@/lib/page-builder/publicPages'
import { GetInvolvedForm } from '@/components/forms/GetInvolvedForm'
import { PageRenderer } from '@/components/page-builder/PageRenderer'
export async function generateMetadata(): Promise<Metadata> { return metadataForCmsPage(await getPublishedPageBySlug('get-involved')) }
export default async function GetInvolvedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  if (params.type === 'leadership_interest') redirect('/leadership')
  const [page, context] = await Promise.all([getPublishedPageBySlug('get-involved'), getCmsRenderContext()])
  const extraSections = (page?.sections ?? []).filter(section => section.type !== 'hero')
  const type = typeof params.type === 'string' ? params.type : 'join_club'
  const project = typeof params.project === 'string' ? params.project : ''
  const focus = params.focus === 'capstone' ? 'capstone' : ''
  return <><GetInvolvedForm key={JSON.stringify([type, project, focus])} defaultType={type} defaultProject={project} defaultFocus={focus}/>{extraSections.length > 0 && <PageRenderer sections={extraSections} context={context}/>}</>
}
