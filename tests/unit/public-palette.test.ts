import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

const styles = ['professional.css', 'project-led.css'].map(name => postcss.parse(readFileSync(`app/(public)/${name}`, 'utf8')))

describe('public color system', () => {
  it('defines colors once and uses tokens in component rules', () => {
    const violations: string[] = []
    for (const sheet of styles) sheet.walkDecls(declaration => {
      if (!declaration.prop.startsWith('--') && /#[\da-f]{3,8}\b|rgba?\(|\bwhite\b|\bblack\b/i.test(declaration.value)) {
        violations.push(`${declaration.parent?.type === 'rule' ? declaration.parent.selector : ''}: ${declaration.prop}: ${declaration.value}`)
      }
    })
    expect(violations).toEqual([])
  })

  it('keeps the header palette identical on the homepage and inner pages', () => {
    const overrides: string[] = []
    for (const sheet of styles) sheet.walkRules(rule => {
      if (rule.selector.includes(':has(.project-home-hero)')) overrides.push(rule.selector)
    })
    expect(overrides).toEqual([])
  })

  it('does not redefine the public palette in the layout stylesheet', () => {
    const definitions: string[] = []
    styles[1].walkDecls(/^--oec-/, declaration => { definitions.push(declaration.prop) })
    expect(definitions).toEqual([])
  })

  it('uses an inverse focus ring for controls on every dark public section', () => {
    const selectors: string[] = []
    for (const sheet of styles) sheet.walkRules(rule => {
      if (!rule.selector.includes(':focus-visible')) return
      rule.walkDecls('outline-color', declaration => {
        if (declaration.value === 'var(--oec-surface)') selectors.push(rule.selector.replaceAll(':focus-visible', ''))
      })
    })
    const fixture = document.createElement('div')
    fixture.className = 'professional-site'
    for (const surface of ['cms-section--cardinal', 'hero', 'project-home-hero', 'home-hero', 'directory-hero--image', 'detail-hero--image', 'public-footer']) {
      fixture.innerHTML = `<section class="${surface}"><a href="/projects">Projects</a><button>Join</button><input /><select></select><textarea></textarea><summary>Details</summary></section>`
      for (const control of fixture.querySelectorAll('a, button, input, select, textarea, summary')) {
        expect(selectors.some(selector => control.matches(selector)), `${surface} ${control.tagName}`).toBe(true)
      }
    }
    fixture.innerHTML = '<section class="cta-section cta-section--charcoal"><a href="/join">Join</a></section>'
    expect(selectors.some(selector => fixture.querySelector('a')!.matches(selector))).toBe(false)
  })

  it('keeps brand and muted text readable on white', () => {
    const palette: Record<string, string> = {}
    styles[0].walkDecls(/^--oec-/, declaration => { palette[declaration.prop] = declaration.value })
    for (const token of ['--oec-cardinal', '--oec-muted']) {
      expect(palette[token]).toMatch(/^#[\da-f]{6}$/i)
      const rgb = palette[token].slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255)
      const linear = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
      expect(1.05 / (luminance + 0.05)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
