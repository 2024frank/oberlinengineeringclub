import { describe, expect, it } from 'vitest'
import { publicCopy, refreshSeedEvent } from '@/lib/content/publicCopy'

describe('public copy', () => {
  it('replaces retired seed slogans without changing new officer-written content', () => {
    expect(publicCopy('Build things. Learn together.')).toBe('Student engineering projects at Oberlin College.')
    expect(publicCopy('A club for students who build things.')).toBe('About the club')
    expect(publicCopy('Engineering disciplines')).toBe('Areas of interest')
    expect(publicCopy('Our soldering workshop is on Thursday.')).toBe('Our soldering workshop is on Thursday.')
  })

  it('corrects the first interest meeting and retains its published date, location and URL', () => {
    const event = { slug: 'founding-meetup', title: 'Founding Meetup', start_at: '2026-09-12T17:00:00Z', location: 'Science Center A155', description: 'The date, time, and room are being scheduled. Pizza and accessibility details will be confirmed with the final announcement.' }
    const result = refreshSeedEvent(event)
    expect(result.title).toBe('First interest meeting')
    expect(result.description).toContain('start forming teams')
    expect(result.start_at).toBe(event.start_at)
    expect(result.location).toBe(event.location)
    expect(result.slug).toBe(event.slug)
    expect(event.title).toBe('Founding Meetup')
  })

  it('preserves custom event copy and does not rename unrelated events', () => {
    const event = { slug: 'founding-meetup', title: 'September project meeting', description: 'Please bring your circuit diagrams.' }
    expect(refreshSeedEvent(event)).toEqual(event)
    const unrelated = { slug: 'another-meetup', title: 'Founding Meetup' }
    expect(refreshSeedEvent(unrelated)).toEqual(unrelated)
  })
})
