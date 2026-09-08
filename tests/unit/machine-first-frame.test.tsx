import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { MachineFirstFrame } from '@/components/concepts/MachineFirstFrame'

it('renders an eager machine picture before client-side 3D initialization', () => {
  const html = renderToStaticMarkup(<MachineFirstFrame/>)
  const root = document.createElement('div')
  root.innerHTML = html
  expect(root.querySelector('source')).toHaveAttribute('srcset', '/brand/machine/first-frame-mobile.webp')
  expect(root.querySelector('img')).toHaveAttribute('src', '/brand/machine/first-frame-desktop.webp')
  expect(root.querySelector('img')).toHaveAttribute('loading', 'eager')
  expect(root.querySelector('img')).toHaveAttribute('fetchpriority', 'high')
})
