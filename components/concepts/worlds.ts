import * as THREE from 'three'
import type { Font } from 'three/addons/loaders/FontLoader.js'
import { badge, box, cylinder, gear, lettering, material, mesh, rod, type V3 } from './geometry'
import { createRobot } from './robotModel'
import { createRobotPresentation } from './RobotPresentation'
import { createMachineWorld } from './MachineWorld'
import { createWorkbenchWorld } from './workbench/WorkbenchWorld'

export type Direction = 'robot' | 'machine' | 'hall' | 'workbench'
export type SurfaceBounds = { x: number; y: number; width: number; height: number }
export type WorldState = { time: number; delta: number; paused: boolean; view: string; pointer: THREE.Vector2; greeting: number; progress: number; active: boolean; mobile: boolean; aspect?: number; composition?: SurfaceBounds & { controls?: SurfaceBounds; lever?: SurfaceBounds; selector?: SurfaceBounds; drawer?: SurfaceBounds; navigation?: SurfaceBounds[]; title?: SurfaceBounds[] } }
export type World = { root: THREE.Group; screen?: THREE.Object3D; update: (state: WorldState) => void; frame: (mobile: boolean, aspect?: number) => { position: V3; target: V3 } }

function robotWorld(scene: THREE.Scene, logo: THREE.Texture): World {
  scene.background = new THREE.Color(0x101216)
  const root = new THREE.Group(); scene.add(root)
  const robot = createRobot(root, logo)
  robot.root.position.set(1.05, -1.05, 0); robot.root.scale.setScalar(1.57)
  const presentation = createRobotPresentation(root, logo)
  const robotTarget = new THREE.Vector3()
  const red = material(0x9b0410, .25, .38), lime = material(0xaabc0b, .12, .38), violet = material(0x442766, .18, .5)
  const scarletRibbon = mesh(root, new THREE.TorusGeometry(4.3, .95, 20, 96, Math.PI * 1.5), red, [4.4, 2.2, -3]); scarletRibbon.scale.z = .3; scarletRibbon.rotation.set(.1, -.5, -.7)
  const limeRibbon = mesh(root, new THREE.TorusGeometry(3.4, .75, 20, 96, Math.PI * 1.4), lime, [-.8, -3.5, -4]); limeRibbon.scale.z = .25; limeRibbon.rotation.set(.4, .2, .2)
  const purplePanel = box(root, [6, 10, .2], violet, [7, -1, -4], .3); purplePanel.rotation.z = -.4
  const floor = box(root, [35, .1, 22], new THREE.MeshBasicMaterial({ color: 0x101216, toneMapped: false }), [0, -4.8, 0])
  floor.receiveShadow = true
  return { root, screen: presentation.screen, frame: mobile => mobile ? { position: [0, 1.8, 10.3], target: [0, 1.15, 0] } : { position: [0, 1.35, 9.2], target: [0, .55, 0] }, update(state) {
    const open = state.view !== 'home'
    robotTarget.set(state.mobile ? open ? -.65 : -.25 : open ? -2.15 : 1.05, state.mobile ? open ? 2.87 : -.8 : open ? -1.3 : -1.05, state.mobile && open ? -.3 : 0)
    const smoothing = state.paused ? 1 : 1 - Math.exp(-state.delta * 3)
    robot.root.position.lerp(robotTarget, smoothing)
    robot.root.scale.setScalar(THREE.MathUtils.lerp(robot.root.scale.x, state.mobile ? open ? .45 : .98 : open ? 1.45 : 1.57, smoothing))
    robot.root.rotation.y = -.12 + state.pointer.x * .025
    const pose = presentation.update({ open, joining: state.view === 'join', mobile: state.mobile, delta: state.delta, paused: state.paused, robotPosition: robot.root.position, progress: state.progress })
    robot.update(state.time, state.pointer, state.greeting, pose.deployment, state.view === 'join')
    scarletRibbon.rotation.z = -.7 + Math.sin(state.time * .1) * .03
    limeRibbon.rotation.z = .2 + state.progress * .14
  } }
}


function hallWorld(scene: THREE.Scene, logo: THREE.Texture, font: Font): World {
  scene.background = new THREE.Color(0xeeeae3)
  scene.fog = new THREE.Fog(0xeeeae3, 28, 58)
  const root = new THREE.Group(); scene.add(root)
  const white = material(0xf3f0e9, .1, .62), silver = material(0xaeb4b4, .85, .27), red = material(0xb30c19, .25, .27), cyan = material(0x10acc8, .35, .28), yellow = material(0xf2bd28, .35, .3)
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x00b4d4, metalness: .12, roughness: .08, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false })
  const goldGlass = glass.clone(); goldGlass.color.set(0xf4ad19); goldGlass.opacity = .5
  box(root, [50, .2, 50], material(0xcfcfcb, .3, .28), [0, -.12, 0])
  box(root, [35, 15, .4], white, [0, 7, -13])
  for (const z of [-12, -7, -2, 3, 8]) {
    for (const x of z < -3 ? [-10, -4, 4, 10] : [-10, 10]) box(root, [.38, 12, .45], white, [x, 6, z])
    box(root, [24, .4, .48], white, [0, 10, z])
    for (const x of [-8, -6, -2, 0, 2, 6, 8]) box(root, [.13, .28, 24], white, [x, 10.3, 0])
  }
  for (const x of [-8, -4, 0, 4, 8]) {
    box(root, [.06, 8, .06], silver, [x, 4, -12.72])
    box(root, [3.9, 8, .03], glass, [x + 2, 4, -12.7], 0)
  }
  box(root, [8.6, 8.8, .09], glass, [-4.7, 4.6, -1], 0)
  box(root, [7.5, 9.3, .09], goldGlass, [-2.7, 4.8, -2.2], 0)
  const sign = new THREE.Group(); sign.position.set(-3.1, 0, -.6); root.add(sign)
  lettering(sign, 'Oberlin', font, 5.8, white, [-.8, 7.1, 0], .16)
  lettering(sign, 'Engineering', font, 8.3, white, [.1, 5.55, 0], .16)
  lettering(sign, 'Club', font, 3.4, white, [-1.8, 4.1, 0], .16)
  const portal = new THREE.Group(); portal.position.set(5.2, 0, -1.8); root.add(portal)
  box(portal, [1, 8.8, 2.5], white, [-2.55, 4.4, 0], 0)
  box(portal, [1, 8.8, 2.5], white, [2.55, 4.4, 0], 0)
  box(portal, [6.1, 3.4, 2.5], white, [0, 7.1, 0], 0)
  badge(portal, logo, 1.15, [0, 7.05, 1.265])
  for (const x of [-2.02, 2.02]) box(portal, [.16, 5.5, 4.5], red, [x, 2.75, -.7], 0)
  box(portal, [4.2, .17, 4.5], red, [0, 5.4, -.7], 0)
  box(portal, [4.2, .06, 4.5], red, [0, .04, -.7], 0)
  const door = box(portal, [3.9, 5.2, .18], red, [0, 2.7, -2.8], .02)
  lettering(portal, 'JOIN', font, 2.1, white, [0, 3.7, 1.05]); lettering(portal, 'THE', font, 1.8, white, [0, 2.6, 1.05]); lettering(portal, 'CLUB', font, 2.4, white, [0, 1.45, 1.05])
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd9c6, toneMapped: false })
  box(portal, [3.95, .04, .04], glow, [0, .16, 1.6], 0)
  portal.traverse(o => { o.userData.action = 'join' })
  const display = new THREE.Group(); display.position.set(-4.3, 0, 2); root.add(display)
  box(display, [6.7, .28, 3], white, [0, .2, 0])
  for (const x of [-3.1, 3.1]) for (const z of [-1.2, 1.2]) {
    box(display, [.12, 3.5, .12], cyan, [x, 2, z], .015)
    rod(display, [x, .5, z], [x, 3.75, z], .04, silver)
  }
  box(display, [6.4, .12, 2.6], cyan, [0, 3.8, 0], .02)
  for (let i = 0; i < 7; i++) {
    const x = -2.5 + i * .8
    rod(display, [x, 3.7, 0], [x, 2.7 - i % 3 * .3, 0], .008, silver)
    gear(display, .19 + i % 3 * .06, silver, [x, 2.5 - i % 3 * .3, 0], 16)
  }
  const arm = new THREE.Group(); display.add(arm)
  cylinder(arm, .6, .3, silver, [0, .54, 0]); cylinder(arm, .38, .8, white, [0, 1, 0])
  rod(arm, [0, 1.25, 0], [-.9, 2.05, 0], .2, white)
  cylinder(arm, .27, .32, silver, [-.9, 2.05, 0]).rotation.x = Math.PI / 2
  rod(arm, [-.9, 2.05, 0], [-1.5, 1.5, .3], .14, white)
  rod(arm, [-1.5, 1.5, .3], [-1.4, 1.1, .3], .09, silver)
  display.traverse(o => { o.userData.action = 'projects' })
  for (let i = 0; i < 4; i++) {
    box(root, [3.5, .12, 1.6], yellow, [-7 + i * 4, 1.2, -7])
    for (const x of [-1.5, 1.5]) box(root, [.08, 1.2, .08], silver, [-7 + i * 4 + x, .6, -7])
  }
  return { root, frame: mobile => mobile ? { position: [7.5, 4.8, 22], target: [.2, 4, 0] } : { position: [7.1, 4.7, 15], target: [.5, 4.1, 0] }, update(state) {
    arm.rotation.y = Math.sin(state.time * .3) * .22
    door.position.x = THREE.MathUtils.lerp(door.position.x, state.progress ? 3.8 : 0, .04)
    sign.position.z = -.2 + Math.sin(state.time * .15) * .015
  } }
}

export function createWorld(direction: Direction, scene: THREE.Scene, logo: THREE.Texture, font?: Font): World {
  if (direction === 'robot') return robotWorld(scene, logo)
  if (!font) throw new Error('Dimensional lettering needs a loaded font')
  if (direction === 'machine') return createMachineWorld(scene, logo, font)
  if (direction === 'workbench') return createWorkbenchWorld(scene, logo, font)
  return hallWorld(scene, logo, font)
}
