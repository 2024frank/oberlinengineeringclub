'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Bell, Menu, X } from 'lucide-react'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { isPortalItemActive, portalPath, type PortalNavGroup } from '@/lib/navigation/portal'

export function PortalShell({ portal, groups, sidebar, children }: { portal: 'admin' | 'member'; groups: PortalNavGroup[]; sidebar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null)
  const pathname = portalPath(usePathname(), portal)
  const current = groups.flatMap(group => group.items).find(item => isPortalItemActive(pathname, item.href))
  function close() { setOpen(false); dialog.current?.close(); trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    const element = dialog.current
    element?.showModal()
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const breakpoint = window.matchMedia('(min-width: 901px)')
    const onResize = () => { if (breakpoint.matches) setOpen(false) }
    breakpoint.addEventListener('change', onResize)
    return () => { document.body.style.overflow = originalOverflow; element?.close(); breakpoint.removeEventListener('change', onResize) }
  }, [open])
  return <div className={`portal-shell portal-shell--${portal}`}>
    <a className="portal-skip" href="#portal-content">Skip to content</a>
    <div className="portal-desktop-nav">{sidebar}</div>
    <dialog ref={dialog} className="portal-nav-dialog" aria-label={`${portal === 'admin' ? 'Admin' : 'Member'} navigation`} id={`${portal}-mobile-navigation`} onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === dialog.current) close() }}>
      <button className="portal-nav-close" type="button" aria-label={`Close ${portal} navigation`} onClick={close}><X size={21}/></button>
      <div className="portal-mobile-nav" onClick={event => { if ((event.target as Element).closest('a')) close() }}>{sidebar}</div>
    </dialog>
    <div className="portal-workspace">
      <header className="portal-topbar">
        <button className="portal-menu-button" ref={trigger} type="button" aria-label={`Open ${portal} navigation`} aria-expanded={open} aria-controls={`${portal}-mobile-navigation`} onClick={() => setOpen(true)}><Menu size={21}/></button>
        <div className="portal-location"><span>{portal === 'admin' ? 'Administration' : 'Member workspace'}</span><strong>{current?.label ?? (portal === 'admin' ? 'Overview' : 'Dashboard')}</strong></div>
        <div className="portal-topbar-actions">{portal === 'member' && <Link className="portal-icon-button" href="/member/notifications" aria-label="Notifications" title="Notifications"><Bell size={19}/></Link>}<a className="portal-public-link" href={process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oberlin32engineeringsociety.com/'} target="_blank" rel="noreferrer" aria-label="View club website"><span>Club website</span><ArrowUpRight size={17}/></a><SignOutButton portal={portal}/></div>
      </header>
      <div id="portal-content" tabIndex={-1}>{children}</div>
    </div>
  </div>
}
