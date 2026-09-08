'use client'

import dynamic from 'next/dynamic'
import { createContext, useContext, useState, useSyncExternalStore } from 'react'
import { Pause, Play } from 'lucide-react'

const SpatialWorkshop = dynamic(() => import('./SpatialWorkshop'), { ssr: false })
const MotionContext = createContext(true)
const subscribe = (callback: () => void) => {
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
export function useWorkshopMotion() { return useContext(MotionContext) }

export function WorkshopExperience({ children }: { children: React.ReactNode }) {
  const reduced = useSyncExternalStore(subscribe, () => matchMedia('(prefers-reduced-motion: reduce)').matches, () => true)
  const [override, setOverride] = useState<boolean | null>(null)
  const playing = override ?? !reduced
  return <MotionContext.Provider value={playing}>
    <div className="workshop-site" data-motion={playing ? 'on' : 'off'}>
      <SpatialWorkshop>{children}</SpatialWorkshop>
      <button className="world-motion" type="button" aria-label={playing ? 'Pause site motion' : 'Enable site motion'} title={playing ? 'Pause site motion' : 'Enable site motion'} onClick={() => setOverride(!playing)}>{playing ? <Pause size={15}/> : <Play size={15}/>}</button>
    </div>
  </MotionContext.Provider>
}
