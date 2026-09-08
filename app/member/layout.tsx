import type { Metadata } from 'next'
import '@/app/portal.css'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function MemberRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
