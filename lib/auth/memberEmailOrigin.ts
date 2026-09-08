const PUBLIC_ORIGIN = 'https://oberlin32engineeringsociety.com'

export function memberEmailOrigin(requestOrigin: string, configured = process.env.NEXT_PUBLIC_SITE_URL) {
  if (configured?.trim()) {
    const url = new URL(configured.trim())
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('MEMBER_EMAIL_ORIGIN_INVALID')
    // Older deployments accidentally used the officer host for member links.
    if (url.hostname === 'admin.oberlin32engineeringsociety.com') return PUBLIC_ORIGIN
    return url.origin
  }
  const url = new URL(requestOrigin)
  if (['oberlin32engineeringsociety.com', 'www.oberlin32engineeringsociety.com', 'admin.oberlin32engineeringsociety.com'].includes(url.hostname)) return PUBLIC_ORIGIN
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return url.origin
  throw new Error('MEMBER_EMAIL_ORIGIN_NOT_CONFIGURED')
}
