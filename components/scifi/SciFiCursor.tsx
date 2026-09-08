'use client'

import React, { useEffect, useState } from 'react'

export function SciFiCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [targetPos, setTargetPos] = useState({ x: -100, y: -100 })
  const [isHovered, setIsHovered] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true)
      return
    }

    const onMouseMove = (e: MouseEvent) => {
      setTargetPos({ x: e.clientX, y: e.clientY })
    }

    const onMouseDown = () => setIsClicking(true)
    const onMouseUp = () => setIsClicking(false)

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target?.closest('a') ||
        target?.closest('button') ||
        target?.closest('input') ||
        target?.closest('.content-card') ||
        target?.closest('.cursor-pointer')
      ) {
        setIsHovered(true)
      } else {
        setIsHovered(false)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mouseover', onMouseOver)

    let animId: number
    const smoothFollow = () => {
      setPos(prev => ({
        x: prev.x + (targetPos.x - prev.x) * 0.28,
        y: prev.y + (targetPos.y - prev.y) * 0.28
      }))
      animId = requestAnimationFrame(smoothFollow)
    }
    animId = requestAnimationFrame(smoothFollow)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mouseover', onMouseOver)
    }
  }, [targetPos])

  if (isTouchDevice || pos.x < 0) return null

  return (
    <div
      className={`scifi-cursor-wrapper ${isHovered ? 'scifi-cursor-hover' : ''} ${isClicking ? 'scifi-cursor-click' : ''}`}
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      aria-hidden="true"
    >
      <div className="scifi-cursor-dot" />
      <div className="scifi-cursor-ring" />
      <div className="scifi-cursor-crosshair scifi-cursor-crosshair--h" />
      <div className="scifi-cursor-crosshair scifi-cursor-crosshair--v" />
    </div>
  )
}
