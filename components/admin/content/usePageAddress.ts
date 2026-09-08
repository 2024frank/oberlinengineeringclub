'use client'
import { useRef } from 'react'

export function usePageAddress(onChange: (name: string, value: unknown) => void, autoSlug: boolean) {
  const manual = useRef(false)
  return (name: string, next: unknown) => {
    onChange(name, next)
    if (name === 'slug') manual.current = true
    if (name === 'title' && autoSlug && !manual.current) {
      const slug = String(next).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 140).replace(/^-+|-+$/g, '')
      onChange('slug', slug)
    }
  }
}
