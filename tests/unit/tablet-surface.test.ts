import * as THREE from 'three'
import { afterEach, describe, expect, it } from 'vitest'
import { createTabletSurface } from '@/components/concepts/TabletSurface'

afterEach(() => { document.body.replaceChildren() })

function setup() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const screen = new THREE.Object3D()
  Object.assign(screen.userData, { width: 200, height: 400, cssScale: .01, visible: true })
  const camera = new THREE.PerspectiveCamera(90, .5, .1, 100)
  camera.position.z = 10
  camera.updateMatrixWorld()
  const tablet = createTabletSurface(host, screen)
  tablet.resize(400, 800)
  return { host, screen, camera, tablet }
}

describe('Robot tablet scroll surface', () => {
  it('places touch content outside the perspective tree at the projected screen bounds', () => {
    const { tablet, camera } = setup()
    tablet.render(camera, true)
    expect(tablet.element.parentElement).toHaveClass('robot-dom-world')
    expect(tablet.element.style.transform).toBe('none')
    expect(tablet.element.style.left).toBe('160px')
    expect(tablet.element.style.top).toBe('320px')
    expect(tablet.element.style.width).toBe('80px')
    expect(tablet.element.style.height).toBe('160px')
    expect(tablet.element.inert).toBe(false)
  })

  it('keeps the same content and scroll position across frames and responsive mode changes', () => {
    const { tablet, camera } = setup()
    const content = document.createElement('div'), input = document.createElement('input')
    content.appendChild(input)
    tablet.element.appendChild(content)
    input.value = 'My project'
    content.scrollTop = 235
    tablet.render(camera, false)
    const desktopTransform = tablet.element.style.transform
    expect(desktopTransform).toContain('matrix3d')
    tablet.render(camera, true)
    tablet.render(camera, true)
    expect(tablet.element.style.transform).toBe('none')
    tablet.render(camera, false)
    expect(tablet.element.style.transform).toBe(desktopTransform)
    expect(tablet.element.style.left).toBe('')
    expect(tablet.element.style.width).toBe('200px')
    expect(tablet.element.firstChild).toBe(content)
    expect(content.scrollTop).toBe(235)
    expect(input.value).toBe('My project')
  })

  it('repositions native content when the viewport changes', () => {
    const { tablet, camera } = setup()
    tablet.render(camera, true)
    camera.aspect = 1
    camera.updateProjectionMatrix()
    tablet.resize(800, 800)
    tablet.render(camera, true)
    expect(tablet.element.style.left).toBe('360px')
    expect(tablet.element.style.width).toBe('80px')
  })

  it('does not intercept gestures while the tablet is hidden and removes its layer on disposal', () => {
    const { tablet, screen, camera, host } = setup()
    screen.userData.visible = false
    tablet.render(camera, true)
    expect(tablet.element.inert).toBe(true)
    expect(tablet.element.style.pointerEvents).toBe('none')
    expect(tablet.element.style.opacity).toBe('0')
    screen.userData.visible = true
    tablet.render(camera, true)
    expect(tablet.element.style.pointerEvents).toBe('auto')
    tablet.dispose()
    expect(host.childElementCount).toBe(0)
  })
})
