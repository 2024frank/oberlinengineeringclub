import { expect, it } from 'vitest'
import { formatPortalDate } from '@/lib/format/portalDate'

it('renders late-night requests on the same Oberlin calendar day on server and client', () => {
  expect(formatPortalDate('2026-08-28T01:58:21.880344+00:00')).toBe('Aug 27, 2026')
  expect(formatPortalDate('2026-01-02T04:00:00Z')).toBe('Jan 1, 2026')
})
