import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { describe, expect, it } from 'vitest'
import fontData from '../../public/concepts/helvetiker_bold.typeface.json'
import { createWorld } from '@/components/concepts/worlds'

const font = new FontLoader().parse(fontData)
const state = { time: 1, delta: 1 / 60, paused: true, view: 'home', pointer: new THREE.Vector2(), greeting: 0, progress: 0, active: false, mobile: false, aspect: 1.8 }

describe('Workbench preview geometry', () => {
  it('uses real extruded lettering on the home panel and hides it on reading pages', () => {
    const world = createWorld('workbench', new THREE.Scene(), new THREE.Texture(), font)
    world.update({ ...state, composition: { x: .25, y: .1, width: .45, height: .6, title: [{ x: -.25, y: .2, width: .3, height: .12 }] } })
    const title = world.root.getObjectByName('workbench-title')!
    expect(title).toBeDefined()
    const letter = title.children[0] as THREE.Mesh
    expect(letter.visible).toBe(true)
    expect(new THREE.Box3().setFromObject(letter).getSize(new THREE.Vector3()).z).toBeGreaterThan(.02)
    world.update({ ...state, view: 'projects' })
    expect(title.visible).toBe(false)
  })
  it('keeps the entire mechanism in front of the recessed bay backing', () => {
    const world = createWorld('workbench', new THREE.Scene(), new THREE.Texture(), font)
    world.update(state)
    const mechanism = world.root.getObjectByName('workbench-mechanism')!
    const backing = world.root.getObjectByName('workbench-bay-back')!
    expect(backing).toBeDefined()
    expect(new THREE.Box3().setFromObject(mechanism).min.z).toBeGreaterThan(new THREE.Box3().setFromObject(backing).max.z)
  })
  it.each([0.46, 0.7, 1.25, 1.8, 2.6])('keeps text within the physical cabinet at aspect %s', aspect => {
    const world = createWorld('workbench', new THREE.Scene(), new THREE.Texture(), font)
    expect(world.screen).toBeDefined()
    const screen = world.screen!
    const camera = new THREE.PerspectiveCamera(42, aspect, .1, 100)
    const mobile = aspect < .9, frame = world.frame(mobile, aspect)
    camera.position.set(...frame.position); camera.lookAt(...frame.target); camera.updateMatrixWorld()
    for (const view of ['home', 'projects', 'join', 'about', 'events']) {
      world.update({ ...state, aspect, mobile, view })
      screen.updateWorldMatrix(true, false)
      expect(screen.userData.visible).toBe(true)
      const w = screen.userData.width * screen.userData.cssScale / 2
      const h = screen.userData.height * screen.userData.cssScale / 2
      for (const [x, y] of [[-w, -h], [w, h]]) {
        const point = new THREE.Vector3(x, y, 0).applyMatrix4(screen.matrixWorld).project(camera)
        expect(Math.abs(point.x)).toBeLessThan(.94)
        expect(Math.abs(point.y)).toBeLessThan(.88)
      }
    }
  })
  it('moves the real carriage and only feeds the receipt after the final preview step', () => {
    const world = createWorld('workbench', new THREE.Scene(), new THREE.Texture(), font)
    const carriage = world.root.getObjectByName('workbench-carriage')!
    const receipt = world.root.getObjectByName('workbench-receipt')!
    expect(carriage).toBeDefined()
    world.update(state)
    const initial = carriage.position.clone()
    world.update({ ...state, time: 5 })
    expect(carriage.position.distanceTo(initial)).toBeGreaterThan(.1)
    world.update({ ...state, view: 'join', progress: 3 })
    expect(receipt.visible).toBe(false)
    world.update({ ...state, view: 'join', progress: 4 })
    expect(receipt.visible).toBe(true)
    world.update({ ...state, view: 'projects', progress: 4 })
    expect(receipt.visible).toBe(false)
  })
  it('opens the project tray without moving the reading surface and closes it on return', () => {
    const world = createWorld('workbench', new THREE.Scene(), new THREE.Texture(), font)
    world.update(state)
    const drawer = world.root.getObjectByName('workbench-project-tray')!
    expect(drawer).toBeDefined()
    const closed = drawer.position.z
    expect(drawer.visible).toBe(true)
    const screen = world.screen!.position.clone()
    world.update({ ...state, view: 'projects' })
    expect(drawer.position.z).toBeGreaterThan(closed + .3)
    expect(drawer.visible).toBe(true)
    expect(world.screen!.position.distanceTo(screen)).toBe(0)
    world.update(state)
    expect(drawer.position.z).toBeCloseTo(closed)
  })
  it('rotates the section selector to a distinct detent for each section', () => {
    const world = createWorld('workbench', new THREE.Scene(), new THREE.Texture(), font)
    const selector = world.root.getObjectByName('workbench-selector')!
    expect(selector).toBeDefined()
    const positions = ['home', 'projects', 'events', 'join'].map(view => {
      world.update({ ...state, view })
      return selector.rotation.z
    })
    expect(new Set(positions).size).toBe(4)
    world.update(state)
    expect(selector.rotation.z).toBeCloseTo(positions[0])
  })
  it('operates the signup lever only for signup and resets it on other pages', () => {
    const world = createWorld('workbench', new THREE.Scene(), new THREE.Texture(), font)
    world.update(state)
    const lever = world.root.getObjectByName('workbench-signup-lever')!
    expect(lever).toBeDefined()
    const idle = lever.rotation.x
    world.update({ ...state, view: 'projects' })
    expect(lever.rotation.x).toBeCloseTo(idle)
    world.update({ ...state, view: 'join' })
    expect(Math.abs(lever.rotation.x - idle)).toBeGreaterThan(.5)
    world.update({ ...state, view: 'about' })
    expect(lever.rotation.x).toBeCloseTo(idle)
  })
  it('feeds a receipt progressively without moving it after motion is paused', () => {
    const world = createWorld('workbench', new THREE.Scene(), new THREE.Texture(), font)
    world.update(state)
    const receipt = world.root.getObjectByName('workbench-receipt')!
    world.update({ ...state, paused: false, view: 'join', progress: 4 })
    const start = receipt.scale.y
    for (let i = 0; i < 30; i++) world.update({ ...state, paused: false, view: 'join', progress: 4 })
    expect(receipt.scale.y).toBeGreaterThan(start + .2)
    world.update({ ...state, view: 'join', progress: 4 })
    expect(receipt.scale.y).toBeCloseTo(1)
  })
})
