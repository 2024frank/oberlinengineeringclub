import { expect, test } from '@playwright/test'
import sharp from 'sharp'

test.use({ browserName: 'chromium', launchOptions: { channel: 'chrome' } })

for (const viewport of [{ width: 1536, height: 1024 }, { width: 390, height: 844 }]) {
  test(`workbench navigation, 3D and real form integration at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await page.setViewportSize(viewport)
    const errors: string[] = [], submitted: Array<Record<string, unknown>> = []
    page.on('pageerror', error => errors.push(error.message))
    // Never write test identities into the real membership inbox.
    await page.route('**/api/submissions', async route => {
      submitted.push(route.request().postDataJSON())
      await route.fulfill({ status: submitted.length === 1 ? 429 : 201, json: submitted.length === 1 ? { error: 'RATE_LIMITED' } : { ok: true } })
    })
    await page.goto('/')
    await expect(page.locator('.workbench-preview')).toHaveAttribute('data-scene-ready', 'true', { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Oberlin Engineering Club', exact: true })).toBeVisible()
    await expect(page.getByText('Design preview', { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('home.png') })
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
    const canvas = page.locator('.concept-scene canvas')
    const before = await canvas.screenshot()
    await page.getByRole('button', { name: 'Explode mechanism', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Assemble mechanism', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => {
      const a = await sharp(before).removeAlpha().raw().toBuffer(), b = await sharp(await canvas.screenshot()).removeAlpha().raw().toBuffer()
      return b.reduce((count, value, index) => count + (Math.abs(value - a[index]) > 12 ? 1 : 0), 0)
    }).toBeGreaterThan(1000)
    const drawer = page.getByRole('region', { name: 'Project drawer' })
    const title = await drawer.locator('strong').first().textContent()
    await drawer.getByRole('button').first().click()
    await expect(page).toHaveURL(/\/projects\/.+/)
    await expect(page.getByRole('heading', { name: title!, exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('project.png') })
    if (viewport.width === 390) {
      const surface = page.locator('.workbench-surface'), bounds = await surface.boundingBox()
      await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height * .7)
      await page.mouse.wheel(0, 550)
      await expect.poll(() => surface.evaluate(node => node.scrollTop)).toBeGreaterThan(100)
    }
    await page.getByRole('link', { name: 'Express interest', exact: true }).click()
    await expect(page).toHaveURL(/type=join_project/)
    await expect(page.getByRole('textbox', { name: 'Project', exact: true })).toHaveValue(title!)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Major or area of study' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByText('Please enter your name.', { exact: true })).toBeVisible()
    await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Release Check')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('release-check@example.com')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Review your request', exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('review.png') })
    await page.getByRole('button', { name: 'Send to OEC', exact: true }).click()
    await expect(page.locator('.join-form [role=alert]')).toContainText('Too many submissions')
    await expect(page.getByText('release-check@example.com', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Send to OEC', exact: true }).click()
    await expect(page.getByText('Request received', { exact: true })).toBeVisible()
    expect(submitted).toHaveLength(2)
    expect(submitted[1]).toMatchObject({ type: 'join_project', project: title, fullName: 'Release Check', email: 'release-check@example.com' })
    await page.getByRole('link', { name: 'Submit a project idea', exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'I would like to' })).toHaveValue('propose_project')
    await expect(page.getByRole('textbox', { name: 'What would you like to build?' })).toBeVisible()
    await page.getByRole('button', { name: 'Events', exact: true }).click()
    await expect(page).toHaveURL(/\/events$/)
    await expect(page.getByRole('region', { name: 'Club calendar' })).toBeVisible()
    await page.getByRole('button', { name: 'Next month' }).click()
    await page.getByRole('button', { name: 'About', exact: true }).click()
    await expect(page).toHaveURL(/\/about$/)
    await expect(page.locator('.wb-live-content h1').first()).toBeVisible()
    await expect(page.locator('.wb-live-content .hero-copy').first()).toHaveCSS('animation-name', 'none')
    await expect(page.locator('.wb-live-content .media-frame:visible')).toHaveCount(0)
    await expect(page.locator('.wb-sheet-toolbar .wb-label')).not.toContainText('/')
    await page.screenshot({ path: testInfo.outputPath('about.png') })
    await page.goBack()
    await expect(page).toHaveURL(/\/events$/)
    await expect(page.getByRole('region', { name: 'Club calendar' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('public information, auth pages and invalid submission handling are available', async ({ request }) => {
  for (const path of ['/about', '/projects', '/events', '/resources', '/pathway', '/opportunities', '/news', '/get-involved', '/member/login', '/admin/login']) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    expect(await response.text(), path).not.toContain('This page could not load.')
  }
  const response = await request.post('/api/submissions', { data: {} })
  expect(response.status()).toBe(400)
  expect(await response.json()).toMatchObject({ error: 'VALIDATION_FAILED' })
})

test('direct information page loads hydrate without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  for (const path of ['/about', '/get-involved', '/pathway']) {
    await page.goto(path)
    await expect(page.locator('.workbench-preview')).toHaveAttribute('data-scene-ready', 'true', { timeout: 30_000 })
    await expect(page.locator('.wb-live-content h1').first()).toBeVisible()
  }
  await page.getByRole('link', { name: 'Officer sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/(?:admin\/)?login$/)
  await expect(page.locator('form').first()).toBeVisible()
  expect(errors).toEqual([])
})
