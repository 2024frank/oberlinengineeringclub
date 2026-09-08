'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import type { PublicNavigationItem } from '@/lib/page-builder/publicPages'
export const publicNavigation = [['Projects','/projects'],['Events','/events'],['3-2 Pathway','/pathway'],['About','/about'],['Resources','/resources'],['Opportunities','/opportunities'],['News','/news'],['Member Sign In','/member/login'],['Get Involved','/get-involved']] as const
export function PublicHeader({items,logoSrc}:{items?:PublicNavigationItem[];logoSrc?:string|null}) {
  const nav = items?.length ? items : publicNavigation.map(([label,destination])=>({label,destination}))
  const pathname = usePathname()
  const [open,setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)
  const primary = nav.filter(i=>['/projects','/events','/pathway','/about'].includes(i.destination))
  const other = nav.filter(i=>!['/','/projects','/events','/pathway','/about','/get-involved'].includes(i.destination))
  useEffect(()=>{
    if (!open) return
    navigation.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    function key(e:KeyboardEvent) { if(e.key==='Escape'){setOpen(false);trigger.current?.focus()} }
    document.addEventListener('keydown',key)
    return ()=>document.removeEventListener('keydown',key)
  },[open])
  const itemLink = (item:PublicNavigationItem) => <Link key={item.destination} href={item.destination} target={item.external?'_blank':undefined} rel={item.external?'noreferrer':undefined} aria-current={pathname===item.destination||pathname?.startsWith(item.destination+'/')?'page':undefined} onClick={()=>setOpen(false)}>{item.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>
  return <header className="public-header"><a className="skip-link" href="#main-content">Skip to content</a><div className="shell public-header__inner"><Link href="/" className="public-header__brand" aria-label="Oberlin Engineering Club home" onClick={()=>setOpen(false)}><BrandLogo variant="badge" src={logoSrc}/><span>OBERLIN<small>ENGINEERING CLUB</small></span></Link><nav className="desktop-primary" aria-label="Primary navigation">{primary.map(itemLink)}</nav><div className="header-actions"><Link className="header-join" href="/get-involved">Join the club <ArrowUpRight size={17}/></Link><button ref={trigger} className="public-menu" type="button" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="expanded-navigation" onClick={()=>setOpen(v=>!v)}>{open?<X/>:<Menu/>}</button></div></div>{open&&<nav ref={navigation} id="expanded-navigation" className="expanded-navigation" aria-label="All pages"><div className="shell expanded-navigation__grid"><div>{primary.map(itemLink)}</div><div>{other.map(itemLink)}{!other.some(i=>i.destination==='/member/login')&&<Link href="/member/login" onClick={()=>setOpen(false)}>Member sign in <ArrowUpRight size={15}/></Link>}</div></div></nav>}</header>
}
