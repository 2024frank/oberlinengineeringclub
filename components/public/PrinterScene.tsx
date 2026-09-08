'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useWorkshopMotion } from './WorkshopExperience'

export default function PrinterScene({ variant = 'hero', paused = false }: { variant?: 'hero' | 'workbench'; paused?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const settings = useRef({ exploded: false, playing: true, reset: () => {} })
  const [exploded, setExploded] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const siteMotion = useWorkshopMotion()
  const motion = useRef(siteMotion)
  useEffect(() => { motion.current = siteMotion && !paused }, [siteMotion, paused])

  useEffect(() => {
    const container = host.current!
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) } catch {
      const frame = requestAnimationFrame(() => setFailed(true))
      return () => cancelAnimationFrame(frame)
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.7
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D printer assembly')
    renderer.domElement.setAttribute('role', 'img')
    container.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.enableZoom = false
    controls.minPolarAngle = .45
    controls.maxPolarAngle = Math.PI * .6
    const reset = () => { camera.position.set(7, 5.5, 10); controls.target.set(0, 2.15, 0); controls.update() }
    settings.current.reset = reset
    reset()
    scene.add(new THREE.HemisphereLight(0xd9f5ff, 0x34302b, 3))
    for (const [color, x, y, z, power] of [[0xffffff, 4, 7, 5, 100], [0x84dfdd, -5, 3, -2, 70], [0xff6644, 3, 4, -5, 100]]) {
      const light = new THREE.PointLight(color, power)
      light.position.set(x, y, z); scene.add(light)
    }
    const model = new THREE.Group(); scene.add(model)
    const metal = new THREE.MeshStandardMaterial({ color: 0x78878a, metalness: .8, roughness: .3 })
    const black = new THREE.MeshStandardMaterial({ color: 0x20272a, metalness: .55, roughness: .38 })
    const red = new THREE.MeshStandardMaterial({ color: 0xdf3a34, metalness: .3, roughness: .32 })
    const glass = new THREE.MeshStandardMaterial({ color: 0x648c88, metalness: .65, roughness: .2 })
    const glow = new THREE.MeshStandardMaterial({ color: 0x8cf9dd, emissive: 0x2bbf9a, emissiveIntensity: .6 })
    const parts: { group: THREE.Group; offset: THREE.Vector3 }[] = []
    function part(x: number, y: number, z: number) { const group = new THREE.Group(); model.add(group); parts.push({ group, offset: new THREE.Vector3(x, y, z) }); return group }
    function box(parent: THREE.Group, size: number[], position: number[], material: THREE.Material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), material)
      mesh.position.set(...position as [number, number, number]); parent.add(mesh); return mesh
    }
    function cylinder(parent: THREE.Group, radius: number, length: number, position: number[], material: THREE.Material) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), material)
      mesh.position.set(...position as [number, number, number]); parent.add(mesh); return mesh
    }
    const base = part(0, -.6, 0)
    box(base, [3.6, .26, 3.5], [0, .15, 0], black)
    for (const x of [-1.5, 1.5]) for (const z of [-1.4, 1.4]) cylinder(base, .18, .22, [x, -.05, z], black)
    for (const x of [-1.2, 1.2]) box(base, [.1, .12, 3.3], [x, .4, 0], metal)
    const gantry = part(0, .7, -.8)
    for (const x of [-1.6, 1.6]) {
      box(gantry, [.22, 3.7, .25], [x, 2, -.7], metal)
      box(gantry, [.065, 3.55, .03], [x, 2, -.56], black)
      cylinder(gantry, .038, 3.4, [x + .2, 1.95, -.5], metal)
      box(gantry, [.4, .45, .4], [x, .5, -.7], black)
    }
    box(gantry, [3.65, .23, .28], [0, 3.85, -.7], black)
    const bed = part(0, .2, 1.3)
    box(bed, [2.9, .15, 2.9], [0, .67, .15], black)
    box(bed, [2.75, .035, 2.75], [0, .77, .15], glass)
    for (let i = -6; i <= 6; i++) {
      box(bed, [.008, .005, 2.7], [i * .2, .794, .15], metal)
      box(bed, [2.7, .005, .008], [0, .794, .15 + i * .2], metal)
    }
    const carriage = part(0, .8, .8)
    box(carriage, [3.3, .19, .22], [0, 2.35, -.45], metal)
    const head = new THREE.Group(); carriage.add(head)
    box(head, [.64, .68, .5], [0, 2.25, -.12], red)
    const fan = cylinder(head, .22, .07, [0, 2.3, .17], black); fan.rotation.x = Math.PI / 2
    for (let i = 0; i < 7; i++) box(head, [.37, .025, .03], [0, 2.15 + i * .05, .22], metal)
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(.1, .2, 16), metal); nozzle.rotation.z = Math.PI; nozzle.position.set(0, 1.79, -.1); head.add(nozzle)
    const spoolGroup = part(.6, 1.15, -.5)
    box(spoolGroup, [.12, .8, .12], [.7, 4.15, -.7], metal)
    const spool = new THREE.Group(); spool.position.set(.7, 4.55, -.7); spool.rotation.x = Math.PI / 2; spoolGroup.add(spool)
    cylinder(spool, .48, .45, [0, 0, 0], red)
    for (const y of [-.26, .26]) cylinder(spool, .58, .055, [0, y, 0], black)
    const filamentPath = new THREE.CatmullRomCurve3([new THREE.Vector3(.7, 4.9, -.7), new THREE.Vector3(1.2, 4.65, -.2), new THREE.Vector3(.7, 3.6, -.1), new THREE.Vector3(0, 2.6, -.1)])
    gantry.add(new THREE.Mesh(new THREE.TubeGeometry(filamentPath, 40, .02, 8, false), red))
    const print = new THREE.Mesh(new THREE.TorusKnotGeometry(.39, .105, 120, 12, 2, 3), glow)
    print.position.set(0, 1.25, .15); bed.add(print)
    const display = box(base, [.8, .4, .2], [1.05, .45, 1.7], black); display.rotation.x = -.25
    box(base, [.58, .23, .015], [1.02, .5, 1.815], glow)
    const grid = new THREE.GridHelper(18, 36, variant === 'workbench' ? 0xb1c5bf : 0x42565a, variant === 'workbench' ? 0xd1ddd8 : 0x263439); grid.position.y = -.18; scene.add(grid)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) settings.current.playing = false
    const syncReduced = () => { settings.current.playing = !reduced.matches; setPlaying(!reduced.matches) }
    reduced.addEventListener('change', syncReduced)
    let visible = true
    const visibility = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false })
    visibility.observe(container)
    const contextLost = (event: Event) => { event.preventDefault(); setFailed(true); setReady(false) }
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    const resize = () => {
      const { width, height } = container.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize); observer.observe(container); resize()
    let frame = 0, time = 0, last = performance.now(), expansion = 0, firstFrame = true
    const render = (now: number) => {
      const delta = Math.min((now - last) / 1000, .05); last = now
      if (!visible || document.hidden) { frame = requestAnimationFrame(render); return }
      if (settings.current.playing && motion.current && !reduced.matches) time += delta
      expansion += ((settings.current.exploded ? 1 : 0) - expansion) * (reduced.matches || !motion.current ? 1 : .07)
      model.scale.setScalar(1 - expansion * .2)
      parts.forEach(({ group, offset }) => group.position.copy(offset).multiplyScalar(expansion))
      head.position.x = Math.sin(time * .65) * .8
      bed.position.z += Math.sin(time * .45) * .15
      spool.rotation.y = time * .15
      model.rotation.y = Math.sin(time * .12) * .1
      controls.update(); renderer.render(scene, camera)
      if (firstFrame) { firstFrame = false; setReady(true); setPlaying(settings.current.playing) }
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect(); controls.dispose()
      reduced.removeEventListener('change', syncReduced); renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()) } })
      renderer.dispose(); renderer.domElement.remove()
    }
  }, [variant])

  return <div className={`printer-experience ${variant === 'workbench' ? 'printer-workbench' : ''} ${ready ? 'is-ready' : ''}`} data-status={failed ? 'failed' : ready ? 'ready' : 'loading'}>
    <div className="printer-canvas" ref={host}/>
    {failed && <p className="printer-fallback" role="status">The 3D assembly is unavailable. You can still explore every project below.</p>}
    {ready && <div className="printer-controls" aria-label="3D assembly controls">
      <div className="assembly-modes" role="group" aria-label="Assembly view">
        <button type="button" aria-pressed={!exploded} onClick={() => { settings.current.exploded = false; setExploded(false) }}>Assembled</button>
        <button type="button" aria-pressed={exploded} onClick={() => { settings.current.exploded = true; setExploded(true) }}>Exploded</button>
      </div>
      <button type="button" title={playing ? 'Pause animation' : 'Play animation'} aria-label={playing ? 'Pause animation' : 'Play animation'} onClick={() => { settings.current.playing = !playing; setPlaying(!playing) }}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>
      <button type="button" title="Reset camera" aria-label="Reset camera" onClick={() => settings.current.reset()}><RotateCcw size={16}/></button>
    </div>}
  </div>
}
