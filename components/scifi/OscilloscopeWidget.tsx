'use client'

import React, { useEffect, useRef, useState } from 'react'
import { soundFx } from './SciFiSoundSystem'
import { Activity, Sliders, Volume2, Waves } from 'lucide-react'

export function OscilloscopeWidget() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [waveType, setWaveType] = useState<'sine' | 'square' | 'triangle' | 'pulse'>('sine')
  const [frequency, setFrequency] = useState<number>(440)
  const [amplitude, setAmplitude] = useState<number>(60)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let width = (canvas.width = canvas.parentElement?.clientWidth || 400)
    let height = (canvas.height = 140)

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return
      width = canvas.width = canvas.parentElement.clientWidth || 400
      height = canvas.height = 140
    }
    window.addEventListener('resize', handleResize)

    let phase = 0

    const render = () => {
      ctx.fillStyle = '#060a0f'
      ctx.fillRect(0, 0, width, height)

      // Oscilloscope Phosphor Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 25) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += 25) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Center axis
      ctx.strokeStyle = 'rgba(255, 183, 3, 0.25)'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw Waveform
      phase += 0.045
      ctx.beginPath()
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2
      ctx.shadowColor = '#00f0ff'
      ctx.shadowBlur = 10

      const centerY = height / 2
      const amp = (amplitude / 100) * (height * 0.4)
      const freqFactor = (frequency / 200) * 0.05

      for (let x = 0; x < width; x++) {
        const t = x * freqFactor + phase
        let y = centerY

        if (waveType === 'sine') {
          y = centerY + Math.sin(t) * amp
        } else if (waveType === 'square') {
          y = centerY + (Math.sin(t) >= 0 ? 1 : -1) * amp
        } else if (waveType === 'triangle') {
          y = centerY + (Math.asin(Math.sin(t)) * (2 / Math.PI)) * amp
        } else if (waveType === 'pulse') {
          y = centerY + (Math.sin(t) > 0.6 ? 1.2 : -0.2) * amp
        }

        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.stroke()
      ctx.shadowBlur = 0

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [waveType, frequency, amplitude])

  const handleWaveSelect = (type: 'sine' | 'square' | 'triangle' | 'pulse') => {
    soundFx.playClick()
    setWaveType(type)
  }

  return (
    <div className="oscilloscope-widget">
      <div className="oscilloscope-head">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold tracking-wider text-cyan-300">
            RIG-01 // PHOSPHOR OSCILLOSCOPE
          </span>
        </div>
        <div className="flex gap-1">
          {(['sine', 'square', 'triangle', 'pulse'] as const).map(type => (
            <button
              key={type}
              className={`scope-mode-btn ${waveType === type ? 'scope-mode-btn--active' : ''}`}
              onClick={() => handleWaveSelect(type)}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="oscilloscope-screen">
        <canvas ref={canvasRef} className="oscilloscope-canvas" />
        <div className="scope-telemetry">
          <span>FREQ: {frequency} Hz</span>
          <span>AMP: {amplitude}%</span>
          <span>VPP: {(amplitude * 0.1).toFixed(2)} V</span>
        </div>
      </div>

      <div className="scope-controls">
        <label className="scope-slider-label">
          <span>FREQ [{frequency} Hz]</span>
          <input
            type="range"
            min="100"
            max="1200"
            step="10"
            value={frequency}
            onChange={e => setFrequency(Number(e.target.value))}
            className="scope-slider"
          />
        </label>
        <label className="scope-slider-label">
          <span>AMP [{amplitude}%]</span>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={amplitude}
            onChange={e => setAmplitude(Number(e.target.value))}
            className="scope-slider"
          />
        </label>
      </div>
    </div>
  )
}
