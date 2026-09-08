'use client'

import React, { useEffect, useRef, useState } from 'react'
import { soundFx } from './SciFiSoundSystem'
import { Box, Layers, Rotate3d, Zap, Eye, Cpu, Compass } from 'lucide-react'

interface CADModel {
  id: string
  name: string
  code: string
  category: string
  subsystem: string
  specs: { weight: string; power: string; cpu: string; sensors: string }
  generateGeometry: (scale: number) => {
    vertices: { x: number; y: number; z: number }[]
    edges: [number, number][]
  }
}

const CAD_MODELS: CADModel[] = [
  {
    id: 'rover',
    name: 'ROV-04 Autonomous Rover',
    code: 'CAD-SYS-701',
    category: 'Robotics & Mechanical',
    subsystem: 'Quad-Wheel Suspension & LiDAR Rig',
    specs: { weight: '8.4 kg', power: '24V LiPo 12Ah', cpu: 'NVIDIA Jetson Orin Nano', sensors: 'Stereo Vision + RTK GPS' },
    generateGeometry: (s: number) => {
      // Chassis box + wheels
      const vertices = [
        // Chassis Box
        { x: -1.2 * s, y: -0.5 * s, z: -0.8 * s }, { x: 1.2 * s, y: -0.5 * s, z: -0.8 * s },
        { x: 1.2 * s, y: 0.5 * s, z: -0.8 * s }, { x: -1.2 * s, y: 0.5 * s, z: -0.8 * s },
        { x: -1.2 * s, y: -0.5 * s, z: 0.8 * s }, { x: 1.2 * s, y: -0.5 * s, z: 0.8 * s },
        { x: 1.2 * s, y: 0.5 * s, z: 0.8 * s }, { x: -1.2 * s, y: 0.5 * s, z: 0.8 * s },
        // Top Mast
        { x: 0, y: 1.3 * s, z: 0 },
        // 4 Wheels
        { x: -1.5 * s, y: -0.9 * s, z: -1.1 * s }, { x: 1.5 * s, y: -0.9 * s, z: -1.1 * s },
        { x: -1.5 * s, y: -0.9 * s, z: 1.1 * s }, { x: 1.5 * s, y: -0.9 * s, z: 1.1 * s }
      ]
      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 0], // Bottom
        [4, 5], [5, 6], [6, 7], [7, 4], // Top
        [0, 4], [1, 5], [2, 6], [3, 7], // Struts
        [2, 8], [3, 8], [6, 8], [7, 8], // Mast
        [0, 9], [1, 10], [4, 11], [5, 12] // Wheels
      ]
      return { vertices, edges }
    }
  },
  {
    id: 'cubesat',
    name: 'SAT-8 Solar Telemetry CubeSat',
    code: 'CAD-SYS-808',
    category: 'Aerospace & Embedded',
    subsystem: 'Deployable Solar Arrays & RF Antenna',
    specs: { weight: '1.33 kg (1U)', power: '15W Solar GaInP', cpu: 'STM32H7 Dual-Core', sensors: 'Magnetometer + IMU 9-DOF' },
    generateGeometry: (s: number) => {
      // 1U Cube + 2 Folded Solar Panels
      const vertices = [
        // 1U Core Cube
        { x: -0.8 * s, y: -0.8 * s, z: -0.8 * s }, { x: 0.8 * s, y: -0.8 * s, z: -0.8 * s },
        { x: 0.8 * s, y: 0.8 * s, z: -0.8 * s }, { x: -0.8 * s, y: 0.8 * s, z: -0.8 * s },
        { x: -0.8 * s, y: -0.8 * s, z: 0.8 * s }, { x: 0.8 * s, y: -0.8 * s, z: 0.8 * s },
        { x: 0.8 * s, y: 0.8 * s, z: 0.8 * s }, { x: -0.8 * s, y: 0.8 * s, z: 0.8 * s },
        // Left Solar Wing
        { x: -2.0 * s, y: -0.7 * s, z: 0 }, { x: -2.0 * s, y: 0.7 * s, z: 0 },
        // Right Solar Wing
        { x: 2.0 * s, y: -0.7 * s, z: 0 }, { x: 2.0 * s, y: 0.7 * s, z: 0 },
        // Antenna Mast
        { x: 0, y: 1.6 * s, z: 0 }
      ]
      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
        [0, 6], [1, 7], // Cross braces
        [3, 9], [0, 8], [8, 9], // Left Wing
        [2, 11], [1, 10], [10, 11], // Right Wing
        [2, 12], [3, 12], [6, 12], [7, 12] // Antenna
      ]
      return { vertices, edges }
    }
  },
  {
    id: 'hexapod',
    name: 'HEX-2 Bio-Robotic Hexapod',
    code: 'CAD-SYS-305',
    category: 'Autonomous Controls',
    subsystem: '18-DOF Inverse Kinematics Chassis',
    specs: { weight: '3.2 kg', power: '12V 5000mAh', cpu: 'Raspberry Pi 5 + Teensy 4.1', sensors: 'ToF Depth Camera + Load Cells' },
    generateGeometry: (s: number) => {
      // Hexagon Core + 6 Legs
      const vertices: { x: number; y: number; z: number }[] = []
      const edges: [number, number][] = []

      // Central Hexagon
      for (let i = 0; i < 6; i++) {
        const theta = (i * Math.PI) / 3
        vertices.push({ x: Math.cos(theta) * 0.9 * s, y: 0.3 * s, z: Math.sin(theta) * 0.9 * s })
        vertices.push({ x: Math.cos(theta) * 0.9 * s, y: -0.3 * s, z: Math.sin(theta) * 0.9 * s })
      }
      for (let i = 0; i < 6; i++) {
        const topIdx = i * 2
        const botIdx = i * 2 + 1
        const nextTop = ((i + 1) % 6) * 2
        const nextBot = ((i + 1) % 6) * 2 + 1
        edges.push([topIdx, botIdx], [topIdx, nextTop], [botIdx, nextBot])

        // Add 6 Leg joints
        const legJointIdx = vertices.length
        const legTipIdx = vertices.length + 1
        const theta = (i * Math.PI) / 3
        vertices.push({ x: Math.cos(theta) * 1.5 * s, y: 0.6 * s, z: Math.sin(theta) * 1.5 * s })
        vertices.push({ x: Math.cos(theta) * 2.0 * s, y: -0.9 * s, z: Math.sin(theta) * 2.0 * s })
        edges.push([topIdx, legJointIdx], [legJointIdx, legTipIdx])
      }

      return { vertices, edges }
    }
  }
]

export function SciFiBlueprintViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [activeModelId, setActiveModelId] = useState<string>('rover')
  const [renderMode, setRenderMode] = useState<'laser' | 'xray' | 'holo'>('laser')
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [isPowerSurge, setIsPowerSurge] = useState<boolean>(false)

  const rotRef = useRef({ x: 0.3, y: 0.5, targetX: 0.3, targetY: 0.5, isDown: false, prevX: 0, prevY: 0 })
  const activeModel = CAD_MODELS.find(m => m.id === activeModelId) || CAD_MODELS[0]

  const triggerPowerSurge = () => {
    soundFx.playPowerUp()
    setIsPowerSurge(true)
    setTimeout(() => setIsPowerSurge(false), 800)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let width = (canvas.width = canvas.parentElement?.clientWidth || 550)
    let height = (canvas.height = 420)

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return
      width = canvas.width = canvas.parentElement.clientWidth || 550
      height = canvas.height = 420
    }
    window.addEventListener('resize', handleResize)

    const scale = Math.min(width, height) * 0.28
    const { vertices, edges } = activeModel.generateGeometry(scale)

    const onMouseDown = (e: MouseEvent) => {
      rotRef.current.isDown = true
      rotRef.current.prevX = e.clientX
      rotRef.current.prevY = e.clientY
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!rotRef.current.isDown) return
      const dx = e.clientX - rotRef.current.prevX
      const dy = e.clientY - rotRef.current.prevY
      rotRef.current.targetY += dx * 0.012
      rotRef.current.targetX += dy * 0.012
      rotRef.current.prevX = e.clientX
      rotRef.current.prevY = e.clientY
    }
    const onMouseUp = () => {
      rotRef.current.isDown = false
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    let angle = 0

    const render = () => {
      if (autoRotate && !rotRef.current.isDown) {
        angle += 0.009
        rotRef.current.targetY += 0.006
      }

      rotRef.current.x += (rotRef.current.targetX - rotRef.current.x) * 0.08
      rotRef.current.y += (rotRef.current.targetY - rotRef.current.y) * 0.08

      ctx.clearRect(0, 0, width, height)

      // Background CAD grid
      ctx.strokeStyle = 'rgba(255, 183, 3, 0.05)'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Rotate vertices
      const cosX = Math.cos(rotRef.current.x), sinX = Math.sin(rotRef.current.x)
      const cosY = Math.cos(rotRef.current.y), sinY = Math.sin(rotRef.current.y)
      const cx = width / 2, cy = height / 2

      const projected = vertices.map(v => {
        const x1 = v.x * cosY + v.z * sinY
        const z1 = -v.x * sinY + v.z * cosY
        const y2 = v.y * cosX - z1 * sinX
        const z2 = v.y * sinX + z1 * cosX
        const fov = 400
        const scaleFactor = fov / (fov + z2)
        return {
          x: cx + x1 * scaleFactor,
          y: cy + y2 * scaleFactor,
          z: z2,
          scale: scaleFactor
        }
      })

      // Draw Projected Edges
      edges.forEach(([i, j]) => {
        if (!projected[i] || !projected[j]) return
        const p1 = projected[i]
        const p2 = projected[j]

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)

        if (renderMode === 'laser') {
          ctx.strokeStyle = isPowerSurge ? '#ffffff' : '#ff2a3b'
          ctx.lineWidth = isPowerSurge ? 3 : 1.8
          ctx.shadowColor = '#ff2a3b'
          ctx.shadowBlur = isPowerSurge ? 18 : 6
        } else if (renderMode === 'xray') {
          ctx.strokeStyle = '#00f0ff'
          ctx.lineWidth = 1.4
          ctx.shadowColor = '#00f0ff'
          ctx.shadowBlur = 4
        } else {
          // Holo mode
          ctx.strokeStyle = '#ffb703'
          ctx.lineWidth = 1.6
          ctx.shadowColor = '#ffb703'
          ctx.shadowBlur = 8
        }

        ctx.stroke()
        ctx.shadowBlur = 0
      })

      // Draw Joint Nodes / Laser Pins
      projected.forEach(p => {
        ctx.fillStyle = renderMode === 'xray' ? '#00f0ff' : '#ffb703'
        ctx.beginPath()
        ctx.arc(p.x, p.y, (isPowerSurge ? 4.5 : 2.5) * p.scale, 0, Math.PI * 2)
        ctx.fill()
      })

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [activeModelId, renderMode, autoRotate, isPowerSurge])

  return (
    <div className="scifi-cad-sandbox">
      <div className="cad-sandbox-header">
        <div>
          <span className="scifi-badge">[ INTERACTIVE CAD WORKBENCH // OEC LABS ]</span>
          <h3 className="cad-sandbox-title">{activeModel.name}</h3>
          <p className="cad-sandbox-sub">{activeModel.code} · {activeModel.category} · {activeModel.subsystem}</p>
        </div>

        {/* Model Selection Buttons */}
        <div className="cad-model-picker">
          {CAD_MODELS.map(m => (
            <button
              key={m.id}
              className={`cad-model-btn ${m.id === activeModelId ? 'cad-model-btn--active' : ''}`}
              onClick={() => {
                soundFx.playClick()
                setActiveModelId(m.id)
              }}
              onMouseEnter={() => soundFx.playHover()}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{m.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cad-sandbox-body">
        {/* Interactive 3D Canvas */}
        <div className="cad-canvas-wrapper">
          <canvas ref={canvasRef} className="cad-canvas" />

          {/* HUD Overlay Indicators */}
          <div className="cad-canvas-hud">
            <span className="cad-hud-tag">
              <Rotate3d className="w-3.5 h-3.5" /> DRAG 360° TO ROTATE
            </span>
            <span className="cad-hud-tag cad-hud-tag--right">
              MODE: {renderMode.toUpperCase()} // 60 FPS
            </span>
          </div>

          {/* Workbench Controls Toolbar */}
          <div className="cad-toolbar">
            <button
              className={`cad-tool-btn ${renderMode === 'laser' ? 'cad-tool-btn--active' : ''}`}
              onClick={() => {
                soundFx.playClick()
                setRenderMode('laser')
              }}
              title="Laser Crimson Wireframe"
            >
              <Layers className="w-3.5 h-3.5" /> LASER RED
            </button>
            <button
              className={`cad-tool-btn ${renderMode === 'xray' ? 'cad-tool-btn--active' : ''}`}
              onClick={() => {
                soundFx.playClick()
                setRenderMode('xray')
              }}
              title="X-Ray Photon Cyan"
            >
              <Eye className="w-3.5 h-3.5" /> X-RAY CYAN
            </button>
            <button
              className={`cad-tool-btn ${renderMode === 'holo' ? 'cad-tool-btn--active' : ''}`}
              onClick={() => {
                soundFx.playClick()
                setRenderMode('holo')
              }}
              title="Quantum Hologram Gold"
            >
              <Cpu className="w-3.5 h-3.5" /> HOLO GOLD
            </button>
            <button
              className="cad-tool-btn cad-tool-btn--surge"
              onClick={triggerPowerSurge}
              title="Trigger Power Grid Pulse"
            >
              <Zap className="w-3.5 h-3.5" /> POWER SURGE
            </button>
          </div>
        </div>

        {/* Live Specs & Telemetry Readout */}
        <div className="cad-specs-panel">
          <div className="specs-panel-head">
            <span className="scifi-badge scifi-badge--gold">[ CAD HARDWARE TELEMETRY ]</span>
            <h4>System Architecture</h4>
          </div>

          <div className="specs-items">
            <div className="spec-item">
              <span className="spec-name">PAYLOAD MASS</span>
              <strong className="spec-stat">{activeModel.specs.weight}</strong>
            </div>
            <div className="spec-item">
              <span className="spec-name">POWER GRID</span>
              <strong className="spec-stat">{activeModel.specs.power}</strong>
            </div>
            <div className="spec-item">
              <span className="spec-name">COMPUTE CORE</span>
              <strong className="spec-stat">{activeModel.specs.cpu}</strong>
            </div>
            <div className="spec-item">
              <span className="spec-name">SENSOR ARRAY</span>
              <strong className="spec-stat">{activeModel.specs.sensors}</strong>
            </div>
          </div>

          <div className="specs-status-box">
            <div className="flex items-center gap-2">
              <span className="hud-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-green-400">
                FABRICATION STATUS: PROTOTYPE ACTIVE
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Engineered by Oberlin student teams in the OEC rapid prototyping lab.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
