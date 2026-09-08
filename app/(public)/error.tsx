'use client'
import Link from 'next/link'
export default function PublicError({reset}:{reset:()=>void}) {
  return <section className="directory"><div className="shell empty-state"><h1>This page could not load.</h1><p>Please try again in a moment.</p><div className="button-row"><button className="button button--primary" onClick={reset}>Try again</button><Link className="text-link" href="/">Go to the homepage</Link></div></div></section>
}
