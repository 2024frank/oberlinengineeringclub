'use client'

// Synthesizes futuristic sci-fi UI sound effects using Web Audio API without external audio files
class SoundSystem {
  private ctx: AudioContext | null = null
  private enabled: boolean = false
  private masterGain: GainNode | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('oec_sfx_enabled')
      this.enabled = saved === 'true'
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        this.ctx = new AudioContextClass()
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.setValueAtTime(0.12, this.ctx.currentTime)
        this.masterGain.connect(this.ctx.destination)
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public toggle(): boolean {
    this.enabled = !this.enabled
    if (typeof window !== 'undefined') {
      localStorage.setItem('oec_sfx_enabled', String(this.enabled))
    }
    if (this.enabled) {
      this.initContext()
      this.playBeep(880, 0.08, 'sine')
    }
    return this.enabled
  }

  public setEnabled(val: boolean) {
    this.enabled = val
    if (typeof window !== 'undefined') {
      localStorage.setItem('oec_sfx_enabled', String(val))
    }
    if (val) this.initContext()
  }

  // Futuristic micro-click
  public playClick() {
    if (!this.enabled) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const now = this.ctx.currentTime

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1400, now)
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04)

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 0.04)
  }

  // Sci-fi hover chirp
  public playHover() {
    if (!this.enabled) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const now = this.ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.05)

    gain.gain.setValueAtTime(0.03, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 0.05)
  }

  // Beep with custom frequency
  public playBeep(freq: number = 880, duration: number = 0.08, type: OscillatorType = 'sine') {
    if (!this.enabled) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const now = this.ctx.currentTime

    osc.type = type
    osc.frequency.setValueAtTime(freq, now)

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + duration)
  }

  // Futuristic Warp Pulse
  public playWarp() {
    if (!this.enabled) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const now = this.ctx.currentTime

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(120, now)
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.35)

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 0.35)
  }

  // Cyber Power Up
  public playPowerUp() {
    if (!this.enabled) return
    this.initContext()
    if (!this.ctx || !this.masterGain) return

    const notes = [440, 554, 659, 880]
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const start = this.ctx.currentTime + idx * 0.06

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.06, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1)

      osc.connect(gain)
      gain.connect(this.masterGain)

      osc.start(start)
      osc.stop(start + 0.1)
    })
  }
}

export const soundFx = new SoundSystem()
