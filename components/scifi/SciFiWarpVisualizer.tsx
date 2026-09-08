'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { soundFx } from './SciFiSoundSystem'
import { Orbit, Compass, Zap, Sparkles } from 'lucide-react'

interface PartnerNode {
  id: string
  name: string
  code: string
  city: string
  focus: string
  keyMajors: string[]
  specs: {
    duration: string
    gpaTarget: string
    dualDegree: string
    keyAdvantage: string
  }
  coord: { x: number; y: number }
}

const PARTNER_NODES: PartnerNode[] = [
  {
    id: 'caltech',
    name: 'California Institute of Technology',
    code: 'CIT-01',
    city: 'Pasadena, CA',
    focus: 'Aerospace, Quantum Physics, Autonomous Propulsion & Applied Physics',
    keyMajors: ['Aerospace Engineering', 'Mechanical', 'Applied Physics', 'Electrical'],
    specs: {
      duration: '3 Years Oberlin + 2 Years Caltech',
      gpaTarget: '3.7+ Competitive Sequence',
      dualDegree: 'BA (Oberlin) + BS (Caltech)',
      keyAdvantage: 'Direct JPL research pipelines & elite faculty mentorship'
    },
    coord: { x: 18, y: 35 }
  },
  {
    id: 'columbia',
    name: 'Columbia University',
    code: 'CU-02',
    city: 'New York, NY',
    focus: 'Biomedical, Financial Engineering, Computer Engineering & Robotics',
    keyMajors: ['Biomedical Engineering', 'Computer Engineering', 'Civil & Mechanics', 'Operations Research'],
    specs: {
      duration: '3 Years Oberlin + 2 Years Columbia',
      gpaTarget: '3.3+ (Guaranteed Pathway criteria)',
      dualDegree: 'BA (Oberlin) + BS (Columbia Fu Foundation)',
      keyAdvantage: 'Global industry immersion in Manhattan & massive alumni network'
    },
    coord: { x: 82, y: 28 }
  },
  {
    id: 'washu',
    name: 'Washington University in St. Louis',
    code: 'WUSTL-03',
    city: 'St. Louis, MO',
    focus: 'Materials Science, Systems Engineering & Clean Energy Innovation',
    keyMajors: ['Systems Science & Engineering', 'Chemical Engineering', 'Mechanical', 'Computer Science'],
    specs: {
      duration: '3 Years Oberlin + 2 Years WashU (or 3-3 with Master\'s)',
      gpaTarget: '3.25+ Preferred Sequence',
      dualDegree: 'BA (Oberlin) + BS/MS (WashU McKelvey)',
      keyAdvantage: 'Generous dual-degree financial assistance & optional Master\'s year'
    },
    coord: { x: 48, y: 72 }
  },
  {
    id: 'cwru',
    name: 'Case Western Reserve University',
    code: 'CWRU-04',
    city: 'Cleveland, OH',
    focus: 'Biomedical Devices, Polymeric Materials & Precision Advanced Manufacturing',
    keyMajors: ['Biomedical Engineering', 'Materials Science', 'Polymer Engineering', 'Electrical'],
    specs: {
      duration: '3 Years Oberlin + 2 Years Case Western',
      gpaTarget: '3.0+ Solid Baseline',
      dualDegree: 'BA (Oberlin) + BS (Case School of Engineering)',
      keyAdvantage: 'Proximity to Oberlin (35 mi) & world-class Cleveland Clinic medical engineering'
    },
    coord: { x: 68, y: 48 }
  }
]

export function SciFiWarpVisualizer() {
  const [selectedId, setSelectedId] = useState<string>('caltech')
  const [warpActive, setWarpActive] = useState<boolean>(false)

  const selectedNode = PARTNER_NODES.find(n => n.id === selectedId) || PARTNER_NODES[0]

  const handleSelect = (id: string) => {
    soundFx.playClick()
    setSelectedId(id)
  }

  const triggerWarp = () => {
    soundFx.playWarp()
    setWarpActive(true)
    setTimeout(() => setWarpActive(false), 900)
  }

  return (
    <div className={`scifi-warp-container ${warpActive ? 'scifi-warp-active' : ''}`}>
      <div className="warp-hud-header">
        <div>
          <span className="scifi-badge">[ ORBITAL TRAJECTORY MAP // 3-2 DUAL-DEGREE ]</span>
          <h3 className="warp-hud-title">Select Engineering Academy Node</h3>
        </div>
        <button
          className="warp-ignite-btn"
          onClick={triggerWarp}
          title="Simulate Orbital Warp Trajectory"
        >
          <Zap className="w-4 h-4" />
          <span>SIMULATE WARP VECTOR</span>
        </button>
      </div>

      <div className="warp-grid-layout">
        {/* Orbital Trajectory Radar Canvas / SVG Map */}
        <div className="warp-radar-panel">
          <svg className="warp-radar-svg" viewBox="0 0 100 100">
            {/* Concentric Radar Rings */}
            <circle cx="50" cy="50" r="45" className="radar-circle" />
            <circle cx="50" cy="50" r="32" className="radar-circle radar-circle--mid" />
            <circle cx="50" cy="50" r="18" className="radar-circle radar-circle--inner" />
            <line x1="5" y1="50" x2="95" y2="50" className="radar-axis" />
            <line x1="50" y1="5" x2="50" y2="95" className="radar-axis" />

            {/* Central Node: Oberlin College Base Command */}
            <g className="radar-base-node">
              <circle cx="50" cy="50" r="5" className="base-node-pulse" />
              <circle cx="50" cy="50" r="3.2" className="base-node-core" />
              <text x="50" y="58" textAnchor="middle" className="base-node-label">
                OBERLIN [OB-01]
              </text>
            </g>

            {/* Trajectory Arcs to Partner Schools */}
            {PARTNER_NODES.map(node => {
              const isSelected = node.id === selectedId
              return (
                <g key={node.id} onClick={() => handleSelect(node.id)} className="cursor-pointer">
                  {/* Trajectory Vector Arc */}
                  <path
                    d={`M 50 50 Q ${(50 + node.coord.x) / 2 + (node.coord.y > 50 ? -8 : 8)} ${(50 + node.coord.y) / 2} ${node.coord.x} ${node.coord.y}`}
                    className={`trajectory-arc ${isSelected ? 'trajectory-arc--active' : ''}`}
                  />
                  {/* Destination Orbital Marker */}
                  <circle
                    cx={node.coord.x}
                    cy={node.coord.y}
                    r={isSelected ? '4.8' : '3.5'}
                    className={`target-node ${isSelected ? 'target-node--selected' : ''}`}
                  />
                  <circle
                    cx={node.coord.x}
                    cy={node.coord.y}
                    r={isSelected ? '2.5' : '1.8'}
                    className="target-node-core"
                  />
                  <text
                    x={node.coord.x}
                    y={node.coord.y - 5}
                    textAnchor="middle"
                    className={`target-node-text ${isSelected ? 'target-node-text--active' : ''}`}
                  >
                    {node.code}
                  </text>
                </g>
              )
            })}
          </svg>

          <div className="radar-telemetry-bottom">
            <span>COORDINATE LOCK: {selectedNode.code}</span>
            <span className="radar-status-live">● TELEMETRY LOCKED</span>
          </div>
        </div>

        {/* Selected Academy Mission Dossier */}
        <div className="warp-dossier-panel">
          <div className="dossier-header">
            <div className="dossier-code-tag">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>{`${selectedNode.code} // ${selectedNode.city.toUpperCase()}`}</span>
            </div>
            <h4 className="dossier-title">{selectedNode.name}</h4>
            <p className="dossier-focus">{selectedNode.focus}</p>
          </div>

          <div className="dossier-specs-grid">
            <div className="spec-card">
              <span className="spec-label">PATHWAY ARCHITECTURE</span>
              <strong className="spec-value">{selectedNode.specs.duration}</strong>
            </div>
            <div className="spec-card">
              <span className="spec-label">DEGREE PROTOCOL</span>
              <strong className="spec-value">{selectedNode.specs.dualDegree}</strong>
            </div>
            <div className="spec-card">
              <span className="spec-label">TARGET METRICS</span>
              <strong className="spec-value">{selectedNode.specs.gpaTarget}</strong>
            </div>
            <div className="spec-card spec-card--highlight">
              <span className="spec-label">RESEARCH & FIELD ADVANTAGE</span>
              <strong className="spec-value">{selectedNode.specs.keyAdvantage}</strong>
            </div>
          </div>

          <div className="dossier-majors">
            <span className="majors-label">HIGH-PRIORITY TRACKS:</span>
            <div className="majors-tags">
              {selectedNode.keyMajors.map(major => (
                <span key={major} className="major-tag">
                  {major}
                </span>
              ))}
            </div>
          </div>

          <div className="dossier-actions">
            <Link
              href="/resources?category=3-2"
              className="button button--primary dossier-cta"
              onClick={() => soundFx.playClick()}
            >
              <Sparkles className="w-4 h-4" />
              <span>ACCESS 3-2 COURSE ROADMAP</span>
            </Link>
            <Link
              href="/get-involved"
              className="button button--secondary dossier-cta"
              onClick={() => soundFx.playClick()}
            >
              <span>CONNECT WITH ADVISOR</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Partner Academy Switcher Tabs */}
      <div className="warp-tabs-row">
        {PARTNER_NODES.map(node => (
          <button
            key={node.id}
            className={`warp-tab-btn ${node.id === selectedId ? 'warp-tab-btn--active' : ''}`}
            onClick={() => handleSelect(node.id)}
            onMouseEnter={() => soundFx.playHover()}
          >
            <Orbit className="w-3.5 h-3.5" />
            <span className="tab-code">{node.code}</span>
            <span className="tab-name">{node.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
