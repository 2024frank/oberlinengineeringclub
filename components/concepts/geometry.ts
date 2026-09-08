import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js'

export type V3 = [number, number, number]
export const material = (color: THREE.ColorRepresentation, metalness = .35, roughness = .25) => new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat: .6, clearcoatRoughness: .14 })
export function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, surface: THREE.Material, position: V3 = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, surface)
  object.position.set(...position); object.castShadow = true; object.receiveShadow = true; parent.add(object)
  return object
}
export function box(parent: THREE.Object3D, size: V3, surface: THREE.Material, position: V3 = [0, 0, 0], radius = .06) {
  return mesh(parent, radius ? new RoundedBoxGeometry(...size, 3, Math.min(radius, Math.min(...size) / 2)) : new THREE.BoxGeometry(...size), surface, position)
}
export function roundedPlate(parent: THREE.Object3D, width: number, height: number, depth: number, radius: number, surface: THREE.Material, position: V3) {
  const shape = new THREE.Shape(), x = -width / 2, y = -height / 2, r = radius
  shape.moveTo(x + r, y); shape.lineTo(x + width - r, y); shape.quadraticCurveTo(x + width, y, x + width, y + r)
  shape.lineTo(x + width, y + height - r); shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  shape.lineTo(x + r, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - r)
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y)
  return mesh(parent, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 3, curveSegments: 12 }), surface, position)
}
export function sphere(parent: THREE.Object3D, size: V3, surface: THREE.Material, position: V3 = [0, 0, 0]) {
  const object = mesh(parent, new THREE.SphereGeometry(1, 40, 28), surface, position); object.scale.set(...size); return object
}
export const cylinder = (parent: THREE.Object3D, radius: number, length: number, surface: THREE.Material, position: V3 = [0, 0, 0]) => mesh(parent, new THREE.CylinderGeometry(radius, radius, length, 40), surface, position)
export function rod(parent: THREE.Object3D, start: V3, end: V3, radius: number, surface: THREE.Material) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), axis = b.clone().sub(a)
  const object = cylinder(parent, radius, axis.length(), surface)
  object.position.copy(a.add(b).multiplyScalar(.5)); object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize()); return object
}
export const torus = (parent: THREE.Object3D, radius: number, thickness: number, surface: THREE.Material, position: V3 = [0, 0, 0]) => mesh(parent, new THREE.TorusGeometry(radius, thickness, 12, 72), surface, position)
export const tube = (parent: THREE.Object3D, points: V3[], radius: number, surface: THREE.Material) => mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 40, radius, 8, false), surface)
export const badge = (parent: THREE.Object3D, texture: THREE.Texture, radius: number, position: V3) => mesh(parent, new THREE.CircleGeometry(radius, 64), new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }), position)
export function lettering(parent: THREE.Object3D, text: string, font: Font, width: number, surface: THREE.Material, position: V3, depth = .13) {
  const geometry = new TextGeometry(text, { font, size: 1, depth, curveSegments: 5, bevelEnabled: true, bevelThickness: .018, bevelSize: .012, bevelSegments: 2 })
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox!; geometry.translate(-(bounds.max.x + bounds.min.x) / 2, 0, 0)
  const object = mesh(parent, geometry, surface, position); object.scale.setScalar(width / (bounds.max.x - bounds.min.x)); return object
}
let fontPromise: Promise<Font> | undefined
export const loadFont = () => fontPromise ??= new FontLoader().loadAsync('/concepts/helvetiker_bold.typeface.json')
export function gear(parent: THREE.Object3D, radius: number, surface: THREE.Material, position: V3, teeth = 28) {
  const root = new THREE.Group(); root.position.set(...position); parent.add(root)
  const shape = new THREE.Shape()
  for (let i = 0; i <= teeth * 4; i++) {
    const a = i / (teeth * 4) * Math.PI * 2, r = i % 4 < 2 ? radius : radius * .88
    if (!i) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, radius * .68, 0, Math.PI * 2, true); shape.holes.push(hole)
  mesh(root, new THREE.ExtrudeGeometry(shape, { depth: .25, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2, steps: 1 }), surface)
  torus(root, radius * .18, .06, surface, [0, 0, .12])
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4
    const spoke = box(root, [radius * .54, .11, .2], surface, [Math.cos(a) * radius * .43, Math.sin(a) * radius * .43, .12], .025); spoke.rotation.z = a
  }
  return root
}
