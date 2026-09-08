import { chromium } from 'playwright'
import path from 'path'

async function captureAll() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const artifactDir = '/Users/kwaku/.gemini/antigravity-ide/brain/74ae7aea-2e2b-443c-a347-34f60a92602c'

  // Home
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_home.png'), fullPage: false })
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_home_full.png'), fullPage: true })
  console.log('Saved home screenshots')

  // About
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_about.png'), fullPage: true })
  console.log('Saved about screenshot')

  // Pathway
  await page.goto('http://localhost:3000/pathway', { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_pathway.png'), fullPage: true })
  console.log('Saved pathway screenshot')

  await browser.close()
}

captureAll().catch(err => {
  console.error(err)
  process.exit(1)
})
