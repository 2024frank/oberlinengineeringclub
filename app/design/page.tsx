import type { Metadata } from 'next'
import DesignPreview from './preview'

export const metadata: Metadata = {
  title: 'OEC | Design preview',
  robots: { index: false, follow: false }
}

export default function DesignPage() {
  return <DesignPreview />
}
