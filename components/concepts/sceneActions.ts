import type { Intersection, Object3D } from 'three'

export function firstVisibleSceneAction(hits: Intersection<Object3D>[]): string | undefined {
  const hit = hits.find(({ object }) => {
    for (let ancestor: Object3D | null = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false
    return true
  })
  const action = hit?.object.userData.action
  return typeof action === 'string' ? action : undefined
}
