import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { publicCopy } from '@/lib/content/publicCopy'

type Hero = { eyebrow: string; title: string; description: string }

// Directory routes are code pages, but their hero copy is editable in the officer portal
// like any other page. This reads the published hero for the slug and falls back to the
// props, so the route still renders if the page row or Supabase is missing.
async function publishedHero(slug: string): Promise<Partial<Hero> | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const supabase = await createSupabaseServerClient()
  const { data: page } = await supabase.from('pages').select('published_version_id').eq('slug', slug).maybeSingle()
  if (!page?.published_version_id) return null
  const { data: version } = await supabase.from('page_versions').select('sections_snapshot').eq('id', page.published_version_id).maybeSingle()
  const sections = (version?.sections_snapshot ?? []) as Array<Record<string, string>>
  const hero = sections.find(section => section?.type === 'hero')
  if (!hero) return null

  return { eyebrow: hero.eyebrow, title: hero.headline, description: hero.body }
}

export async function DirectoryHero({ slug, eyebrow, title, description }: { slug?: string; eyebrow: string; title: string; description: string; imageSlug?: string }) {
  const published = slug ? await publishedHero(slug) : null
  const copy = {
    eyebrow: published?.eyebrow || eyebrow,
    title: publicCopy(published?.title || title),
    description: publicCopy(published?.description || description)
  }

  return (
    <section className="directory-hero">
      <div className="shell">
        {copy.eyebrow.toLowerCase() !== copy.title.toLowerCase() && <p className="eyebrow">{copy.eyebrow}</p>}
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
    </section>
  )
}
