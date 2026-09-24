import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// next/font is a compile-time transform; give tests a stable stand-in.
vi.mock('next/font/google', () => {
  const font = () => ({ className: '', variable: '', style: { fontFamily: 'sans-serif' } })
  return { Archivo: font, JetBrains_Mono: font }
})
