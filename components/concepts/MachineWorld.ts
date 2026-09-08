import * as THREE from 'three'
import type { Font } from 'three/addons/loaders/FontLoader.js'
import { badge, box, cylinder, gear, lettering, material, rod, torus } from './geometry'
import type { World } from './worlds'

export const machineColors = { graphite: 0x101416, steel: 0xaeb8bd, white: 0xf1f4f2, red: 0xaf202c, cyan: 0x6fd5df, lime: 0xd1e65a }

export function createMachineWorld(scene: THREE.Scene, logo: THREE.Texture, font: Font): World {
  scene.background = new THREE.Color(machineColors.graphite)
  const root = new THREE.Group(), housing = new THREE.Group()
  scene.add(root); root.add(housing)
  const steel = material(machineColors.steel, .92, .29)
  const white = material(machineColors.white, .6, .32)
  const red = material(machineColors.red, .45, .32)
  const graphite = material(machineColors.graphite, .55, .4)
  const cyan = material(machineColors.cyan, .5, .3)
  const lime = material(machineColors.lime, .35, .3)
  const rubber = material(0x080c0e, .1, .72)

  box(housing, [15.8, 9.6, .24], graphite, [0, 0, -.7])
  for (const y of [-4.35, -2.8, 2.85, 4.15]) {
    box(housing, [16, .4, .3], red, [0, y, -.2], .035)
    for (const offset of [-.28, .28]) rod(housing, [-8, y + offset, .03], [8, y + offset, .03], .055, steel)
    for (let x = -7.4; x <= 7.4; x += 1.2) {
      box(housing, [.35, .66, .19], steel, [x, y, .13], .025)
      for (const offset of [-.22, .22]) cylinder(housing, .055, .12, rubber, [x, y + offset, .28]).rotation.x = Math.PI / 2
    }
  }
  for (let x = -4.2; x <= 4.2; x += .47) box(housing, [.17, 5.6, .13], steel, [x, 0, -.4], .01)

  const banks = [-1, 1].map(side => {
    const bank = new THREE.Group(); housing.add(bank)
    for (const x of [side * 4.9, side * 6.3]) {
      box(bank, [.26, 8.5, .3], steel, [x, 0, .12], .025)
      rod(bank, [x + .25, -4.2, .3], [x + .25, 4.2, .3], .085, steel)
      for (const y of [-3.4, -.5, 2.6]) box(bank, [.74, .44, .48], red, [x, y, .32])
    }
    return bank
  })
  const gears = [
    gear(banks[0], 1.5, cyan, [-6.3, -.9, .63], 32),
    gear(banks[0], 1.03, cyan, [-4.7, -2.6, .63], 24),
    gear(banks[1], 1.2, cyan, [6.2, 2.05, .63], 28),
    gear(banks[1], .72, steel, [5.2, .5, .63], 20)
  ]
  gears.forEach(g => g.traverse(o => { o.userData.action = 'activate' }))
  const title = new THREE.Group(); housing.add(title)
  lettering(title, 'OBERLIN', font, 7.6, red, [0, .88, .8], .19)
  lettering(title, 'ENGINEERING', font, 10.1, white, [0, -.54, .8], .2)
  lettering(title, 'CLUB', font, 4.4, white, [0, -2.07, .8], .2)
  const logoPlate = box(housing, [2.05, 2.05, .2], steel, [-6.1, 2.7, .82])
  badge(housing, logo, .86, [-6.1, 2.7, .94]); logoPlate.userData.action = 'about'

  const carriage = new THREE.Group(); housing.add(carriage); carriage.position.set(0, 3.35, .85)
  box(carriage, [1.8, 1.05, .35], graphite, [0, .1, 0])
  for (const x of [-.5, .5]) {
    cylinder(carriage, .23, 1.3, steel, [x, -.1, .3])
    cylinder(carriage, .28, .62, red, [x, .15, .3])
    cylinder(carriage, .3, .1, lime, [x, -.5, .3])
    cylinder(carriage, .09, .5, rubber, [x, -.76, .3])
    cylinder(carriage, .035, .3, steel, [x, -1.1, .3])
  }
  const lever = new THREE.Group(); lever.position.set(5.8, -3, 1); housing.add(lever)
  box(lever, [1.6, 1.8, .25], steel)
  const handle = box(lever, [1.23, 1.45, .55], red, [0, .04, .4], .1)
  lever.traverse(o => { o.userData.action = 'join' })
  const tray = new THREE.Group(); housing.add(tray)
  box(tray, [4.7, .6, .3], graphite, [-2.5, -3.65, .55])
  lettering(tray, 'PROJECTS', font, 3.4, white, [-2.5, -3.78, .75], .05)
  tray.traverse(o => { o.userData.action = 'projects' })
  for (const x of [-6.8, 6.8]) {
    rod(housing, [x, -4.2, .5], [x, -3.25, .5], .075, lime)
    torus(housing, .3, .075, lime, [x + (x < 0 ? .3 : -.3), -3.25, .5])
  }

  // The console is a real assembly; its DOM surface uses the same physical bounds.
  const console = new THREE.Group(); root.add(console); console.position.set(0, -12, 2.8)
  const chassis = box(console, [1, 1, .38], steel, [0, 0, -.1])
  const gasket = box(console, [1, 1, .08], rubber, [0, 0, .12])
  const face = box(console, [1, 1, .05], graphite, [0, 0, .2], .025)
  const screen = new THREE.Object3D(); console.add(screen); screen.position.z = .235
  screen.userData = { width: 900, height: 640, cssScale: .01, visible: false }
  const rails = [-1, 1].map(() => box(console, [.11, 1, .18], red, [0, 0, .2], .015))
  const bolts = Array.from({ length: 8 }, () => {
    const bolt = cylinder(console, .053, .055, rubber); bolt.rotation.x = Math.PI / 2; return bolt
  })
  const lamps = Array.from({ length: 3 }, () => {
    const surface = new THREE.MeshBasicMaterial({ color: machineColors.steel, toneMapped: false })
    return box(console, [.14, .045, .035], surface, [0, 0, .25], .008)
  })
  const slot = box(console, [1.7, .06, .08], rubber, [0, -3.7, .2], .01)
  const receipt = new THREE.Group(); receipt.name = 'request-receipt'; console.add(receipt)
  box(receipt, [1.55, 1.22, .022], white, [0, -.55, 0], .01)
  lettering(receipt, 'RECEIVED', font, 1.22, graphite, [0, -.37, .025], .002)
  for (let i = 0; i < 4; i++) box(receipt, [1.13 - i * .11, .023, .009], graphite, [0, -.62 - i * .095, .025], 0)
  receipt.visible = false
  let deployment = 0, expansion = 0, receiptAmount = 0

  return {
    root, screen,
    frame: () => ({ position: [0, 0, 15], target: [0, 0, 0] }),
    update(state) {
      const open = state.view !== 'home'
      const ease = state.paused ? 1 : 1 - Math.exp(-state.delta * 8)
      deployment = THREE.MathUtils.lerp(deployment, open ? 1 : 0, ease)
      expansion = THREE.MathUtils.lerp(expansion, state.active && !open ? 1 : 0, ease)
      receiptAmount = THREE.MathUtils.lerp(receiptAmount, state.view === 'join' && state.progress >= 4 ? 1 : 0, ease)
      const aspect = state.aspect ?? 1.8
      const homeScale = Math.min(1, 11.1 * aspect / 16.5)
      housing.scale.setScalar(THREE.MathUtils.lerp(homeScale, Math.max(homeScale, .8), deployment))
      housing.rotation.set(-.025 * (1 - deployment), (-.055 + state.pointer.x * .015) * (1 - deployment), .035 * (1 - deployment))
      housing.position.y = state.mobile && !open ? .6 : 0
      title.position.y = deployment * 7.5
      title.position.z = expansion * .65
      title.rotation.x = -deployment * .32
      title.visible = deployment < .98
      banks[0].position.x = -deployment * 1.05 - expansion * .7
      banks[1].position.x = deployment * 1.05 + expansion * .7
      tray.position.y = deployment * -1.5
      gears.forEach((g, index) => { g.rotation.z = state.time * (index % 2 ? -.18 : .12) * (state.active ? 2.4 : 1) })
      carriage.position.x = Math.sin(state.time * .35) * 2.4
      carriage.position.y = 3.35 + deployment + expansion * .5
      handle.rotation.x = state.view === 'join' ? -.5 : 0

      const height = (state.mobile ? 7 : 6.5) - receiptAmount * 1.4
      const width = Math.min(10.4, 9.18 * aspect * .84)
      const cssWidth = state.mobile ? 390 : 900
      const scale = width / cssWidth
      screen.userData.width = cssWidth; screen.userData.height = height / scale; screen.userData.cssScale = scale
      screen.userData.visible = open && deployment > .92
      console.position.y = THREE.MathUtils.lerp(-12, -.2 + receiptAmount * .65, deployment)
      console.visible = deployment > .01
      chassis.scale.set(width + .48, height + .63, 1)
      gasket.scale.set(width + .17, height + .17, 1)
      face.scale.set(width, height, 1)
      rails.forEach((rail, i) => { rail.position.x = (i ? 1 : -1) * (width / 2 + .18); rail.scale.y = height + .24 })
      bolts.forEach((bolt, i) => {
        bolt.position.set((i % 2 ? 1 : -1) * (width / 2 + .16), (Math.floor(i / 2) / 3 - .5) * (height + .38), .25)
      })
      lamps.forEach((lamp, i) => {
        lamp.position.set((i - 1) * .24, height / 2 + .23, .25)
        const color = state.view === 'join' ? state.progress > i ? machineColors.lime : machineColors.steel : state.view === 'events' ? machineColors.red : machineColors.cyan
        ;(lamp.material as THREE.MeshBasicMaterial).color.set(color)
      })
      slot.position.y = -height / 2 - .23
      receipt.position.set(0, slot.position.y - .04, .26)
      receipt.scale.y = receiptAmount
      receipt.visible = open && state.view === 'join' && state.progress >= 4 && deployment > .92
    }
  }
}
