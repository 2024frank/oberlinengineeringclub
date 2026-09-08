import { chromium } from 'playwright'
import path from 'path'

async function capture() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  
  const artifactDir = '/Users/kwaku/.gemini/antigravity-ide/brain/74ae7aea-2e2b-443c-a347-34f60a92602c'
  const outPath = path.join(artifactDir, 'screenshot_home.png')
  await page.screenshot({ path: outPath, fullPage: false })
  console.log('Saved screenshot to:', outPath)

  const outPathFull = path.join(artifactDir, 'screenshot_home_full.png')
  await page.screenshot({ path: outPathFull, fullPage: true })
  console.log('Saved full screenshot to:', outPathFull)

  await browser.close()
}

capture().catch(err => {
  console.error(err)
  process.exit(1)
})
