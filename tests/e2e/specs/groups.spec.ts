import { test, expect, clickByLabel, clickCardButton, waitForAppReady } from '../fixtures'

test.describe('Groups E2E', () => {
  test.beforeEach(async ({ tauriPage: page }) => {
    await page.goto('http://localhost:1420/')
    await waitForAppReady(page)
    await expect(page.locator('h1')).toContainText('Dashboard')
    await clickByLabel(page, 'Groups')
    await expect(page.locator('h1')).toContainText('Groups')
  })

  test('should create, edit and delete a group', async ({ tauriPage: page }) => {
    // 1. Create a group
    await clickByLabel(page, 'Add Group')
    await page.locator('#group-name').fill('Custom Group')
    await page.locator('#group-desc').fill('E2E testing group desc')
    await clickByLabel(page, 'Add')

    // Verify group is listed
    const card = page.locator('.border-border').filter({ hasText: 'Custom Group' })
    await expect(card).toBeVisible()

    // 2. Edit the group
    await clickCardButton(page, 'Custom Group', 'Edit')
    await page.locator('#group-name').fill('Updated Group Name')
    await clickByLabel(page, 'Save')

    // Verify it is updated
    const updatedCard = page.locator('.border-border').filter({ hasText: 'Updated Group Name' })
    await expect(updatedCard).toBeVisible()

    // 3. Delete the group
    await clickCardButton(page, 'Updated Group Name', 'Delete')
    await clickByLabel(page, 'Delete') // Confirm delete inside the alert dialog

    // Verify it is gone
    await expect(updatedCard).not.toBeVisible()
  })
})
