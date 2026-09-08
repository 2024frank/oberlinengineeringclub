import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import sharp from 'sharp'

test.use({ browserName: 'chromium', launchOptions: { channel: 'chrome' } })

for (const userAgent of ['WhatsApp/2.24.5.76 A', 'facebookexternalhit/1.1', 'Twitterbot/1.0']) {
  test(`sharing preview exposes the current workbench to ${userAgent}`, async ({ request, page }) => {
    const response = await request.get('/', { headers: { 'user-agent': userAgent } })
    expect(response.status()).toBe(200)
    const metadata = await page.evaluate(html => {
      const document = new DOMParser().parseFromString(html, 'text/html')
      return Object.fromEntries([...document.head.querySelectorAll('meta')].map(element => [element.getAttribute('property') || element.getAttribute('name'), element.getAttribute('content')]))
    }, await response.text())
    const imagePath = '/brand/workbench/share-20260906.jpg'
    const imageUrl = `https://oberlin32engineeringsociety.com${imagePath}`
    expect(metadata['og:image']).toBe(imageUrl)
    expect(metadata['og:image:width']).toBe('1200')
    expect(metadata['og:image:height']).toBe('660')
    expect(metadata['twitter:image']).toBe(imageUrl)
    expect(metadata['twitter:card']).toBe('summary_large_image')

    const image = await request.get(imagePath, { headers: { 'user-agent': userAgent } })
    expect(image.status()).toBe(200)
    expect(image.headers()['content-type']).toContain('image/jpeg')
    const bytes = await image.body()
    const expected = await readFile(resolve(process.cwd(), `public${imagePath}`))
    const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex')
    expect(digest(bytes)).toBe(digest(expected))
    expect(await sharp(bytes).metadata()).toMatchObject({ width: 1200, height: 660 })
  })
}
