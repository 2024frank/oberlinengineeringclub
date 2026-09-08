'use client'

import React, { useEffect, useRef, useState } from 'react'

interface Point3D {
  x: number
  y: number
  z: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseAlpha: number
  color: string
}

export function SciFiCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stats, setStats] = useState({ fps: 60, particles: 120, latency: '4ms' })
  const mouseRef = useRef({ x: -1000, y: -1000, isDown: false, prevX: 0, prevY: 0, rotX: 0.2, rotY: 0.4, targetRotX: 0.2, targetRotY: 0.4 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth)
    let height = (canvas.height = canvas.parentElement?.clientHeight || 650)

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return
      width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth
      height = canvas.height = canvas.parentElement.clientHeight || 650
    }
    window.addEventListener('resize', handleResize)

    // Generate 3D Polyhedron Vertices (Truncated Icosahedron / Geodesic Sphere)
    const phi = (1 + Math.sqrt(5)) / 2
    const baseVertices: Point3D[] = [
      { x: -1, y: phi, z: 0 }, { x: 1, y: phi, z: 0 }, { x: -1, y: -phi, z: 0 }, { x: 1, y: -phi, z: 0 },
      { x: 0, y: -1, z: phi }, { x: 0, y: 1, z: phi }, { x: 0, y: -1, z: -phi }, { x: 0, y: 1, z: -phi },
      { x: phi, y: 0, z: -1 }, { x: phi, y: 0, z: 1 }, { x: -phi, y: 0, z: -1 }, { x: -phi, y: 0, z: 1 }
    ]

    // Normalize and scale 3D vertices
    const sphereRadius = Math.min(width, height) * 0.22
    const vertices: Point3D[] = baseVertices.map(v => {
      const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
      return {
        x: (v.x / len) * sphereRadius,
        y: (v.y / len) * sphereRadius,
        z: (v.z / len) * sphereRadius
      }
    })

    // Edges connecting vertices with distance threshold
    const edges: [number, number][] = []
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const dx = vertices[i].x - vertices[j].x
        const dy = vertices[i].y - vertices[j].y
        const dz = vertices[i].z - vertices[j].z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < sphereRadius * 1.15) {
          edges.push([i, j])
        }
      }
    }

    // Generate background particle constellation
    const numParticles = Math.min(Math.floor(width / 14), 130)
    const particles: Particle[] = []
    const colors = ['#ff2a3b', '#ffb703', '#00f0ff', '#ffffff', '#e5a93b']

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65,
        radius: Math.random() * 2 + 1,
        baseAlpha: Math.random() * 0.5 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]
      })
    }

    // Mouse Tracking
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mouseRef.current.x = x
      mouseRef.current.y = y

      if (mouseRef.current.isDown) {
        const dx = x - mouseRef.current.prevX
        const dy = y - mouseRef.current.prevY
        mouseRef.current.targetRotY += dx * 0.008
        mouseRef.current.targetRotX += dy * 0.008
        mouseRef.current.prevX = x
        mouseRef.current.prevY = y
      } else {
        // Subtle tilt based on position
        const centerX = width / 2
        const centerY = height / 2
        mouseRef.current.targetRotY = ((x - centerX) / centerX) * 0.6
        mouseRef.current.targetRotX = -((y - centerY) / centerY) * 0.6
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      mouseRef.current.isDown = true
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.prevX = e.clientX - rect.left
      mouseRef.current.prevY = e.clientY - rect.top
    }

    const onMouseUp = () => {
      mouseRef.current.isDown = false
    }

    const onMouseLeave = () => {
      mouseRef.current.x = -1000
      mouseRef.current.y = -1000
      mouseRef.current.isDown = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseleave', onMouseLeave)

    let lastTime = performance.now()
    let frameCount = 0
    let lastFpsUpdate = performance.now()
    let angle = 0

    // Animation Loop
    const render = (time: number) => {
      frameCount++
      if (time - lastFpsUpdate > 1000) {
        setStats({
          fps: Math.round((frameCount * 1000) / (time - lastFpsUpdate)),
          particles: numParticles,
          latency: `${Math.round(time - lastTime)}ms`
        })
        frameCount = 0
        lastFpsUpdate = time
      }
      lastTime = time

      ctx.clearRect(0, 0, width, height)

      // 1. Draw subtle background cyber grid
      ctx.strokeStyle = 'rgba(255, 183, 3, 0.04)'
      ctx.lineWidth = 1
      const gridSize = 40
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // 2. Update and draw particles
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        // Wrap around bounds
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        // Mouse interaction (repel/attract)
        if (mx > 0 && my > 0) {
          const dx = p.x - mx
          const dy = p.y - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            const force = (140 - dist) / 140
            p.x += (dx / dist) * force * 3
            p.y += (dy / dist) * force * 3
          }
        }

        ctx.fillStyle = p.color
        ctx.globalAlpha = p.baseAlpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 90) {
            ctx.strokeStyle = p.color
            ctx.globalAlpha = (1 - dist / 90) * 0.22
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
      }

      // 3. Render 3D CAD Rotating Core (Positioned at right/center for split hero)
      const coreCenterX = width > 900 ? width * 0.76 : width * 0.5
      const coreCenterY = height * 0.5

      // Smooth rotation interpolation
      angle += 0.007
      mouseRef.current.rotX += (mouseRef.current.targetRotX - mouseRef.current.rotX) * 0.06
      mouseRef.current.rotY += (mouseRef.current.targetRotY - mouseRef.current.rotY) * 0.06

      const rx = mouseRef.current.rotX + Math.sin(angle * 0.5) * 0.2
      const ry = mouseRef.current.rotY + angle

      // 3D rotation matrix calculation
      const cosX = Math.cos(rx), sinX = Math.sin(rx)
      const cosY = Math.cos(ry), sinY = Math.sin(ry)

      const projected = vertices.map(v => {
        // Rotate around Y
        const x1 = v.x * cosY + v.z * sinY
        const z1 = -v.x * sinY + v.z * cosY
        // Rotate around X
        const y2 = v.y * cosX - z1 * sinX
        const z2 = v.y * sinX + z1 * cosX

        // Perspective projection
        const fov = 450
        const scale = fov / (fov + z2)
        return {
          x: coreCenterX + x1 * scale,
          y: coreCenterY + y2 * scale,
          z: z2,
          scale
        }
      })

      // Draw Orbiting Rings / Holographic HUD Gimbal
      ctx.save()
      ctx.translate(coreCenterX, coreCenterY)
      ctx.strokeStyle = 'rgba(255, 42, 66, 0.35)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 12])
      ctx.beginPath()
      ctx.arc(0, 0, sphereRadius * 1.35, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(255, 183, 3, 0.4)'
      ctx.setLineDash([4, 8])
      ctx.beginPath()
      ctx.arc(0, 0, sphereRadius * 1.55, -angle, Math.PI * 1.5 - angle)
      ctx.stroke()
      ctx.restore()

      // Draw 3D Polyhedron Edges
      ctx.setLineDash([])
      edges.forEach(([i, j]) => {
        const p1 = projected[i]
        const p2 = projected[j]
        const avgZ = (p1.z + p2.z) / 2
        const alpha = Math.max(0.15, (avgZ + sphereRadius) / (sphereRadius * 2))

        const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
        gradient.addColorStop(0, `rgba(255, 42, 66, ${alpha * 0.85})`)
        gradient.addColorStop(0.5, `rgba(255, 183, 3, ${alpha * 0.95})`)
        gradient.addColorStop(1, `rgba(0, 240, 255, ${alpha * 0.85})`)

        ctx.strokeStyle = gradient
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      })

      // Draw Polyhedron Vertices / Glowing Laser Nodes
      projected.forEach(p => {
        const alpha = Math.max(0.3, (p.z + sphereRadius) / (sphereRadius * 2))
        ctx.fillStyle = '#ffb703'
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3.5 * p.scale, 0, Math.PI * 2)
        ctx.fill()

        // Outer glow
        ctx.strokeStyle = '#00f0ff'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(p.x, p.y, 6.5 * p.scale, 0, Math.PI * 2)
        ctx.stroke()
      })

      ctx.globalAlpha = 1.0
      animationId = requestAnimationFrame(render)
    }

    animationId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <div className={`scifi-canvas-container ${className}`}>
      <canvas ref={canvasRef} className="scifi-canvas" />
      {/* Sci-Fi HUD Telemetry Corner Badges */}
      <div className="scifi-canvas-hud">
        <div className="hud-badge hud-badge--left">
          <span className="hud-pulse" />
          <span className="hud-text">CORE CAD MATRIX // OEC-v2.5</span>
        </div>
        <div className="hud-badge hud-badge--right">
          <span className="hud-text">LAT 41.2929°N // LON 82.2175°W [OBERLIN]</span>
        </div>
      </div>
    </div>
  )
}
