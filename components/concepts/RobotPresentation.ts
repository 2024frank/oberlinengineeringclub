import * as THREE from 'three'
import { badge, box, cylinder, material, torus } from './geometry'

// The UI surface travels with this physical tablet, from the waist compartment to the user's view.
export function createRobotPresentation(parent: THREE.Object3D, logo: THREE.Texture) {
  const chrome = material(0x9bafb7, .9, .23), red = material(0x9c0e1e, .45, .3), dark = material(0x090d13, .25, .4)
  const tablet = new THREE.Group(); parent.add(tablet)
  const caseBack = box(tablet, [3.76, 4.57, .24], chrome, [0, 0, 0], .1)
  const caseInset = box(tablet, [3.62, 4.44, .27], red, [0, 0, .01], .09)
  const display = box(tablet, [3.5, 4.25, .03], dark, [0, 0, .161], .02)
  const handles = [-1, 1].map(side => {
    const handle = new THREE.Group(); handle.position.x = side * 1.84; tablet.add(handle)
    for (const y of [-1.8, 1.8]) {
      box(handle, [.14, .32, .36], chrome, [0, y, 0], .03)
      cylinder(handle, .028, .05, dark, [0, y, .205]).rotation.x = Math.PI / 2
    }
    return handle
  })
  const screen = new THREE.Object3D(); screen.position.z = .195; tablet.add(screen)
  const badgeRig = new THREE.Group(); parent.add(badgeRig)
  const badgeCase = box(badgeRig, [1.25, 1.62, .08], chrome, [0, 0, 0], .09)
  box(badgeRig, [1.16, 1.51, .08], material(0xf6f1df, .14, .38), [0, 0, .03], .06)
  badge(badgeRig, logo, .47, [0, .14, .081])
  box(badgeRig, [.79, .11, .02], red, [0, -.46, .086], .01)
  torus(badgeRig, .1, .023, chrome, [0, .88, 0])
  const lanyard = new THREE.Group(); badgeRig.add(lanyard)
  const completeMaterial = material(0xd0e43b, .65, .22)
  for (const side of [-1, 1]) {
    const strap = box(lanyard, [.06, 1.22, .024], red, [side * .22, 1.45, -.03], .008); strap.rotation.z = side * -.34
  }
  badgeCase.userData.action = 'join'
  let deployment = 0, badgeDeployment = 0
  const start = new THREE.Vector3(), finish = new THREE.Vector3()
  return { screen, update({ open, joining, mobile, delta, paused, robotPosition, progress }: { open: boolean; joining: boolean; mobile: boolean; delta: number; paused: boolean; robotPosition: THREE.Vector3; progress: number }) {
    const speed = paused ? 1 : 1 - Math.exp(-delta * 3.2)
    deployment = THREE.MathUtils.lerp(deployment, open ? 1 : 0, speed)
    badgeDeployment = THREE.MathUtils.lerp(badgeDeployment, joining ? 1 : 0, speed)
    const reveal = THREE.MathUtils.smoothstep(deployment, .15, 1)
    tablet.visible = deployment > .015
    start.copy(robotPosition).add(new THREE.Vector3(.7, -.5, 1.1))
    finish.set(mobile ? 0 : 1.6, mobile ? .75 : .33, mobile ? 2.5 : 2)
    tablet.position.lerpVectors(start, finish, reveal)
    tablet.position.y += Math.sin(reveal * Math.PI) * .8
    tablet.rotation.set((1 - reveal) * -.8 - .045, (1 - reveal) * -1.2, (1 - reveal) * -.4)
    tablet.scale.setScalar(.12 + reveal * .88)
    const widthRatio = mobile ? .76 : 1
    caseBack.scale.x = widthRatio; caseInset.scale.x = widthRatio; display.scale.x = widthRatio
    handles.forEach((handle, i) => { handle.position.x = (i ? 1 : -1) * 1.84 * widthRatio })
    screen.userData.width = mobile ? 360 : 580; screen.userData.height = mobile ? 586 : 700
    screen.userData.cssScale = mobile ? .00725 : .006
    screen.userData.visible = deployment > .78
    screen.userData.deployment = deployment
    badgeRig.visible = badgeDeployment > .015
    badgeRig.position.set(mobile ? .82 : -1.2, mobile ? 3.1 : -.2, 1.2 + badgeDeployment * 1.1)
    badgeRig.rotation.set(-.1, -.18 + badgeDeployment * .35, -.16)
    badgeRig.scale.setScalar((mobile ? .46 : 1) * (.15 + badgeDeployment * .85))
    badgeCase.material = progress >= 4 ? completeMaterial : chrome
    return { deployment, reveal }
  } }
}
