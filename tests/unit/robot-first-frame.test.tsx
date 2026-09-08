import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { RobotFirstFrame } from '@/components/concepts/RobotFirstFrame'

it('includes a high-priority, art-directed robot frame in server HTML without waiting for WebGL', () => {
  const html = renderToStaticMarkup(<RobotFirstFrame/>)
  expect(html).toContain('first-frame-mobile.webp')
  expect(html).toContain('first-frame-desktop.webp')
  expect(html).toContain('fetchPriority="high"')
  expect(html).toContain('loading="eager"')
  expect(html).not.toContain('<canvas')
})
