'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { createTabletSurface } from './TabletSurface'
import { createWorld, type Direction, type WorldState } from './worlds'
import { loadFont } from './geometry'
import { firstVisibleSceneAction } from './sceneActions'

type Props = { direction: Direction; view: string; paused: boolean; progress: number; active: boolean; reset: number; composition?: WorldState['composition']; onAction: (action: string) => void; onSurfaceReady: (surface: HTMLDivElement | null) => void }

export default function ConceptScene(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const input = useRef(props)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  useEffect(() => { input.current = props }, [props])
  useEffect(() => {
    const container = host.current!
    let disposed = false, animation = 0, renderer: THREE.WebGLRenderer | undefined, environment: THREE.WebGLRenderTarget | undefined, tablet: ReturnType<typeof createTabletSurface> | undefined
    const scene = new THREE.Scene(), pointer = new THREE.Vector2(), smoothPointer = new THREE.Vector2()
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 100)
    let mobile = false, nativeScroll = false, visible = true, time = 0, previous = performance.now(), greetAt = -100, lastReset = input.current.reset, lastActive = input.current.active, lastProgress = input.current.progress
    let cleanup = () => {}
    const disposeScene = () => {
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
      scene.traverse(object => {
        if (object instanceof THREE.InstancedMesh) object.dispose()
        if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)) }
      })
      const textures = new Set<THREE.Texture>()
      materials.forEach(material => { if (material instanceof THREE.MeshStandardMaterial && material.bumpMap) textures.add(material.bumpMap) })
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(texture => texture.dispose())
    }
    async function initialize() {
      let logo: THREE.Texture | undefined
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
        renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = props.direction === 'hall' ? .85 : .98
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = props.direction === 'workbench' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap
        renderer.domElement.setAttribute('aria-label', `${props.direction === 'workbench' ? 'Workshop machine' : props.direction === 'robot' ? 'Robot companion' : props.direction === 'machine' ? 'Engineering machine' : 'Invention hall'} 3D scene`)
        renderer.domElement.setAttribute('role', 'img')
        container.appendChild(renderer.domElement)
        const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer)
        environment = pmrem.fromScene(room, .04); scene.environment = environment.texture
        scene.environmentIntensity = props.direction === 'workbench' ? .55 : props.direction === 'hall' ? .45 : .65
        room.dispose(); pmrem.dispose()
        scene.add(new THREE.HemisphereLight(0xf4f6ff, 0x292328, props.direction === 'workbench' ? .18 : props.direction === 'hall' ? 1.3 : .7))
        const key = new THREE.DirectionalLight(props.direction === 'workbench' ? 0xffffff : 0xffead5, props.direction === 'workbench' ? 2 : 2.8); key.position.set(-6, 9, 8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048)
        Object.assign(key.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 }); key.shadow.normalBias = .025; scene.add(key)
        const fill = new THREE.DirectionalLight(props.direction === 'workbench' ? 0xeaf0ed : 0x87cfff, props.direction === 'workbench' ? .5 : 1.5); fill.position.set(5, 3, -4); scene.add(fill)
        if (props.direction === 'workbench') {
          key.position.set(-5, 7, 5); key.intensity = 3.1
          fill.position.set(5, 2, 3); fill.intensity = .18
          Object.assign(key.shadow.camera, { left: -11, right: 11, top: 7, bottom: -7 })
          key.shadow.normalBias = .012; key.shadow.bias = -.00015
        }
        logo = await new THREE.TextureLoader().loadAsync('/brand/oec-badge-circle.png'); logo.colorSpace = THREE.SRGBColorSpace
        const font = props.direction === 'robot' ? undefined : props.direction === 'workbench' ? await new FontLoader().loadAsync('/brand/workbench/barlow-heading.typeface.json') : await loadFont()
        if (disposed) { logo.dispose(); return }
        const world = createWorld(props.direction, scene, logo, font)
        if (world.screen) {
          tablet = createTabletSurface(container, world.screen)
        }
        const touchInput = window.matchMedia('(any-pointer: coarse)')
        const resize = () => {
          const { width, height } = container.getBoundingClientRect(); if (!width || !height) return
          mobile = width < 760; nativeScroll = props.direction === 'workbench' || props.direction === 'machine' || mobile || touchInput.matches
          camera.aspect = width / height; camera.updateProjectionMatrix(); renderer!.setSize(width, height); tablet?.resize(width, height)
          const frame = world.frame(mobile, camera.aspect); camera.position.set(...frame.position); camera.lookAt(...frame.target)
        }
        const observer = new ResizeObserver(resize); observer.observe(container); resize()
        touchInput.addEventListener('change', resize)
        const visibility = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false }); visibility.observe(container)
        const raycaster = new THREE.Raycaster()
        const actionAt = (event: PointerEvent) => {
          const bounds = container.getBoundingClientRect()
          raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera)
          const hits = raycaster.intersectObjects(world.root.children, true)
          return props.direction === 'workbench' ? firstVisibleSceneAction(hits) : hits.find(hit => hit.object.userData.action)?.object.userData.action as string | undefined
        }
        const move = (event: PointerEvent) => {
          if ((event.target as Element).closest('.robot-dom-world')) return
          const bounds = container.getBoundingClientRect(); pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
          renderer!.domElement.style.cursor = actionAt(event) ? 'pointer' : 'default'
        }
        const leave = () => pointer.set(0, 0)
        const click = (event: PointerEvent) => {
          if ((event.target as Element).closest('.robot-dom-world')) return
          const action = actionAt(event)
          if (action === 'greet') greetAt = time
          if (action) input.current.onAction(action)
        }
        const lost = (event: Event) => { event.preventDefault(); setStatus('failed'); input.current.onSurfaceReady(null) }
        container.addEventListener('pointermove', move); container.addEventListener('pointerleave', leave); container.addEventListener('pointerup', click)
        renderer.domElement.addEventListener('webglcontextlost', lost)
        cleanup = () => { observer.disconnect(); touchInput.removeEventListener('change', resize); visibility.disconnect(); container.removeEventListener('pointermove', move); container.removeEventListener('pointerleave', leave); container.removeEventListener('pointerup', click); renderer?.domElement.removeEventListener('webglcontextlost', lost); logo?.dispose() }
        const targetPosition = new THREE.Vector3(), targetLook = new THREE.Vector3()
        let frameCount = 0
        const render = (now: number) => {
          if (disposed) return
          const delta = Math.min((now - previous) / 1000, .05); previous = now
          if (!visible || document.hidden) { animation = requestAnimationFrame(render); return }
          if (!input.current.paused && !document.hidden) time += delta
          if (lastReset !== input.current.reset) { time = 0; pointer.set(0, 0); smoothPointer.set(0, 0); greetAt = -100; lastReset = input.current.reset }
          if (lastActive !== input.current.active) { greetAt = time; lastActive = input.current.active }
          if (lastProgress !== input.current.progress) { greetAt = time; lastProgress = input.current.progress }
          const readingOnTouch = nativeScroll && input.current.view !== 'home'
          smoothPointer.lerp(input.current.paused || readingOnTouch ? new THREE.Vector2() : pointer, .045)
          const frame = world.frame(mobile, camera.aspect); targetPosition.set(...frame.position); targetLook.set(...frame.target)
          if (!readingOnTouch) {
            targetPosition.x += smoothPointer.x * (props.direction === 'hall' ? .3 : .14)
            targetPosition.y += smoothPointer.y * .08
          }
          if (props.direction === 'hall' && input.current.progress > 0) { targetPosition.x += 1.8; targetPosition.z -= 2.3 }
          if (readingOnTouch) camera.position.copy(targetPosition)
          else camera.position.lerp(targetPosition, .04)
          camera.lookAt(targetLook)
          world.update({ time, delta, paused: input.current.paused, view: input.current.view, pointer: smoothPointer, greeting: time - greetAt, progress: input.current.progress, active: input.current.active, mobile, aspect: camera.aspect, composition: input.current.composition })
          renderer!.render(scene, camera)
          tablet?.render(camera, nativeScroll)
          if (++frameCount === 2) {
            container.dataset.ready = 'true'; setStatus('ready')
            if (tablet) input.current.onSurfaceReady(tablet.element)
          }
          animation = requestAnimationFrame(render)
        }
        animation = requestAnimationFrame(render)
      } catch (error) {
        if (!disposed) { console.error('Concept scene failed to load', error); setStatus('failed'); input.current.onSurfaceReady(null) }
        logo?.dispose()
      }
    }
    void initialize()
    return () => { disposed = true; cancelAnimationFrame(animation); cleanup(); disposeScene(); environment?.dispose(); renderer?.dispose(); renderer?.domElement.remove(); tablet?.dispose() }
  }, [props.direction])
  return <div className="concept-scene" ref={host} data-status={status}>
    {status === 'loading' && <div className="concept-loading" role="status">Oberlin Engineering Club<span>Loading scene</span></div>}
    {status === 'failed' && <div className="concept-loading" role="status">Oberlin Engineering Club<span>3D is unavailable on this device. Projects and joining are still available.</span></div>}
  </div>
}
