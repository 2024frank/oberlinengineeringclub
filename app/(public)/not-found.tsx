import Link from 'next/link'
export default function PublicNotFound() {
  return <section className="directory"><div className="shell empty-state"><h1>We couldn’t find that page.</h1><p>It may have moved, or the link may be out of date.</p><div className="button-row"><Link className="button button--primary" href="/projects">Browse projects</Link><Link className="text-link" href="/">Go to the homepage</Link></div></div></section>
}
