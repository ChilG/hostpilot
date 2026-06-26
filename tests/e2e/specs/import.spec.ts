import { test, expect, clickByLabel, clickSelector, setTextAreaValue, clickByText, waitForAppReady } from '../fixtures'

test.describe('Import & Export E2E', () => {
  test.beforeEach(async ({ tauriPage: page }) => {
    await page.goto('http://localhost:1420/')
    await waitForAppReady(page)
    await expect(page.locator('h1')).toContainText('Dashboard')
    await clickByLabel(page, 'Import / Export')
    await expect(page.locator('h1')).toContainText('Import / Export')
  })

  test('should parse raw hosts text and show parsed count and preview', async ({ tauriPage: page }) => {
    // 1. Paste text in textarea using DOM value setter to avoid wrapper.fill() bug on textarea
    await setTextAreaValue(page, 'textarea', '127.0.0.1 myhost.local\n1.2.3.4 another.local')

    // 2. Click Parse & Preview
    await clickByLabel(page, 'Parse & Preview')

    // 3. Verify parse preview results are visible
    // We expect "2 hosts parsed"
    await expect(page.locator('.space-y-4')).toContainText('2 hosts parsed')

    // 4. Click Export tab
    await clickByText(page, 'Export', '[role="tab"]')
    
    // Verify ExportSection is visible by checking for "Export Scope" heading
    await expect(page.locator('body')).toContainText('Export Scope')
  })
})
