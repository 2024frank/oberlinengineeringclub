import * as THREE from 'three'
import type { Font } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { badge, box, cylinder, lettering, mesh, rod, torus } from '../geometry'
import type { SurfaceBounds, World } from '../worlds'

export function createWorkbenchWorld(scene: THREE.Scene, logo: THREE.Texture, font: Font): World {
  scene.background = new THREE.Color(0xe9eae7)
  const root = new THREE.Group(); scene.add(root)
  const grainData = new Uint8Array(256 * 256 * 4)
  let seed = 317
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let y = 0; y < 256; y++) {
    const streak = random() * 90
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4, value = 95 + streak + random() * 45
      grainData[i] = grainData[i + 1] = grainData[i + 2] = value; grainData[i + 3] = 255
    }
  }
  const grain = new THREE.DataTexture(grainData, 256, 256)
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(3, 8); grain.needsUpdate = true
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xabb1ae, metalness: .72, roughness: .28, clearcoat: .12, bumpMap: grain, bumpScale: .025 })
  const faceMetal = new THREE.MeshPhysicalMaterial({ color: 0xc7cac6, metalness: .42, roughness: .43, bumpMap: grain, bumpScale: .012 })
  const paper = new THREE.MeshStandardMaterial({ color: 0xf7f8f3, metalness: .08, roughness: .82 })
  const red = new THREE.MeshPhysicalMaterial({ color: 0x862128, metalness: .3, roughness: .32, clearcoat: .5 })
  const steel = new THREE.MeshStandardMaterial({ color: 0xc0c5c4, metalness: .92, roughness: .19, bumpMap: grain, bumpScale: .013 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x101312, metalness: .28, roughness: .5 })
  const cyan = new THREE.MeshStandardMaterial({ color: 0x4e8b91, metalness: .12, roughness: .78 })
  const brass = new THREE.MeshStandardMaterial({ color: 0xb19659, metalness: .7, roughness: .48 })
  function fastener(parent: THREE.Object3D, x: number, y: number, z: number, radius = .054) {
    torus(parent, radius, radius * .19, steel, [x, y, z])
    const bolt = mesh(parent, new THREE.CylinderGeometry(radius * .66, radius * .66, .028, 6), dark, [x, y, z + .007])
    bolt.rotation.x = Math.PI / 2
  }
  const backdrop = box(root, [70, 45, .2], paper, [0, 0, -2.2], 0)
  backdrop.receiveShadow = false
  const floor = mesh(root, new THREE.PlaneGeometry(60, 30), new THREE.ShadowMaterial({ opacity: .22, depthWrite: false }), [0, -4.86, 0])
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false
  const feet = [-1, 1].map(() => box(root, [.65, .23, 1.1], dark, [0, -4.72, -.45], .055))
  const shell = box(root, [1, 9.1, .55], dark, [0, 0, -1.25], .015)
  const face = box(root, [1, 8.75, .05], faceMetal, [0, 0, -.2], 0)
  const facePanels = Array.from({ length: 4 }, () => box(root, [1, 1, .09], faceMetal, [0, 0, -.2], .012))
  const top = box(root, [1, .3, .65], steel, [0, 4.46, -.1], .06)
  const bottom = box(root, [1, .3, .65], steel, [0, -4.48, -.1], .06)
  const flanges = [-1, 1].map(sign => {
    const outline = new THREE.Shape()
    const points = [[.5, 4.65], [-.1, 4.65], [-.5, 4.12], [-.5, -4.12], [-.1, -4.65], [.5, -4.65]]
    points.forEach(([x, y], i) => { if (!i) outline.moveTo(x * -sign, y); else outline.lineTo(x * -sign, y) }); outline.closePath()
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: 1.45, bevelEnabled: true, bevelThickness: .045, bevelSize: .04, bevelSegments: 3 })
    return mesh(root, geometry, red, [0, 0, -1.2])
  })
  const flangeBolts = Array.from({ length: 6 }, () => { const g = new THREE.Group(); root.add(g); fastener(g, 0, 0, 0, .061); return g })
  const screws = Array.from({ length: 8 }, () => {
    const group = new THREE.Group(); root.add(group)
    const head = cylinder(group, .065, .04, steel); head.rotation.x = Math.PI / 2
    box(group, [.062, .013, .007], dark, [0, 0, .025], 0)
    return group
  })
  const bayBack = box(root, [1, 1, .08], dark, [0, 0, -.78], .02)
  bayBack.name = 'workbench-bay-back'
  const bayRim = Array.from({ length: 4 }, () => box(root, [1, 1, .6], steel, [0, 0, -.04], .075))
  const bayInner = Array.from({ length: 4 }, () => box(root, [1, 1, .8], dark, [0, 0, -.3], .02))
  const bayBolts = Array.from({ length: 6 }, () => { const g = new THREE.Group(); root.add(g); fastener(g, 0, 0, 0, .063); return g })
  const bayVents = new THREE.Group(); root.add(bayVents)
  for (let i = 0; i < 8; i++) box(bayVents, [.28, .045, .025], steel, [0, i * .12, 0], .012)
  const navigation = Array.from({ length: 3 }, (_, index) => {
    const group = new THREE.Group(); root.add(group)
    const plate = box(group, [1, 1, .16], paint, [0, 0, .05], .045)
    const bolts = Array.from({ length: 4 }, () => { const g = new THREE.Group(); group.add(g); fastener(g, 0, 0, .15, .035); return g })
    group.traverse(object => { object.userData.action = ['projects', 'events', 'about'][index] })
    return { group, plate, bolts }
  })
  const controlPanel = box(root, [1, 1, .24], paint, [0, 0, .15], .045)
  const title = new THREE.Group(); root.add(title); title.name = 'workbench-title'
  const titleLines = ['OBERLIN', 'ENGINEERING', 'CLUB'].map((text, index) => {
    const geometry = new TextGeometry(text, { font, size: 1, depth: .04, curveSegments: 8, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2 })
    geometry.computeBoundingBox()
    const bounds = geometry.boundingBox!, size = bounds.getSize(new THREE.Vector3())
    geometry.translate(-(bounds.max.x + bounds.min.x) / 2, -(bounds.max.y + bounds.min.y) / 2, 0)
    return { object: mesh(title, geometry, index === 1 ? red : dark), size }
  })
  const controlBolts = Array.from({ length: 4 }, () => { const g = new THREE.Group(); root.add(g); fastener(g, 0, 0, .34); return g })
  const dial = new THREE.Group(); root.add(dial)
  for (const [radius, depth, material, z] of [[.54, .12, dark, 0], [.48, .1, steel, .1], [.4, .12, paint, .19]] as const) cylinder(dial, radius, depth, material, [0, 0, z]).rotation.x = Math.PI / 2
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2
    const ridge = box(dial, [.022, .065, .13], steel, [Math.sin(a) * .49, Math.cos(a) * .49, .13], .004)
    ridge.rotation.z = -a
  }
  const selector = new THREE.Group(); dial.add(selector); selector.name = 'workbench-selector'
  box(selector, [.2, .88, .17], steel, [0, 0, .34], .055)
  box(selector, [.025, .16, .01], dark, [0, .26, .433], .003)
  fastener(selector, 0, -.31, .44, .055)
  dial.traverse(object => { object.userData.action = 'projects' })
  const mechanism = new THREE.Group(); root.add(mechanism)
  mechanism.name = 'workbench-mechanism'
  const mounts = [-1.5, 1.5].map(x => {
    const leg = new THREE.Group(); leg.position.x = x; mechanism.add(leg)
    box(leg, [.26, 4.6, .32], steel, [0, 0, .06], .015)
    for (const offset of [-.065, .065]) box(leg, [.028, 4.25, .018], dark, [offset, 0, .227], 0)
    rod(leg, [.2, -2.02, .29], [.2, 2.05, .29], .044, steel)
    for (const y of [-2.2, 2.2]) {
      box(leg, [.53, .32, .5], dark, [0, y, .08], .025)
      fastener(leg, -.15, y, .35); fastener(leg, .15, y, .35)
    }
    return leg
  })
  const beam = box(mechanism, [3.45, .21, .4], steel, [0, 2.2, .14], .012)
  box(mechanism, [3.55, .62, .96], dark, [0, -2.2, .25], .045)
  box(mechanism, [3.25, .38, .035], paint, [0, -2.15, .75], .012)
  for (const x of [-1.3, 1.3]) {
    fastener(mechanism, x, -2.15, .79)
    box(mechanism, [.42, .15, .72], dark, [x, -2.59, .25], .055)
    rod(mechanism, [x, -2.05, .45], [x, -1.73, .45], .045, steel)
  }
  badge(mechanism, logo, .2, [-.94, -2.15, .78])
  const bed = new THREE.Group(); mechanism.add(bed); bed.position.set(0, -1.65, .65)
  box(bed, [3.35, .14, 1.4], steel, [0, 0, 0], .012)
  box(bed, [3.05, .025, 1.2], dark, [0, .082, 0], .005)
  for (let x = -1.4; x <= 1.4; x += .2) box(bed, [.012, .008, 1.08], steel, [x, .1, 0], 0)
  for (const x of [-1.5, 1.5]) box(bed, [.12, .085, .24], steel, [x, .04, .59], .01)
  // Layered walls make the part read as an actual print on the moving bed.
  const part = new THREE.Group(); bed.add(part)
  box(part, [1.2, .055, .8], red, [0, .13, 0], .015)
  for (let layer = 0; layer < 8; layer++) {
    for (const x of [-.51, .51]) box(part, [.13, .024, .61], red, [x, .18 + layer * .027, 0], .007)
    box(part, [1.1, .024, .1], red, [0, .18 + layer * .027, -.25], .007)
  }
  const screwCurve = new THREE.CatmullRomCurve3(Array.from({ length: 641 }, (_, i) => new THREE.Vector3(.048 * Math.cos(i / 640 * Math.PI * 80), -1.7 + i / 640 * 3.6, .048 * Math.sin(i / 640 * Math.PI * 80))))
  const leadScrew = mesh(mechanism, new THREE.TubeGeometry(screwCurve, 640, .011, 6, false), steel, [1.15, 0, .47])
  cylinder(mechanism, .12, .48, dark, [1.15, 1.95, .47])
  box(mechanism, [.45, .45, .45], red, [1.15, 2.22, .47], .015)
  const spool = new THREE.Group(); mechanism.add(spool); spool.position.set(-2.12, .55, -.1)
  rod(mechanism, [-1.5, .55, -.1], [-2.12, .55, -.1], .09, dark)
  cylinder(spool, .41, .25, red).rotation.x = Math.PI / 2
  for (const z of [-.15, .15]) {
    const rim = cylinder(spool, .5, .035, dark, [0, 0, z]); rim.rotation.x = Math.PI / 2
    torus(spool, .39, .016, steel, [0, 0, z + .024])
  }
  cylinder(spool, .1, .35, steel).rotation.x = Math.PI / 2
  const carriage = new THREE.Group(); carriage.name = 'workbench-carriage'; mechanism.add(carriage)
  box(carriage, [3.26, .31, .25], steel, [0, 0, .4], .01)
  for (const y of [-.085, .085]) box(carriage, [2.85, .035, .08], dark, [0, y, .57], 0)
  const pulleys = [-1.4, 1.4].map(x => {
    const pulley = cylinder(carriage, .15, .13, dark, [x, 0, .52]); pulley.rotation.x = Math.PI / 2
    return pulley
  })
  const tool = new THREE.Group(); carriage.add(tool)
  box(tool, [.65, .82, .38], red, [0, -.14, .75], .025)
  for (const x of [-.26, .26]) for (const y of [-.46, .18]) fastener(tool, x, y, .96, .027)
  box(tool, [.78, .18, .28], dark, [0, .37, .72], .015)
  const fan = cylinder(tool, .21, .05, dark, [0, -.12, .96]); fan.rotation.x = Math.PI / 2
  torus(tool, .21, .013, steel, [0, -.12, .992])
  const fanBlades = new THREE.Group(); tool.add(fanBlades); fanBlades.position.set(0, -.12, 1)
  for (let i = 0; i < 4; i++) {
    const blade = box(fanBlades, [.037, .33, .018], steel, [0, 0, 0], .005); blade.rotation.z = i * Math.PI / 4
  }
  cylinder(tool, .1, .28, steel, [0, -.64, .8])
  mesh(tool, new THREE.ConeGeometry(.09, .25, 12), brass, [0, -.9, .8]).rotation.z = Math.PI
  const cable = new THREE.InstancedMesh(new THREE.CylinderGeometry(.028, .028, 1, 8), dark, 24)
  mechanism.add(cable)
  const cableTransform = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0)
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.8, 2.21, .45), new THREE.Vector3(-1, 2.5, .7), new THREE.Vector3(), new THREE.Vector3()
  ])
  const handwheel = new THREE.Group(); mechanism.add(handwheel); handwheel.position.set(0, -2.38, .82)
  torus(handwheel, .3, .055, dark)
  cylinder(handwheel, .27, .1, steel).rotation.x = Math.PI / 2
  torus(handwheel, .19, .006, dark, [0, 0, .06])
  cylinder(handwheel, .07, .13, steel).rotation.x = Math.PI / 2
  const knob = cylinder(handwheel, .07, .25, dark, [.25, 0, .12]); knob.rotation.x = Math.PI / 2
  mechanism.traverse(object => { object.userData.action = 'activate' })
  const handle = new THREE.Group(); root.add(handle); handle.name = 'workbench-signup-lever'
  const handleMount = new THREE.Group(); root.add(handleMount)
  box(handleMount, [1.08, 1.05, .15], dark, [0, 0, 0], .08)
  box(handle, [1, 1, .28], red, [0, 0, .2], .12)
  box(handle, [.09, 1.12, .35], steel, [-.47, 0, .12], .025)
  fastener(handle, -.47, -.36, .32, .045)
  handle.traverse(object => { object.userData.action = 'join' })
  const tray = new THREE.Group(); root.add(tray); tray.name = 'workbench-project-tray'
  const trayFloor = box(tray, [1, 1, .18], paint, [0, 0, 0], .025)
  const trayInsert = box(tray, [1, 1, .04], dark, [0, 0, .115], .008)
  const trayLip = box(tray, [1, .2, .28], steel, [0, 0, .26], .022)
  const trayRails = [-1, 1].map(() => box(tray, [.085, 1, .24], steel, [0, 0, .16], .015))
  const trayGrip = box(tray, [1.7, .23, .32], red, [0, 0, .4], .065)
  const trayGripInset = box(tray, [1.3, .075, .04], dark, [0, 0, .57], .02)
  const trayBolts = [-1, 1].map(() => { const g = new THREE.Group(); tray.add(g); fastener(g, 0, 0, .425); return g })
  trayGrip.userData.action = 'projects'
  const vents = new THREE.Group(); root.add(vents)
  for (let i = 0; i < 11; i++) box(vents, [.07, .27, .015], dark, [i * .16, 0, 0], .01)
  const label = new THREE.Group(); root.add(label)
  lettering(label, 'OEC', font, .55, dark, [0, 0, .1], .002)
  const indicator = cylinder(root, .045, .02, cyan); indicator.rotation.x = Math.PI / 2
  const screen = new THREE.Object3D(); root.add(screen); screen.position.set(0, .08, 1.72)
  screen.userData = { width: 1100, height: 700, cssScale: .01, visible: true }
  const receipt = new THREE.Group(); root.add(receipt); receipt.name = 'workbench-receipt'
  box(root, [2.4, .065, .055], dark, [0, -4.42, .26], .01)
  box(receipt, [2.1, .8, .015], paper, [0, -.4, .02], 0)
  lettering(receipt, 'PREVIEW', font, 1.3, dark, [0, -.36, .04], .001)
  for (let i = 0; i < 3; i++) box(receipt, [1.3 - i * .16, .014, .004], steel, [0, -.49 - i * .07, .04], 0)
  let openAmount = 0, exploded = 0, drawerAmount = 0, leverAmount = 0, receiptAmount = 0
  return {
    root, screen,
    frame: () => ({ position: [0, 0, 15], target: [0, 0, 0] }),
    update(state) {
      const aspect = state.aspect ?? 1.8
      const width = Math.min(17.7, (state.mobile ? 9.15 : 10.1) * aspect)
      const ease = state.paused ? 1 : 1 - Math.exp(-state.delta * 7)
      openAmount = THREE.MathUtils.lerp(openAmount, state.view === 'home' ? 0 : 1, ease)
      exploded = THREE.MathUtils.lerp(exploded, state.active ? 1 : 0, ease)
      drawerAmount = THREE.MathUtils.lerp(drawerAmount, state.view === 'projects' ? 1 : 0, ease)
      leverAmount = THREE.MathUtils.lerp(leverAmount, state.view === 'join' ? 1 : 0, ease)
      receiptAmount = THREE.MathUtils.lerp(receiptAmount, state.view === 'join' && state.progress >= 4 ? 1 : 0, ease)
      shell.scale.x = width + .64; face.scale.x = width + .3; top.scale.x = width + .5; bottom.scale.x = width + .5
      flanges.forEach((flange, i) => { flange.position.x = (i ? 1 : -1) * (width / 2 + .28); flange.scale.x = state.mobile ? .26 : .78 })
      feet.forEach((foot, i) => { foot.position.x = (i ? 1 : -1) * width * .4 })
      flangeBolts.forEach((bolt, i) => { bolt.position.set((i % 2 ? 1 : -1) * (width / 2 + .22), 4.1 - Math.floor(i / 2) * 4.1, .31); bolt.visible = !state.mobile })
      screws.forEach((screw, i) => { screw.position.set((i % 2 ? 1 : -1) * (width / 2 + .18), 4.16 - Math.floor(i / 2) * 2.77, -.1) })
      screen.userData.cssScale = width * .88 / (state.mobile ? 390 : 1100)
      screen.userData.width = state.mobile ? 390 : 1100
      screen.userData.height = 7.65 / screen.userData.cssScale
      screen.userData.visible = true
      // HTML stays on a flat reading surface; each real part is projected into its measured slot.
      const fit = (bounds: SurfaceBounds, z: number) => {
        const depth = (15 - z) / (15 - screen.position.z)
        return { x: bounds.x * width * .88 * depth, y: (bounds.y * 7.65 + screen.position.y) * depth, width: bounds.width * width * .88 * depth, height: bounds.height * 7.65 * depth }
      }
      const layout = state.composition ?? { x: .25, y: .04, width: .46, height: .64 }
      title.visible = state.view === 'home'
      titleLines.forEach(({ object, size }, i) => {
        const bounds = layout.title?.[i]; object.visible = Boolean(bounds)
        if (!bounds) return
        const p = fit(bounds, .08)
        object.position.set(p.x, p.y, -.135)
        object.scale.set(p.width / size.x, p.height * .9 / size.y, 1)
      })
      const bay = fit(layout, .2), m = fit(layout, .45)
      bayBack.position.set(bay.x, bay.y, -.78); bayBack.scale.set(bay.width, bay.height, 1)
      const aperture = { left: bay.x - bay.width / 2, right: bay.x + bay.width / 2, top: bay.y + bay.height / 2, bottom: bay.y - bay.height / 2 }
      const faceWidth = width + .3
      const panels = [
        { x: (aperture.left - faceWidth / 2) / 2, y: 0, w: aperture.left + faceWidth / 2, h: 8.75 },
        { x: (aperture.right + faceWidth / 2) / 2, y: 0, w: faceWidth / 2 - aperture.right, h: 8.75 },
        { x: bay.x, y: (4.375 + aperture.top) / 2, w: bay.width, h: 4.375 - aperture.top },
        { x: bay.x, y: (-4.375 + aperture.bottom) / 2, w: bay.width, h: aperture.bottom + 4.375 }
      ]
      face.visible = openAmount >= .98
      facePanels.forEach((panel, i) => { const p = panels[i]; panel.position.set(p.x, p.y, -.2); panel.scale.set(Math.max(.01, p.w), Math.max(.01, p.h), 1); panel.visible = !face.visible })
      bayRim.forEach((rim, i) => {
        const vertical = i < 2, sign = i % 2 ? 1 : -1
        rim.position.set(bay.x + (vertical ? sign * bay.width / 2 : 0), bay.y + (vertical ? 0 : sign * bay.height / 2), -.04)
        rim.scale.set(vertical ? .16 : bay.width + .16, vertical ? bay.height + .16 : .16, 1)
        const inner = bayInner[i]; inner.position.copy(rim.position); inner.position.z = -.32
        inner.scale.set(vertical ? .12 : bay.width, vertical ? bay.height : .12, 1)
        rim.visible = inner.visible = !face.visible
      })
      bayBack.visible = bayVents.visible = !face.visible
      bayVents.position.set(aperture.right - .24, bay.y - .35, -.67)
      bayBolts.forEach((bolt, i) => { bolt.position.set(bay.x + (i % 2 ? 1 : -1) * (bay.width / 2 - .22), bay.y + (1 - Math.floor(i / 2)) * (bay.height / 2 - .24), -.63); bolt.visible = !face.visible })
      mechanism.scale.setScalar(Math.min(m.width * .89 / 5.2, m.height * .93 / 5.7))
      mechanism.scale.x *= 1.14
      mechanism.position.set(m.x + mechanism.scale.x * .27, m.y, .45 - openAmount * 3)
      mechanism.rotation.set(.15, -.22, 0)
      mechanism.visible = openAmount < .98
      carriage.position.y = -.28 + Math.sin(state.time * .28) * .16 + exploded * .5
      tool.position.x = Math.sin(state.time * .75) * .58
      cableCurve.points[2].set(tool.position.x - .45, carriage.position.y + 1.1, .8)
      cableCurve.points[3].set(tool.position.x, carriage.position.y + .3, .8)
      const points = cableCurve.getPoints(24)
      for (let i = 0; i < 24; i++) {
        const axis = points[i + 1].clone().sub(points[i])
        cableTransform.position.copy(points[i]).add(points[i + 1]).multiplyScalar(.5)
        cableTransform.scale.set(1, axis.length(), 1)
        cableTransform.quaternion.setFromUnitVectors(up, axis.normalize())
        cableTransform.updateMatrix(); cable.setMatrixAt(i, cableTransform.matrix)
      }
      cable.instanceMatrix.needsUpdate = true
      leadScrew.rotation.y = state.time * 1.5
      handwheel.rotation.z = state.time * .24
      fanBlades.rotation.z = state.time * 5
      spool.rotation.z = state.time * .16
      pulleys.forEach(pulley => { pulley.rotation.y = state.time * .3 })
      mounts.forEach((mount, i) => { mount.position.x = (i ? 1 : -1) * (1.5 + exploded * .25) })
      beam.position.y = 2.2 + exploded * .38; bed.position.z = .65 + Math.sin(state.time * .55) * .18 + exploded * .65
      cable.visible = exploded < .2
      const control = fit(layout.controls ?? { x: -.25, y: -.36, width: .46, height: .18 }, .35)
      controlPanel.position.set(control.x, control.y, .15); controlPanel.scale.set(control.width, control.height, 1)
      controlPanel.visible = !face.visible
      controlBolts.forEach((bolt, i) => { bolt.position.set(control.x + (i % 2 ? 1 : -1) * (control.width / 2 - .14), control.y + (i < 2 ? 1 : -1) * (control.height / 2 - .14), .32); bolt.visible = !face.visible })
      const knob = fit(layout.selector ?? { x: -.36, y: -.36, width: .09, height: .13 }, .82)
      dial.position.set(knob.x, knob.y, .35); dial.scale.setScalar(Math.min(knob.width, knob.height) / 1.08)
      selector.rotation.z = THREE.MathUtils.lerp(selector.rotation.z, ({ home: -.65, projects: .05, events: .75, join: 1.45 }[state.view] ?? 2.1), ease)
      dial.visible = !face.visible
      const grip = fit(layout.lever ?? { x: -.15, y: -.36, width: .24, height: .1 }, .76)
      handle.position.set(grip.x, grip.y, .4); handle.scale.set(grip.width, grip.height, 1); handle.rotation.x = -leverAmount * .9
      handleMount.position.copy(handle.position); handleMount.scale.copy(handle.scale)
      handle.visible = handleMount.visible = !face.visible
      navigation.forEach(({ group, plate, bolts }, i) => {
        const bounds = layout.navigation?.[i]
        group.visible = Boolean(bounds) && !face.visible
        if (!bounds) return
        const p = fit(bounds, .4); group.position.set(p.x, p.y, .2); plate.scale.set(p.width, p.height, 1)
        bolts.forEach((bolt, j) => { bolt.position.x = (j % 2 ? 1 : -1) * (p.width / 2 - .09); bolt.position.y = (j < 2 ? 1 : -1) * (p.height / 2 - .09) })
      })
      const drawer = fit(layout.drawer ?? { x: .25, y: -.36, width: .46, height: .18 }, .85)
      tray.position.set(drawer.x * (1 - drawerAmount), drawer.y * (1 - drawerAmount), .7 + drawerAmount * .65)
      tray.visible = state.view === 'home' || drawerAmount > .01
      const drawerWidth = THREE.MathUtils.lerp(drawer.width + .18, width * .91, drawerAmount)
      const drawerHeight = THREE.MathUtils.lerp(drawer.height + .15, 7.8, drawerAmount)
      trayFloor.scale.set(drawerWidth, drawerHeight, 1); trayInsert.scale.set(drawerWidth - .2, drawerHeight - .08, 1)
      trayLip.scale.x = drawerWidth; trayLip.position.y = -drawerHeight / 2
      trayGrip.position.y = trayGripInset.position.y = -drawerHeight / 2 - .07
      trayRails.forEach((rail, i) => { rail.position.x = (i ? 1 : -1) * drawerWidth / 2; rail.scale.y = drawerHeight })
      trayBolts.forEach((bolt, i) => { bolt.position.set((i ? 1 : -1) * (drawerWidth / 2 - .18), -drawerHeight / 2, .02) })
      vents.position.set(-width / 2 + .24, -4.21, -.05)
      label.position.set(width / 2 - 1.1, -4.32, 0); label.visible = !state.mobile
      indicator.position.set(width / 2 - .14, 4.2, 0)
      receipt.visible = state.view === 'join' && state.progress >= 4
      receipt.position.set(0, -4.43, .4); receipt.scale.y = Math.max(.001, receiptAmount)
    }
  }
}
