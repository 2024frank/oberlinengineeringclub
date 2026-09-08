'use client'

import { useCallback, type ComponentProps, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { WorkbenchPreview } from './WorkbenchPreview'

type Props = Pick<ComponentProps<typeof WorkbenchPreview>, 'projects' | 'events'> & { children: ReactNode }

export function WorkbenchSite({ projects, events, children }: Props) {
  const pathname = usePathname(), router = useRouter(), search = useSearchParams().toString()
  const navigate = useCallback((href: string) => router.push(href), [router])
  const replace = useCallback((href: string) => window.history.replaceState(null, '', href), [])
  return <WorkbenchPreview projects={projects} events={events} route={{ pathname, search, navigate, replace }}>{children}</WorkbenchPreview>
}
