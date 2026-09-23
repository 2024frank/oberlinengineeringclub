const PUBLIC_ORIGIN = 'https://oberlin32engineeringsociety.com'

// Links in member email must open the public site, never a blank or officer host.
export function memberSiteOrigin(configured = process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    if (!configured?.trim()) return PUBLIC_ORIGIN
    const url = new URL(configured.trim())
    if (!['https:', 'http:'].includes(url.protocol) || url.hostname === 'admin.oberlin32engineeringsociety.com') return PUBLIC_ORIGIN
    return url.origin
  } catch { return PUBLIC_ORIGIN }
}
