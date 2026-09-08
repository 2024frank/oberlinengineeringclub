import { expect, test } from '@playwright/test'

for (const width of [320, 390, 768, 980, 1440]) {
  test(`public pages are readable and use normal document scrolling at ${width}px`, async ({ context }, testInfo) => {
    test.setTimeout(180_000)
    for (const path of ['/', '/projects', '/projects/do-probe-amplifier-mayfly-data-logger', '/events', '/events/founding-meetup', '/about', '/get-involved', '/pathway', '/resources', '/opportunities', '/news']) {
      // Keep document checks independent; forced navigations abort Safari prefetches.
      const page = await context.newPage()
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      try {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(200)
      await expect(page.locator('.professional-site')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.locator('canvas, .workbench-preview, .concept-scene')).toHaveCount(0)
      const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
      if (await navigation.isVisible()) {
        const navBounds = await navigation.boundingBox()
        const headerBounds = await page.getByRole('banner').boundingBox()
        expect(navBounds!.y + navBounds!.height).toBeLessThanOrEqual(headerBounds!.y + headerBounds!.height)
      }
      await page.evaluate(() => document.fonts.ready)
      for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded()
      await page.getByRole('contentinfo').scrollIntoViewIfNeeded()
      await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)), { message: `Images for ${path}` }).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true)
      expect(await page.evaluate(() => window.scrollY), path).toBeGreaterThan(0)
      await page.evaluate(() => scrollTo(0, 0))
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      await page.screenshot({ path: testInfo.outputPath(`${path.replaceAll('/', '-') || 'home'}.png`), fullPage: true })
      expect(errors, path).toEqual([])
      } finally {
        await page.close()
      }
    }
  })
}

test('project discovery leads to an editable request and handles a failed submission', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const submitted: Array<Record<string, unknown>> = []
  // Exercise the form without writing identities into the membership inbox.
  await page.route('**/api/submissions', async route => {
    submitted.push(route.request().postDataJSON())
    await route.fulfill({ status: submitted.length === 1 ? 429 : 201, json: submitted.length === 1 ? { error: 'RATE_LIMITED' } : { ok: true } })
  })
  await page.goto('/projects')
  await page.getByRole('searchbox', { name: 'Search projects' }).fill('Ender')
  await expect(page.locator('.project-tile')).toHaveCount(1)
  const title = await page.locator('.project-tile h3').innerText()
  await page.locator('.project-tile').click()
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Express interest', exact: true }).click()
  await expect(page).toHaveURL(/type=join_project/)
  await expect(page.getByRole('textbox', { name: 'Project', exact: true })).toHaveValue(title)
  await expect(page.locator('.interest-check:visible')).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Electronics', exact: true }).check()
  await expect(page.locator('.interest-check:visible')).toHaveCount(1)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('Please enter your name.', { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Release Check')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('release-check@example.com')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review your request', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('request-review.png'), fullPage: true })
  await page.getByRole('button', { name: 'Send to OEC', exact: true }).click()
  await expect(page.locator('.join-form [role=alert]')).toContainText('Too many submissions')
  await expect(page.getByText('release-check@example.com', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Send to OEC', exact: true }).click()
  await expect(page.getByText('Request received', { exact: true })).toBeVisible()
  expect(submitted).toHaveLength(2)
  expect(submitted[1]).toMatchObject({ type: 'join_project', project: title, fullName: 'Release Check', email: 'release-check@example.com' })
  await page.goto('/get-involved?type=propose_project')
  await expect(page.getByRole('combobox', { name: 'I would like to' })).toHaveValue('propose_project')
  await expect(page.getByRole('textbox', { name: 'What would you like to build?' })).toBeVisible()
})

test('membership request type has a usable touch target', async ({ page }) => {
  await page.goto('/get-involved')
  const requestType = page.getByRole('combobox', { name: 'I would like to' })
  await expect(requestType).toBeVisible()
  expect((await requestType.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await requestType.selectOption('propose_project')
  await expect(page.getByRole('textbox', { name: 'What would you like to build?' })).toBeVisible()
})

test('member and officer sign-in pages remain outside the public redesign', async ({ page }) => {
  for (const path of ['/member/login', '/admin/login']) {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.locator('form').first()).toBeVisible()
    await expect(page.locator('.professional-site')).toHaveCount(0)
  }
})
