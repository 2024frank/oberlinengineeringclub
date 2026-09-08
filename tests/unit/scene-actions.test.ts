import * as THREE from 'three'
import { expect, it } from 'vitest'
import { firstVisibleSceneAction } from '@/components/concepts/sceneActions'

function hits(hidden: boolean, occluded: boolean) {
  const scene = new THREE.Scene(), group = new THREE.Group()
  const control = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .2), new THREE.MeshBasicMaterial())
  control.userData.action = 'projects'; group.add(control); group.visible = !hidden; scene.add(group)
  if (occluded) {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(2, 2, .2), new THREE.MeshBasicMaterial())
    cover.position.z = 1; scene.add(cover)
  }
  scene.updateMatrixWorld(true)
  return new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1)).intersectObjects(scene.children, true)
}

it('does not activate a control hidden by its parent', () => {
  expect(firstVisibleSceneAction(hits(true, false))).toBeUndefined()
})

it('does not activate a control through the cabinet surface', () => {
  expect(firstVisibleSceneAction(hits(false, true))).toBeUndefined()
})

it('activates the nearest unobstructed, visible control', () => {
  expect(firstVisibleSceneAction(hits(false, false))).toBe('projects')
})
