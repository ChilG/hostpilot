import { test, expect, clickByLabel, waitForAppReady } from '../fixtures'

test.describe('Navigation', () => {
  test.beforeEach(async ({ tauriPage: page }) => {
    await page.goto('http://localhost:1420/')
    await waitForAppReady(page)
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should navigate to Hosts page', async ({ tauriPage: page }) => {
    await clickByLabel(page, 'Hosts')
    await expect(page.locator('h1')).toContainText('Hosts')
  })

  test('should navigate to Groups page', async ({ tauriPage: page }) => {
    await clickByLabel(page, 'Groups')
    await expect(page.locator('h1')).toContainText('Groups')
  })

  test('should navigate to Profiles page', async ({ tauriPage: page }) => {
    await clickByLabel(page, 'Profiles')
    await expect(page.locator('h1')).toContainText('Profiles')
  })

  test('should navigate to Ports page', async ({ tauriPage: page }) => {
    await clickByLabel(page, 'Ports')
    await expect(page.locator('h1')).toContainText('Ports')
  })

  test('should navigate to Backups page', async ({ tauriPage: page }) => {
    await clickByLabel(page, 'Backups')
    await expect(page.locator('h1')).toContainText('Backups')
  })

  test('should navigate to Settings page', async ({ tauriPage: page }) => {
    await clickByLabel(page, 'Settings')
    await expect(page.locator('h1')).toContainText('Settings')
  })
})
