'use client'
import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const ready = () => true
const serverReady = () => false

// Keep server-rendered forms inert until their submit handlers are attached.
export function useFormReady() {
  return useSyncExternalStore(subscribe, ready, serverReady)
}
