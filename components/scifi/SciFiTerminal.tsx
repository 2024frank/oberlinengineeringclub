'use client'

import React, { useState, useEffect, useRef } from 'react'
import { soundFx } from './SciFiSoundSystem'
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, CornerDownLeft } from 'lucide-react'

interface LogEntry {
  id: string
  type: 'input' | 'output' | 'system' | 'error' | 'success'
  text: string | React.ReactNode
}

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'init-1',
    type: 'system',
    text: `================================================================
  OBERLIN ENGINEERING CLUB // NEURAL COMMAND TERMINAL [v2.5.0]
  CORE_LOC: OBERLIN COLLEGE // OHIO (41.2929° N, 82.2175° W)
  SYS_STATUS: ALL ENGINEERING SUBSYSTEMS NOMINAL
================================================================
Type 'help' or click a command below to explore systems.`
  }
]

let commandCounter = 1

export function SciFiTerminal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const terminalEndRef = useRef<HTMLDivElement | null>(null)

  // Listen for keyboard shortcut ` or Ctrl+K or Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '`' || e.key === '~') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        setIsOpen(prev => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase()
    soundFx.playClick()
    commandCounter++

    const newLogs: LogEntry[] = [
      ...logs,
      { id: `cmd-in-${commandCounter}`, type: 'input', text: `> ${cmd}` }
    ]

    switch (trimmed) {
      case 'help':
        newLogs.push({
          id: `cmd-out-${commandCounter}`,
          type: 'output',
          text: (
            <div className="terminal-help-grid">
              <span><strong>help</strong> - Show this command manual</span>
              <span><strong>projects</strong> - Display current aerospace & robotics builds</span>
              <span><strong>pathway</strong> - 3-2 Dual-degree transfer telemetry</span>
              <span><strong>status</strong> - Live lab status and sub-frequencies</span>
              <span><strong>matrix</strong> - Run cybernetic neural scan</span>
              <span><strong>warp</strong> - Simulate orbital warp drive</span>
              <span><strong>audio</strong> - Toggle futuristic UI sound effects</span>
              <span><strong>join</strong> - Get involved in OEC projects</span>
              <span><strong>clear</strong> - Purge terminal buffer</span>
            </div>
          )
        })
        break

      case 'projects':
        newLogs.push({
          id: `cmd-out-${commandCounter}`,
          type: 'success',
          text: `[ACTIVE MISSION BUILDS]
  1. ROV-04 Autonomous Planetary Rover (LiDAR + Jetson AI)
  2. SAT-8 Solar Telemetry CubeSat (1U Deployable Arrays)
  3. HEX-2 Bio-Robotic Hexapod (18-DOF Inverse Kinematics)
  4. HYDRAULIC-X Precision Actuation Testbed
  Visit /projects to inspect comprehensive CAD specs.`
        })
        break

      case 'pathway':
        newLogs.push({
          id: `cmd-out-${commandCounter}`,
          type: 'output',
          text: `[3-2 ENGINEERING PATHWAY TELEMETRY]
  Partner Institutions:
  - CALTECH [CIT-01]: Aerospace & Quantum Systems (Pasadena, CA)
  - COLUMBIA [CU-02]: Biomedical & Computer Eng (New York, NY)
  - WASHU [WUSTL-03]: Materials Science & Clean Energy (St. Louis, MO)
  - CASE WESTERN [CWRU-04]: Biomedical Devices & Polymers (Cleveland, OH)
  Structure: 3 Years Oberlin BA + 2 Years Partner BS`
        })
        break

      case 'status':
        newLogs.push({
          id: `cmd-out-${commandCounter}`,
          type: 'success',
          text: `[LAB DIAGNOSTICS: NOMINAL]
  - OEC CORE POWER: 100% (STABLE)
  - MAKERSPACE 3D PRINTERS: 4 UNITS ONLINE
  - LATENCY TO OBERLIN CLUSTER: 2.1ms
  - CURRENT CAD ENGINE: 60.0 FPS
  - MEMBER NETWORK: 100+ STUDENT ENGINEERS`
        })
        break

      case 'warp':
        soundFx.playWarp()
        newLogs.push({
          id: `cmd-out-${commandCounter}`,
          type: 'output',
          text: `[WARP DRIVE ENGAGED] Initiating trajectory coordinates Oberlin [OB-01] -> Caltech [CIT-01] ... WARP VELOCITY NOMINAL.`
        })
        break

      case 'audio': {
        const newState = soundFx.toggle()
        newLogs.push({
          id: `cmd-out-${commandCounter}`,
          type: newState ? 'success' : 'system',
          text: `[AUDIO SYNTHESIZER]: ${newState ? 'ONLINE (SFX ENABLED)' : 'MUTED (SFX DISABLED)'}`
        })
        break
      }

      case 'matrix':
        newLogs.push({
          id: `cmd-out-${commandCounter}`,
          type: 'output',
          text: `01001111 01000101 01000011 [OBERLIN ENGINEERING CLUB]
"We do not wait for the future. We engineer it."`
        })
        break

      case 'join':
        newLogs.push({
          id: `cmd-out-${commandCounter}`,
          type: 'success',
          text: `Routing to recruitment portal... Head over to /get-involved to join a build team!`
        })
        break

      case 'clear':
        setLogs(INITIAL_LOGS)
        setInputVal('')
        return

      case '':
        break

      default:
        newLogs.push({
          id: `cmd-out-${commandCounter}`,
          type: 'error',
          text: `Command not recognized: '${cmd}'. Type 'help' for available directives.`
        })
        break
    }

    setLogs(newLogs)
    setInputVal('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputVal.trim()) {
      executeCommand(inputVal)
    }
  }

  return (
    <>
      {/* Floating HUD Launcher Button */}
      <div className="scifi-terminal-fab">
        <button
          className="terminal-trigger-btn"
          onClick={() => {
            soundFx.playClick()
            setIsOpen(prev => !prev)
          }}
          title="Open OEC Cyber Terminal (` / ~)"
        >
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <span>TERMINAL</span>
          <kbd className="terminal-key-badge">~</kbd>
        </button>
      </div>

      {/* Terminal Modal Window */}
      {isOpen && (
        <div className="terminal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className={`scifi-terminal-window ${isMaximized ? 'scifi-terminal-window--max' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Terminal Titlebar */}
            <div className="terminal-titlebar">
              <div className="terminal-title">
                <TerminalIcon className="w-4 h-4 text-cyan-400" />
                <span>OEC_COMMAND_CONSOLE // OBERLIN.EDU</span>
              </div>
              <div className="terminal-controls">
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="terminal-ctrl-btn"
                  title={isMaximized ? 'Restore' : 'Maximize'}
                >
                  {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="terminal-ctrl-btn terminal-ctrl-btn--close"
                  title="Close (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Terminal Body / Logs */}
            <div className="terminal-body">
              {logs.map(log => (
                <div key={log.id} className={`terminal-log terminal-log--${log.type}`}>
                  {typeof log.text === 'string' ? (
                    <pre className="terminal-pre">{log.text}</pre>
                  ) : (
                    log.text
                  )}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Quick Command Suggestion Bar */}
            <div className="terminal-quick-bar">
              <span className="text-xs text-gray-500 font-mono">QUICK DIRECTIVES:</span>
              {['help', 'projects', 'pathway', 'status', 'warp', 'audio', 'matrix', 'clear'].map(cmd => (
                <button
                  key={cmd}
                  className="terminal-chip-btn"
                  onClick={() => executeCommand(cmd)}
                  type="button"
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Terminal Input Form */}
            <form onSubmit={handleSubmit} className="terminal-input-form">
              <span className="terminal-prompt text-cyan-400 font-mono font-bold">oec-user@oberlin:~$</span>
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Enter command (e.g. 'projects', 'warp', 'status')..."
                className="terminal-input"
                autoFocus
              />
              <button type="submit" className="terminal-submit-btn" title="Execute Command">
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
