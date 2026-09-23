'use client'
import Link from 'next/link'

export default function MemberPortalError({ reset }: { reset: () => void }) {
  return <main className="admin-panel"><div className="portal-empty"><div>
    <h1>This page could not load.</h1>
    <p>Your work is saved. Try again, or head back to your dashboard.</p>
    <div className="pt-actions"><button type="button" className="button button--primary" onClick={reset}>Try again</button><Link className="portal-text-link" href="/member">Back to dashboard</Link></div>
  </div></div></main>
}
