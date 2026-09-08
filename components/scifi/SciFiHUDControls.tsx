'use client'

import React, { useState, useEffect } from 'react'
import { soundFx } from './SciFiSoundSystem'
import { Volume2, VolumeX, Terminal, Cpu } from 'lucide-react'

export function SciFiHUDControls() {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setAudioEnabled(soundFx.isEnabled())
  }, [])

  const toggleSound = () => {
    const next = soundFx.toggle()
    setAudioEnabled(next)
  }

  if (!mounted) return null

  return (
    <div className="scifi-hud-controls">
      {/* Live System Telemetry Pulse */}
      <div className="hud-telemetry-pill">
        <span className="hud-live-dot" />
        <span className="hud-telemetry-text">SYS_OEC // ONLINE</span>
      </div>

      {/* Audio FX Toggle */}
      <button
        type="button"
        className={`hud-sfx-toggle ${audioEnabled ? 'hud-sfx-toggle--active' : ''}`}
        onClick={toggleSound}
        title={audioEnabled ? 'Disable Sci-Fi Audio FX' : 'Enable Sci-Fi Audio FX'}
      >
        {audioEnabled ? (
          <>
            <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hud-wave-bars">
              <i /><i /><i />
            </span>
            <span className="hud-toggle-label">SFX ON</span>
          </>
        ) : (
          <>
            <VolumeX className="w-3.5 h-3.5 text-gray-400" />
            <span className="hud-toggle-label">SFX OFF</span>
          </>
        )}
      </button>
    </div>
  )
}
