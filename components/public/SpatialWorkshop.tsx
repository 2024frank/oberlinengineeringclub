'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowUpRight, ArrowLeft, Menu, X, RotateCcw, Maximize, Minimize } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'
import { useWorkshopMotion } from './WorkshopExperience'
import { buildWorkshopCenterpiece } from './workshopModels'

const stations = [
  { name: 'Projects', href: '/projects', position: [-5, 0, 0], color: 0xf2886e, kind: 'printer' },
  { name: 'The club', href: '/about', position: [0, 0, -4], color: 0xa3d7c5, kind: 'gear' },
  { name: 'Events', href: '/events', position: [5, 0, 0], color: 0xf3c570, kind: 'table' },
  { name: '3-2 pathway', href: '/pathway', position: [-5, 0, 6], color: 0x9baee3, kind: 'steps' },
  { name: 'Resources', href: '/resources', position: [5, 0, 6], color: 0xe498b0, kind: 'books' },
  { name: 'Join the club', href: '/get-involved', position: [0, 0, 10], color: 0x9bdb98, kind: 'join' }
] as const
const extraLinks = [['Opportunities', '/opportunities'], ['News', '/news'], ['Member sign in', '/member/login']] as const
const routeStation = (path: string) => stations.findIndex(station => path === station.href || path.startsWith(station.href + '/'))

export default function SpatialWorkshop({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const motion = useWorkshopMotion()
  const home = pathname === '/'
  const [screen, setScreen] = useState<HTMLDivElement | null>(null)
  const [failed, setFailed] = useState(false)
  const [menu, setMenu] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)
  const world = useRef<HTMLDivElement>(null)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const menuPanel = useRef<HTMLElement>(null)
  const labelRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const controlsRef = useRef({ reset: () => {} })
  const input = useRef({ pathname, motion, phase: 0, interest: 0 })
  useEffect(() => { input.current.pathname = pathname; input.current.motion = motion }, [pathname, motion])
  useEffect(() => {
    if (!menu) return
    menuPanel.current?.querySelector('a')?.focus()
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(false); menuTrigger.current?.focus() } }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [menu])
  useEffect(() => {
    const sync = () => setFullScreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  useEffect(() => {
    const host = world.current!
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }) } catch { requestAnimationFrame(() => setFailed(true)); return }
    renderer.setClearColor(0x161b19)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.setAttribute('aria-label', 'Oberlin Engineering Club interactive workshop')
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x161b19, 38, 70)
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100)
    camera.position.set(17, 17, 25)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, 3)
    controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = true
    controls.minDistance = 20; controls.maxDistance = 42
    controls.minPolarAngle = .4; controls.maxPolarAngle = 1.2
    controls.update()
    const css = new CSS3DRenderer(); css.domElement.className = 'spatial-dom'; host.appendChild(css.domElement)
    const cssScene = new THREE.Scene()
    const surface = document.createElement('div'); surface.className = 'spatial-screen'; surface.setAttribute('role', 'region'); surface.setAttribute('aria-label', 'Station content')
    const object = new CSS3DObject(surface); object.scale.setScalar(.01); cssScene.add(object)
    const frameGroup = new THREE.Group(); scene.add(frameGroup)
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x55776e, metalness: .6, roughness: .3 })
    const frameMeshes: THREE.Mesh[] = []
    for (let i = 0; i < 4; i++) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .16), frameMaterial); frameGroup.add(mesh); frameMeshes.push(mesh) }
    scene.add(new THREE.HemisphereLight(0xf3f7ef, 0x354754, 3.2))
    const sun = new THREE.DirectionalLight(0xfff0d1, 5); sun.position.set(8, 15, 7); scene.add(sun)
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16; sun.shadow.normalBias = .03
    const fill = new THREE.DirectionalLight(0x96b9e0, 3); fill.position.set(-10, 5, -3); scene.add(fill)
    const pale = new THREE.MeshStandardMaterial({ color: 0xd0d9d5, metalness: .4, roughness: .4 })
    const graphite = new THREE.MeshStandardMaterial({ color: 0x263d43, metalness: .55, roughness: .4 })
    const metal = new THREE.MeshStandardMaterial({ color: 0xa0b8b7, metalness: .75, roughness: .22 })
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x303b35, metalness: .2, roughness: .8 })
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, .35, 96), floorMaterial); floor.position.set(0, -.55, 3); scene.add(floor)
    floor.receiveShadow = true
    const grid = new THREE.GridHelper(32, 32, 0x4c6468, 0x2a444b); grid.position.set(0, -.36, 3); scene.add(grid)
    const stationGroups: THREE.Group[] = [], moving: THREE.Object3D[] = [], hits: THREE.Object3D[] = []
    const centerpiece = buildWorkshopCenterpiece(scene)
    hits.push(...centerpiece.hits)
    let joinCore: THREE.Mesh | undefined
    let joinMaterial: THREE.MeshStandardMaterial | undefined
    const joinParts: THREE.Object3D[] = []
    function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); parent.add(mesh); return mesh
    }
    function cylinder(parent: THREE.Object3D, radius: number, height: number, x: number, y: number, z: number, material: THREE.Material, sides = 32) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, sides), material); mesh.position.set(x, y, z); parent.add(mesh); return mesh
    }
    stations.forEach((station, index) => {
      const group = new THREE.Group(); group.position.set(station.position[0], station.position[1], station.position[2]); scene.add(group); stationGroups.push(group)
      const accent = new THREE.MeshStandardMaterial({ color: station.color, metalness: .35, roughness: .35 })
      box(group, 3.6, .3, 3.6, 0, -.15, 0, graphite)
      box(group, 3.4, .035, .06, 0, .015, 1.65, accent)
      const body = new THREE.Group(); group.add(body)
      if (station.kind === 'printer') {
        box(body, 2.4, .24, 2.2, 0, .25, 0, graphite)
        for (const x of [-1, 1]) box(body, .16, 2.4, .2, x, 1.5, -.5, metal)
        box(body, 2.3, .2, .2, 0, 2.7, -.5, graphite)
        box(body, 1.9, .12, 1.7, 0, .65, .1, pale)
        box(body, 2, .12, .14, 0, 1.8, -.4, metal)
        const head = box(body, .45, .5, .4, 0, 1.65, -.16, accent); moving.push(head)
        const spool = cylinder(body, .42, .3, .5, 3.1, -.5, accent); spool.rotation.x = Math.PI / 2
        const print = new THREE.Mesh(new THREE.TorusKnotGeometry(.27, .075, 64, 8), accent); print.position.set(0, 1, .15); body.add(print)
      } else if (station.kind === 'gear' || station.kind === 'join') {
        const assembly = new THREE.Group(); assembly.position.y = 1.45; body.add(assembly)
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, .12, 12, 64), accent); assembly.add(ring)
        const core = cylinder(assembly, .5, .28, 0, 0, 0, metal, 12); core.rotation.x = Math.PI / 2
        for (let i = 0; i < 12; i++) {
          const angle = i * Math.PI / 6
          const tooth = box(assembly, .2, .2, .3, Math.cos(angle) * .58, Math.sin(angle) * .58, 0, accent); tooth.rotation.z = angle
          if (station.kind === 'join') joinParts.push(tooth)
        }
        for (const x of [-.6, .6]) box(body, .08, 1.4, .08, x, .65, -.12, metal)
        if (station.kind === 'join') { joinCore = core; joinMaterial = accent } else moving.push(assembly)
      } else if (station.kind === 'steps') {
        for (let i = 0; i < 5; i++) box(body, .52, .4 + i * .44, 1.5, (i - 2) * .52, (.4 + i * .44) / 2, 0, i < 3 ? pale : accent)
        const rail = box(body, 3.05, .045, .045, 0, 2.25, -.7, accent); rail.rotation.z = .65
      } else if (station.kind === 'books') {
        box(body, 2.7, .16, 1.8, 0, 1.25, 0, pale)
        for (const x of [-1, 1]) box(body, .14, 1.2, 1.4, x, .6, 0, metal)
        for (let i = 0; i < 5; i++) { const book = box(body, .28, 1 + i * .08, .85, -.7 + i * .34, 1.9, 0, i % 2 ? pale : accent); book.rotation.z = i === 4 ? -.16 : 0 }
      } else {
        box(body, 2.7, .15, 1.8, 0, 1.2, 0, pale)
        for (const x of [-1, 1]) box(body, .14, 1.2, 1.3, x, .6, 0, metal)
        for (const x of [-.85, .85]) for (const z of [-1.3, 1.3]) { cylinder(body, .3, .12, x, .7, z, accent); cylinder(body, .05, .65, x, .32, z, metal) }
        box(body, .7, .07, .5, 0, 1.31, 0, graphite)
      }
      group.traverse(child => { child.userData.station = index; if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; hits.push(child) } })
    })
    // The room's navigation paths physically connect each station to the central aisle.
    stations.forEach(station => {
      const [x, , z] = station.position
      const path = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x) || .035, .012, Math.abs(x) ? .035 : 3), new THREE.MeshBasicMaterial({ color: station.color, transparent: true, opacity: .35 }))
      path.position.set(x / 2, -.35, z); scene.add(path)
    })
    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2()
    let downX = 0, downY = 0, width = 0, height = 0, panelWidth = 0, panelHeight = 0, distance = 12, visible = true, traveling = true
    const pointerDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY }
    const pointerUp = (e: PointerEvent) => {
      if (input.current.pathname !== '/' || Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return
      const rect = host.getBoundingClientRect(); pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); ray.setFromCamera(pointer, camera)
      const hit = ray.intersectObjects(hits)[0]; if (hit) router.push(stations[hit.object.userData.station].href)
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointerup', pointerUp)
    const joinProgress = (event: Event) => { const detail = (event as CustomEvent<{ phase: number; interest: number }>).detail; input.current.phase = detail.phase; input.current.interest = detail.interest }
    window.addEventListener('oec-join-progress', joinProgress)
    const resize = () => {
      width = host.clientWidth; height = host.clientHeight
      if (scene.fog instanceof THREE.Fog) { scene.fog.near = width < 700 ? 100 : 38; scene.fog.far = width < 700 ? 140 : 70 }
      if (input.current.pathname === '/') traveling = true
      renderer.setSize(width, height); css.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix()
      panelWidth = width < 700 ? width - 24 : Math.min(850, width * .66); panelHeight = height - (width < 700 ? 310 : 180)
      surface.style.width = panelWidth + 'px'; surface.style.height = panelHeight + 'px'
      distance = height * .01 / (2 * Math.tan(THREE.MathUtils.degToRad(20))) * 1.07
      frameMeshes.forEach((mesh, i) => { if (i < 2) { mesh.scale.set(panelWidth * .01 + .14, .06, 1); mesh.position.set(0, (i ? -1 : 1) * (panelHeight * .005 + .04), -.04) } else { mesh.scale.set(.06, panelHeight * .01, 1); mesh.position.set((i === 2 ? -1 : 1) * (panelWidth * .005 + .04), 0, -.04) } })
    }
    const observer = new ResizeObserver(resize); observer.observe(host); resize()
    const onVisibility = () => { visible = !document.hidden }; document.addEventListener('visibilitychange', onVisibility)
    const homePosition = new THREE.Vector3(), homeTarget = new THREE.Vector3(0, .4, 3)
    const desiredPosition = new THREE.Vector3(), desiredTarget = new THREE.Vector3(), projected = new THREE.Vector3()
    let frame = 0, t = 0, last = performance.now(), previousRoute = '', initialized = false
    controls.addEventListener('start', () => { if (input.current.pathname === '/') traveling = false })
    controlsRef.current.reset = () => { traveling = true; controls.reset() }
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, .05); last = now
      const activeHome = input.current.pathname === '/'
      if (previousRoute !== input.current.pathname) { previousRoute = input.current.pathname; traveling = true; surface.scrollTop = 0 }
      if (visible) {
        if (input.current.motion) t += dt
        centerpiece.update(t, activeHome, input.current.phase === 3)
        controls.enabled = activeHome
        controls.minDistance = activeHome ? 20 : 1
        controls.maxDistance = activeHome ? width < 700 ? 80 : 48 : 100
        controls.minPolarAngle = activeHome ? .4 : 0
        controls.maxPolarAngle = activeHome ? 1.2 : Math.PI
        homePosition.set(width < 700 ? 18 : 17, width < 700 ? 38 : 17, width < 700 ? 52 : 25)
        if (activeHome) { desiredPosition.copy(homePosition); desiredTarget.copy(homeTarget) }
        else {
          const stationIndex = Math.max(0, routeStation(input.current.pathname))
          const station = stations[stationIndex]
          desiredTarget.set(station.position[0], 3.5, station.position[2] + 2.8)
          desiredPosition.copy(desiredTarget).add(new THREE.Vector3(0, .1, distance))
          object.position.copy(desiredTarget).add(new THREE.Vector3(width < 700 ? 0 : 2.2, width < 700 ? -1.25 : 0, 0)); frameGroup.position.copy(object.position)
          frameMaterial.color.setHex(station.color)
        }
        if (traveling || !activeHome) {
          const amount = input.current.motion ? 1 - Math.exp(-dt * 5) : 1
          camera.position.lerp(desiredPosition, amount); controls.target.lerp(desiredTarget, amount)
          if (activeHome && camera.position.distanceTo(desiredPosition) < .03) traveling = false
        }
        controls.update()
        stationGroups.forEach((group, index) => {
          const selected = !activeHome && index === Math.max(0, routeStation(input.current.pathname))
          const position = stations[index].position
          const target = new THREE.Vector3(position[0], position[1], position[2])
          if (selected) target.add(new THREE.Vector3(width < 700 ? 0 : -4.8, width < 700 ? 4.9 : .8, 0))
          group.position.lerp(target, input.current.motion ? .1 : 1)
          group.scale.setScalar(selected ? width < 700 ? .65 : 1.15 : 1)
          group.visible = activeHome || selected
        })
        const settled = camera.position.distanceTo(desiredPosition) < .4
        surface.style.opacity = !activeHome && settled ? '1' : '0'; surface.style.pointerEvents = !activeHome && settled ? 'auto' : 'none'
        surface.inert = activeHome || !settled
        frameGroup.visible = !activeHome
        moving.forEach((part, i) => { if (i === 0) part.position.x = Math.sin(t * .8) * .65; else part.rotation.z = t * .16 })
        if (joinCore) joinCore.rotation.z = t * .3
        if (joinMaterial) joinMaterial.color.setHex([0x9bdb98, 0x6fd9c1, 0xeec465, 0x91ace0, 0xe99aaf, 0xd9edab][input.current.interest % 6])
        joinParts.forEach((part, i) => { const angle = i * Math.PI / 6; const radius = .58 + (3 - input.current.phase) * .1; part.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0) })
        labelRefs.current.forEach((label, i) => { if (!label) return; projected.set(stations[i].position[0], .4, stations[i].position[2] + 2.15).project(camera); label.style.transform = 'translate(-50%,-50%) translate(' + ((projected.x * .5 + .5) * width) + 'px,' + ((-.5 * projected.y + .5) * height) + 'px)'; label.style.visibility = activeHome && projected.z < 1 && projected.z > -1 ? 'visible' : 'hidden' })
        renderer.render(scene, camera); css.render(cssScene, camera)
        if (!initialized) { initialized = true; setScreen(surface) }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('oec-join-progress', joinProgress)
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp)
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
      scene.traverse(child => { if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) { geometries.add(child.geometry); (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => materials.add(material)) } })
      centerpiece.dispose(); geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); renderer.dispose(); renderer.domElement.remove(); css.domElement.remove()
    }
  }, [router])

  return <div className={`spatial-workshop ${home ? 'is-home' : 'is-station'}`}>
    <div ref={world} className="spatial-world"/>
    <header className="spatial-header"><Link className="spatial-brand" href="/"><Image src="/brand/oec-badge-circle.png" alt="Oberlin Engineering Club" width={44} height={44} priority/><span>OBERLIN<small>ENGINEERING CLUB</small></span></Link><div><Link className="spatial-join" href="/get-involved" onClick={() => setMenu(false)}>Join the club <ArrowUpRight size={16}/></Link><button ref={menuTrigger} type="button" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} onClick={() => setMenu(value => !value)}>{menu ? <X size={21}/> : <Menu size={21}/>}</button></div></header>
    {home && <div className="spatial-intro"><p>Oberlin College</p><h1>Oberlin<br/>Engineering<br/>Club.</h1></div>}
    <nav className="station-labels" aria-label="Workshop stations" aria-hidden={!home}>{stations.map((station, index) => <Link key={station.href} href={station.href} tabIndex={home ? 0 : -1} ref={element => { labelRefs.current[index] = element }}><span>{String(index + 1).padStart(2, '0')}</span>{station.name}<ArrowUpRight size={13}/></Link>)}</nav>
    {!home && <Link className="spatial-back" href="/"><ArrowLeft size={16}/>Workshop</Link>}
    {menu && <nav ref={menuPanel} className="spatial-menu" aria-label="All pages">{[...stations.map(station => [station.name, station.href]), ...extraLinks].map(([name, href]) => <Link href={href} key={href} onClick={() => setMenu(false)}>{name}<ArrowUpRight size={16}/></Link>)}</nav>}
    <div className="spatial-tools"><button type="button" aria-label="Reset workshop view" title="Reset workshop view" onClick={() => controlsRef.current.reset()}><RotateCcw size={16}/></button><button type="button" aria-label={fullScreen ? 'Exit full screen' : 'Enter full screen'} title={fullScreen ? 'Exit full screen' : 'Enter full screen'} onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await world.current?.parentElement?.requestFullscreen() } catch { /* Fullscreen is optional in embedded browsers. */ } }}>{fullScreen ? <Minimize size={16}/> : <Maximize size={16}/>}</button></div>
    {screen && !home && createPortal(children, screen)}
    {failed && <div className="spatial-fallback"><h1>Oberlin Engineering Club</h1><p>The 3D workshop could not start on this device.</p><nav>{stations.map(station => <Link href={station.href} key={station.href}>{station.name}<ArrowUpRight size={16}/></Link>)}</nav>{!home && children}</div>}
  </div>
}
