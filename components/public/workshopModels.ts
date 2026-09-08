import * as THREE from 'three'

export function buildWorkshopCenterpiece(scene: THREE.Scene) {
  const white = new THREE.MeshStandardMaterial({ color: 0xe2e5d8, metalness: .35, roughness: .28 })
  const red = new THREE.MeshStandardMaterial({ color: 0xf3483e, metalness: .38, roughness: .27 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x242c29, metalness: .65, roughness: .3 })
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb9cec8, metalness: .8, roughness: .18 })
  const lime = new THREE.MeshStandardMaterial({ color: 0xc7ef57, emissive: 0x37590c, emissiveIntensity: .35 })
  const robot = new THREE.Group(); robot.position.set(0, 0, 3.5); scene.add(robot)
  function box(parent: THREE.Object3D, dimensions: [number, number, number], position: [number, number, number], material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material); mesh.position.set(...position); parent.add(mesh); return mesh
  }
  function cylinder(parent: THREE.Object3D, radius: number, length: number, position: [number, number, number], material: THREE.Material, horizontal = false) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), material); mesh.position.set(...position); if (horizontal) mesh.rotation.x = Math.PI / 2; parent.add(mesh); return mesh
  }
  cylinder(robot, 1.4, .22, [0, .1, 0], dark)
  cylinder(robot, 1.18, .08, [0, .25, 0], lime)
  cylinder(robot, .85, .6, [0, .59, 0], white)
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cylinder(robot, .065, .06, [Math.cos(a) * 1.15, .25, Math.sin(a) * 1.15], chrome) }
  const turret = new THREE.Group(); turret.position.y = .88; robot.add(turret)
  cylinder(turret, .58, .35, [0, 0, 0], dark)
  box(turret, [.75, .65, .7], [0, .35, 0], red)
  const shoulder = new THREE.Group(); shoulder.position.y = .65; turret.add(shoulder)
  cylinder(shoulder, .42, .82, [0, 0, 0], dark, true)
  for (const z of [-.45, .45]) cylinder(shoulder, .27, .1, [0, 0, z], white, true)
  box(shoulder, [.48, 1.7, .5], [0, .85, 0], red)
  box(shoulder, [.18, 1.4, .03], [0, .9, .27], white)
  const elbow = new THREE.Group(); elbow.position.y = 1.7; shoulder.add(elbow)
  cylinder(elbow, .32, .72, [0, 0, 0], dark, true)
  for (const z of [-.38, .38]) cylinder(elbow, .22, .09, [0, 0, z], chrome, true)
  box(elbow, [.38, 1.5, .42], [0, .75, 0], white)
  box(elbow, [.16, 1.25, .025], [0, .7, .225], red)
  const wrist = new THREE.Group(); wrist.position.y = 1.5; elbow.add(wrist)
  cylinder(wrist, .26, .34, [0, .1, 0], dark)
  cylinder(wrist, .27, .075, [0, .31, 0], lime)
  for (const x of [-.22, .22]) { box(wrist, [.12, .5, .17], [x, .53, 0], chrome); box(wrist, [.2, .12, .17], [x * .68, .76, 0], dark) }
  const cableCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(.2, .1, -.4), new THREE.Vector3(.45, .65, -.45), new THREE.Vector3(.35, 1.2, -.4), new THREE.Vector3(.15, 1.6, -.2)])
  shoulder.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 30, .055, 8, false), dark))
  const hits: THREE.Object3D[] = []
  robot.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; object.userData.station = 5; hits.push(object) } })

  const colorLayers = new THREE.Group(); scene.add(colorLayers)
  const layerColors = [0xf35058, 0x56d7c0, 0xf2c442, 0xa98cf1]
  for (let i = 0; i < 4; i++) {
    const material = new THREE.MeshStandardMaterial({ color: layerColors[i], transparent: true, opacity: .56, metalness: .25, roughness: .4, depthWrite: false })
    const tile = new THREE.Mesh(new THREE.BoxGeometry(8.5, .035, 7), material)
    tile.position.set(i % 2 ? 3.2 : -3.2, -.32 + i * .014, i < 2 ? .3 : 6.2); tile.rotation.y = (i % 2 ? 1 : -1) * .16; colorLayers.add(tile)
  }
  const sign = new THREE.Group(); sign.position.set(0, 4.6, -7); sign.rotation.y = .35; scene.add(sign)
  const backing = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, .15, 64), red); backing.rotation.x = Math.PI / 2; sign.add(backing)
  let disposed = false
  const texture = new THREE.TextureLoader().load('/brand/oec-badge-circle.png', loaded => { if (disposed) { loaded.dispose(); return } loaded.colorSpace = THREE.SRGBColorSpace })
  texture.colorSpace = THREE.SRGBColorSpace
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.52, 64), new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false })); face.position.z = .083; sign.add(face)
  for (const x of [-1, 1]) box(sign, [.065, 4.6, .065], [x, -2.3, -.15], chrome)
  return {
    hits,
    update(time: number, home: boolean, success: boolean) {
      robot.visible = home; sign.visible = home; colorLayers.visible = home
      turret.rotation.y = Math.sin(time * .26) * .65 - .4
      shoulder.rotation.z = -.45 + Math.sin(time * .5) * .16
      elbow.rotation.z = 1.5 + Math.sin(time * .4) * .2
      wrist.rotation.y = time * .4
      if (success) wrist.rotation.z = Math.sin(time * 2) * .2
    },
    dispose() { disposed = true; texture.dispose() }
  }
}
