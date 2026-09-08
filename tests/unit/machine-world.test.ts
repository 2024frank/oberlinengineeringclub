import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { describe, expect, it } from 'vitest'
import fontData from '../../public/concepts/helvetiker_bold.typeface.json'
import { createWorld } from '@/components/concepts/worlds'

const font = new FontLoader().parse(fontData)
const base = { time: 1, delta: 1 / 60, paused: true, view: 'home', pointer: new THREE.Vector2(), greeting: 0, progress: 0, active: false, mobile: false, aspect: 1.8 }

describe('Machine public experience', () => {
  it('deploys one usable screen for every public destination, even with motion paused', () => {
    const world = createWorld('machine', new THREE.Scene(), new THREE.Texture(), font)
    expect(world.screen).toBeDefined()
    const screen = world.screen!
    world.update(base)
    expect(screen.userData.visible).toBe(false)
    for (const view of ['projects', 'events', 'about', 'join', 'page', 'menu']) {
      world.update({ ...base, view })
      expect(world.screen).toBe(screen)
      expect(screen.userData.visible).toBe(true)
      expect(screen.userData.width).toBeGreaterThan(600)
    }
    world.update(base)
    expect(screen.userData.visible).toBe(false)
  })

  it.each([0.46, 0.62, 1.25, 1.8, 2.6])('keeps the deployed screen inside a viewport with aspect %s', aspect => {
    const world = createWorld('machine', new THREE.Scene(), new THREE.Texture(), font)
    expect(world.screen).toBeDefined()
    const mobile = aspect < 0.9
    world.update({ ...base, aspect, mobile, view: 'projects' })
    const frame = world.frame(mobile, aspect)
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100)
    camera.position.set(...frame.position); camera.lookAt(...frame.target); camera.updateMatrixWorld()
    const screen = world.screen!
    screen.updateWorldMatrix(true, false)
    const w = screen.userData.width * screen.userData.cssScale / 2
    const h = screen.userData.height * screen.userData.cssScale / 2
    for (const [x, y] of [[-w, -h], [w, h]]) {
      const corner = new THREE.Vector3(x, y, 0).applyMatrix4(screen.matrixWorld).project(camera)
      expect(Math.abs(corner.x)).toBeLessThan(0.94)
      expect(Math.abs(corner.y)).toBeLessThan(0.88)
    }
  })

  it('prints a receipt only for successful signup, not while entering details', () => {
    const world = createWorld('machine', new THREE.Scene(), new THREE.Texture(), font)
    const receipt = world.root.getObjectByName('request-receipt')
    expect(receipt).toBeDefined()
    for (const progress of [1, 2, 3]) {
      world.update({ ...base, view: 'join', progress })
      expect(receipt!.visible).toBe(false)
    }
    world.update({ ...base, view: 'join', progress: 4 })
    expect(receipt!.visible).toBe(true)
    world.update({ ...base, view: 'projects', progress: 4 })
    expect(receipt!.visible).toBe(false)
  })

  it('keeps the printed receipt visible below the console on a phone', () => {
    const world = createWorld('machine', new THREE.Scene(), new THREE.Texture(), font)
    world.update({ ...base, mobile: true, aspect: 0.53, view: 'join', progress: 4 })
    const camera = new THREE.PerspectiveCamera(42, 0.53, 0.1, 100)
    const frame = world.frame(true, 0.53)
    camera.position.set(...frame.position); camera.lookAt(...frame.target); camera.updateMatrixWorld()
    const receipt = world.root.getObjectByName('request-receipt')!
    receipt.updateWorldMatrix(true, true)
    const bounds = new THREE.Box3().setFromObject(receipt)
    expect(bounds.min.clone().project(camera).y).toBeGreaterThan(-0.88)
  })
})
