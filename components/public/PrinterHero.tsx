'use client'
import dynamic from 'next/dynamic'
const PrinterScene = dynamic(() => import('./PrinterScene'), { ssr: false })
export function PrinterHero() { return <PrinterScene/> }
