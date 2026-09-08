'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { soundFx } from './SciFiSoundSystem'
import { Wrench, Eye, Cpu, Compass, Sparkles, Layers, Shield } from 'lucide-react'

interface Hotspot {
  id: string
  label: string
  category: string
  spec: string
  x: number // percent
  y: number // percent
}

const HOTSPOTS: Hotspot[] = [
  {
    id: 'machining',
    label: 'Precision Machining & Cutters',
    category: 'MECHANICAL FABRICATION',
    spec: 'Angle Grinder, CNC Mill, Rotary Tooling & Steel Stock',
    x: 62,
    y: 48
  },
  {
    id: 'toolset',
    label: 'Rapid Prototyping Toolchest',
    category: 'HARDWARE RIG',
    spec: 'Socket Sets, Calipers, Torque Drivers & Fasteners',
    x: 28,
    y: 22
  },
  {
    id: 'safety',
    label: 'Makerspace Safety Protocol',
    category: 'LAB PROTOCOL',
    spec: 'ANSI Z87.1 Protective Eyewear & Extraction Venting',
    x: 38,
    y: 64
  },
  {
    id: 'electronics',
    label: 'Assembly & Wiring Workcell',
    category: 'ELECTRICAL WORKBENCH',
    spec: 'Soldering, Microcontroller Flashing & Bench Power',
    x: 75,
    y: 26
  }
]

export function WorkshopHeroDeck() {
  const [activeSpot, setActiveSpot] = useState<Hotspot>(HOTSPOTS[0])
  const [overlayMode, setOverlayMode] = useState<'blueprint' | 'photo' | 'schematic'>('photo')

  const handleSpotClick = (spot: Hotspot) => {
    soundFx.playClick()
    setActiveSpot(spot)
  }

  return (
    <div className="workshop-deck-container">
      {/* Aluminum Machined Bezel Frame */}
      <div className="workshop-deck-frame">
        {/* Top Telemetry Header */}
        <div className="workshop-deck-header">
          <div className="deck-header-left">
            <span className="deck-status-dot" />
            <span className="deck-tag">OEC WORKBENCH // MAKERSPACE RIG #01</span>
          </div>
          <div className="deck-mode-tabs">
            <button
              className={`deck-tab-btn ${overlayMode === 'photo' ? 'deck-tab-btn--active' : ''}`}
              onClick={() => {
                soundFx.playClick()
                setOverlayMode('photo')
              }}
            >
              REAL WORKBENCH
            </button>
            <button
              className={`deck-tab-btn ${overlayMode === 'blueprint' ? 'deck-tab-btn--active' : ''}`}
              onClick={() => {
                soundFx.playClick()
                setOverlayMode('blueprint')
              }}
            >
              CAD BLUEPRINT
            </button>
          </div>
        </div>

        {/* Visual Workbench Canvas Area */}
        <div className="workshop-image-viewport">
          <Image
            src="/brand/auth-panel.jpg"
            alt="Oberlin Engineering Club physical workbench with tools, grinder, and protective gear"
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            className={`workshop-main-photo ${overlayMode === 'blueprint' ? 'workshop-main-photo--blueprint' : ''}`}
            priority
          />

          {/* Blueprint Grid / Measurement Ruler Overlay */}
          <div className="blueprint-grid-overlay" aria-hidden="true">
            <div className="blueprint-crosshair blueprint-crosshair--tl" />
            <div className="blueprint-crosshair blueprint-crosshair--tr" />
            <div className="blueprint-crosshair blueprint-crosshair--bl" />
            <div className="blueprint-crosshair blueprint-crosshair--br" />
            <div className="blueprint-scale-ruler">
              <span>0.0mm</span>
              <span>150.0mm</span>
              <span>300.0mm</span>
              <span>450.0mm</span>
            </div>
          </div>

          {/* Official OEC Squirrel Seal Overlay Badge */}
          <div className="workshop-floating-emblem">
            <div className="emblem-ring-outer" />
            <Image
              src="/brand/oec-badge.png"
              alt="Oberlin Engineering Club Official Squirrel Emblem"
              width={86}
              height={86}
              className="emblem-squirrel-img"
            />
            <div className="emblem-label">
              <span>OBERLIN COLL</span>
              <small>EST. 1833</small>
            </div>
          </div>

          {/* Interactive Hardware Hotspots on Real Workbench */}
          {HOTSPOTS.map(spot => {
            const isSelected = spot.id === activeSpot.id
            return (
              <button
                key={spot.id}
                className={`hardware-hotspot-pin ${isSelected ? 'hardware-hotspot-pin--active' : ''}`}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                onClick={() => handleSpotClick(spot)}
                onMouseEnter={() => soundFx.playHover()}
                title={spot.label}
                aria-label={spot.label}
              >
                <span className="hotspot-pin-ring" />
                <span className="hotspot-pin-core" />
                <span className="hotspot-pin-tag">{spot.category.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>

        {/* Bottom Hardware Telemetry Bar */}
        <div className="workshop-dossier-bar">
          <div className="dossier-meta">
            <span className="dossier-cat-badge">{activeSpot.category}</span>
            <strong className="dossier-active-title">{activeSpot.label}</strong>
            <p className="dossier-active-desc">{activeSpot.spec}</p>
          </div>
          <div className="dossier-specs-chip">
            <span className="text-xs text-amber-400 font-mono font-bold">PHYSICAL HARDWARE // STUDENT LED</span>
            <span className="text-xs text-gray-400">Open to all majors & experience levels</span>
          </div>
        </div>
      </div>
    </div>
  )
}
