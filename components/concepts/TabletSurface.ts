import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

export function createTabletSurface(container: HTMLElement, screen: THREE.Object3D) {
  const renderer = new CSS3DRenderer(), scene = new THREE.Scene()
  renderer.domElement.className = 'robot-dom-world'
  container.appendChild(renderer.domElement)
  const element = document.createElement('div')
  element.className = 'robot-tablet-surface'
  const object = new CSS3DObject(element)
  scene.add(object)
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
  let viewportWidth = 1, viewportHeight = 1, wasNative = false, desktopTransform = ''

  return {
    element,
    resize(width: number, height: number) {
      viewportWidth = width; viewportHeight = height
      renderer.setSize(width, height)
    },
    render(camera: THREE.PerspectiveCamera, native: boolean) {
      if (native) {
        // Keep touch scrolling outside CSS3D's scaled, perspective-transformed ancestry.
        // Reparent the same portal target so form values and scroll position survive resizing.
        if (!wasNative) {
          desktopTransform = element.style.transform
          renderer.domElement.appendChild(element)
          element.style.transform = 'none'
          element.style.userSelect = 'auto'
        }
        const halfWidth = screen.userData.width * screen.userData.cssScale / 2
        const halfHeight = screen.userData.height * screen.userData.cssScale / 2
        corners[0].set(-halfWidth, halfHeight, 0); corners[1].set(halfWidth, halfHeight, 0)
        corners[2].set(-halfWidth, -halfHeight, 0); corners[3].set(halfWidth, -halfHeight, 0)
        screen.updateWorldMatrix(true, false)
        for (const corner of corners) {
          corner.applyMatrix4(screen.matrixWorld).project(camera)
          corner.x = (corner.x + 1) * viewportWidth / 2
          corner.y = (1 - corner.y) * viewportHeight / 2
        }
        // Use the inner rectangle so the native screen stays inside the physical bezel.
        const left = Math.round(Math.max(corners[0].x, corners[2].x))
        const right = Math.round(Math.min(corners[1].x, corners[3].x))
        const top = Math.round(Math.max(corners[0].y, corners[1].y))
        const bottom = Math.round(Math.min(corners[2].y, corners[3].y))
        element.style.left = `${left}px`; element.style.top = `${top}px`
        element.style.width = `${Math.max(1, right - left)}px`
        element.style.height = `${Math.max(1, bottom - top)}px`
      } else {
        if (wasNative) {
          // Restore the transform even when CSS3DRenderer's cached matrix is unchanged.
          element.style.transform = desktopTransform
          element.style.left = ''; element.style.top = ''; element.style.userSelect = 'none'
        }
        screen.getWorldPosition(object.position)
        screen.getWorldQuaternion(object.quaternion)
        screen.getWorldScale(object.scale)
        object.scale.multiplyScalar(screen.userData.cssScale)
        element.style.width = `${screen.userData.width}px`
        element.style.height = `${screen.userData.height}px`
        renderer.render(scene, camera)
      }
      wasNative = native
      element.dataset.scrollMode = native ? 'native' : 'perspective'
      element.style.opacity = screen.userData.visible ? '1' : '0'
      element.style.pointerEvents = screen.userData.visible ? 'auto' : 'none'
      element.inert = !screen.userData.visible
      element.dataset.deployed = screen.userData.visible ? 'true' : 'false'
    },
    dispose() { renderer.domElement.remove() },
  }
}
