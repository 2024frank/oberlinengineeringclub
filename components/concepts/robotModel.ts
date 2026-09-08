import * as THREE from 'three'
import { badge, box, cylinder, material, rod, roundedPlate, sphere, torus, tube } from './geometry'

export function createRobot(parent: THREE.Object3D, logo: THREE.Texture) {
  const root = new THREE.Group(); parent.add(root)
  const porcelain = material(0xf5eee1, .22, .19), scarlet = material(0xac131e, .55, .22), chrome = material(0x9da9b0, 1, .16), black = material(0x090d11, .6, .22)
  const led = new THREE.MeshStandardMaterial({ color: 0x54beff, emissive: 0x35a6ff, emissiveIntensity: 1.4 })
  const torso = new THREE.Group(); root.add(torso)
  sphere(torso, [.91, 1.12, .54], scarlet)
  sphere(torso, [.76, .97, .16], porcelain, [0, .1, .47])
  sphere(torso, [.59, .7, .19], porcelain, [0, -.38, .48])
  badge(torso, logo, .37, [0, .19, .667])
  const pocket = box(torso, [.52, .42, .14], scarlet, [.49, -.62, .51], .05)
  box(torso, [.42, .055, .09], black, [.49, -.42, .56], .015)
  box(torso, [.37, .025, .025], chrome, [.49, -.38, .595], .005)
  for (let i = 0; i < 4; i++) box(torso, [.026, .14, .025], black, [-.39 + i * .065, -.53, .646], .006)
  for (const side of [-1, 1]) {
    sphere(torso, [.38, .42, .4], scarlet, [side * .9, .67, 0])
    torus(torso, .26, .065, chrome, [side * 1.1, .63, .2])
    for (let i = 0; i < 3; i++) box(torso, [.07, .52, .075], black, [side * .8, -.15, .28 + i * .075])
    sphere(root, [.28, .28, .28], black, [side * .49, -1.17, 0])
    rod(root, [side * .49, -1.17, 0], [side * .63, -2.18, 0], .2, chrome)
    sphere(root, [.32, .54, .29], porcelain, [side * .58, -1.8, .05])
    rod(root, [side * .8, -1.25, .1], [side * .84, -2.15, .1], .045, chrome)
  }
  cylinder(root, .25, .4, chrome, [0, 1.13, 0])
  for (let i = 0; i < 5; i++) cylinder(root, .28, .025, black, [0, 1.03 + i * .065, 0])
  const head = new THREE.Group(); head.position.y = 2.03; root.add(head)
  sphere(head, [.93, .89, .69], porcelain)
  roundedPlate(head, 1.66, 1.2, .075, .37, chrome, [0, -.04, .65])
  const screen = new THREE.MeshStandardMaterial({ color: 0x02070b, metalness: 0, roughness: .8, envMapIntensity: .05 })
  roundedPlate(head, 1.52, 1.07, .04, .34, screen, [0, -.035, .74])
  const eyes: THREE.Object3D[] = []
  for (const side of [-1, 1]) {
    const eye = torus(head, .17, .027, led, [side * .37, .04, .82]); eye.scale.y = 1.25; eyes.push(eye)
    tube(head, [[side * .37 - .12, .33, .82], [side * .37, .37, .825], [side * .37 + .12, .34, .82]], .013, led)
    const ear = cylinder(head, .29, .17, chrome, [side * .91, 0, 0]); ear.rotation.z = Math.PI / 2
    const inner = cylinder(head, .2, .185, scarlet, [side * .96, 0, 0]); inner.rotation.z = Math.PI / 2
    for (let i = 0; i < 5; i++) sphere(head, [.025, .025, .025], black, [side * 1.06, Math.sin(i * 1.256) * .24, Math.cos(i * 1.256) * .24])
  }
  tube(head, [[-.14, -.24, .82], [0, -.30, .828], [.14, -.24, .82]], .024, led)
  box(head, [.2, .16, .08], scarlet, [0, .79, .33], .025)
  const left = new THREE.Group(); left.position.set(-1.02, .64, 0); root.add(left)
  rod(left, [0, 0, 0], [-.18, -.8, .15], .16, chrome)
  sphere(left, [.22, .42, .22], porcelain, [-.08, -.4, .08])
  sphere(left, [.22, .22, .22], black, [-.18, -.8, .15])
  rod(left, [-.18, -.8, .15], [-.32, -1.55, .35], .17, chrome)
  sphere(left, [.24, .35, .23], scarlet, [-.26, -1.14, .27])
  box(left, [.36, .43, .25], porcelain, [-.32, -1.65, .38], .13)
  const right = new THREE.Group(); right.position.set(1.01, .64, 0); root.add(right)
  rod(right, [0, 0, 0], [.3, -.65, .45], .17, chrome)
  const upper = sphere(right, [.24, .43, .23], porcelain, [.15, -.3, .22]); upper.rotation.x = -.5; upper.rotation.z = .35
  sphere(right, [.24, .24, .24], black, [.3, -.65, .45])
  rod(right, [.3, -.65, .45], [.52, -.36, 1.34], .16, chrome)
  const lower = sphere(right, [.23, .23, .49], porcelain, [.43, -.52, .94]); lower.rotation.x = -.25
  const hand = new THREE.Group(); hand.position.set(.53, -.31, 1.53); hand.rotation.set(-.24, -.2, -.27); right.add(hand)
  box(hand, [.57, .53, .22], porcelain, [0, 0, 0], .13)
  sphere(hand, [.21, .19, .04], chrome, [0, 0, .115])
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Group(); finger.position.set(-.21 + i * .14, .25, 0); finger.rotation.z = (1.5 - i) * .12; hand.add(finger)
    const length = i === 0 || i === 3 ? .17 : .22
    cylinder(finger, .059, length, porcelain, [0, length / 2, 0]); sphere(finger, [.062, .062, .062], chrome, [0, length, 0])
    const end = new THREE.Group(); end.position.y = length; end.rotation.x = -.23; finger.add(end)
    cylinder(end, .052, .17, porcelain, [0, .085, 0]); sphere(end, [.057, .057, .057], chrome, [0, .17, 0]); sphere(end, [.052, .09, .05], porcelain, [0, .22, -.02])
  }
  rod(hand, [-.25, -.12, 0], [-.47, .12, .04], .075, chrome); sphere(hand, [.075, .13, .07], porcelain, [-.47, .14, .04])
  tube(right, [[.1, -.25, -.12], [.48, -.73, .3], [.61, -.64, .91]], .034, black)
  root.traverse(object => { if (object instanceof THREE.Mesh) object.userData.action = 'greet' })
  pocket.userData.action = 'projects'
  return { root, update(time: number, pointer: THREE.Vector2, greeting: number, deployment = 0, joining = false) {
    head.rotation.set(pointer.y * -.06 + Math.sin(time * .5) * .025, pointer.x * .13 + .06, -.2 + Math.sin(time * .35) * .02)
    torso.rotation.y = Math.sin(time * .4) * .012
    right.rotation.z = Math.sin(time * .6) * .025 + Math.sin(greeting * 5) * Math.max(0, 1 - greeting / 3) * .12
    right.rotation.z -= deployment * (joining ? .32 : .22)
    right.rotation.y = deployment * -.58
    right.rotation.x = deployment * -.22
    left.rotation.z = Math.sin(deployment * Math.PI) * -.7
    head.rotation.y += deployment * .35
    head.rotation.x += Math.sin(deployment * Math.PI) * .25
    hand.rotation.z = -.27 + Math.sin(time * .7) * .04
    eyes.forEach(eye => { eye.scale.y = Math.sin(time * .38) > .996 ? .13 : 1.25 })
  } }
}
