'use client'

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

export function ConceptPanel({ view, direction = 'robot', surface, onClose, children }: { view: string; direction?: string; surface: HTMLDivElement | null; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null), content = useRef<HTMLDivElement>(null), previousFocus = useRef<HTMLElement | null>(null)
  const origin = useRef<HTMLDivElement>(null)
  const open = view !== 'home'
  useLayoutEffect(() => {
    const node = content.current, parent = origin.current, currentDialog = dialog.current
    if (!open || !node || !parent || !currentDialog) return
    const focused = document.activeElement as HTMLElement | null
    if (!previousFocus.current) previousFocus.current = focused
    // Move the mounted DOM node, not the React tree, so an in-flight form survives WebGL handoff.
    if (surface) { currentDialog.close(); surface.appendChild(node) }
    else if (!currentDialog.open) currentDialog.showModal()
    const timer = setTimeout(() => {
      const target = focused && node.contains(focused) ? focused : node.querySelector<HTMLButtonElement>('button')
      target?.focus({ preventScroll: true })
    }, surface ? 950 : 0)
    return () => { clearTimeout(timer); if (node.parentElement !== parent) parent.appendChild(node) }
  }, [open, surface])
  useEffect(() => {
    if (!open) return
    const currentDialog = dialog.current
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('keydown', escape); currentDialog?.close(); previousFocus.current?.focus({ preventScroll: true }); previousFocus.current = null }
  }, [open, onClose])
  if (!open) return null
  const label = direction === 'machine' ? `${view === 'join' ? 'Registration' : view.charAt(0).toUpperCase() + view.slice(1)} console` : view === 'join' ? 'Club badge registration' : `${view} tablet`
  return <dialog ref={dialog} className="concept-panel" aria-labelledby="concept-panel-heading" onCancel={event => { event.preventDefault(); onClose() }}><div ref={origin} style={{ height: '100%' }}><div ref={content} className={`concept-panel robot-terminal-content ${direction === 'machine' ? 'machine-terminal-content' : ''} ${view === 'menu' ? 'concept-menu' : ''}`} role="region" aria-label={label}>{children}</div></div></dialog>
}
