import { test, expect, clickByLabel, clickCardButton, waitForAppReady } from '../fixtures'

async function bypassOnboarding(page: any) {
  // Bypassed automatically via backend during testing
}

test.describe('Profiles E2E', () => {
  test.beforeEach(async ({ tauriPage: page }) => {
    await page.goto('http://localhost:1420/')
    await waitForAppReady(page)
    await expect(page.locator('h1')).toContainText('Dashboard')
    await bypassOnboarding(page)
    await clickByLabel(page, 'Profiles')
    await expect(page.locator('h1')).toContainText('Profiles')
  })

  test('should create, duplicate, activate, and delete a profile', async ({ tauriPage: page }) => {
    // 1. Create a profile
    await clickByLabel(page, 'Add Profile')
    await page.locator('#profile-name').fill('Custom Profile')
    await page.locator('#profile-desc').fill('E2E Testing custom profile')
    await clickByLabel(page, 'Add')

    // Verify profile is listed in all profiles grid (inactive by default)
    const card = page.locator('.border-border').filter({ hasText: 'Custom Profile' })
    await expect(card).toBeVisible()

    // 2. Duplicate the profile
    await clickCardButton(page, 'Custom Profile', 'Duplicate')
    const duplicateCard = page.locator('.border-border').filter({ hasText: 'Copy of Custom Profile' })
    await expect(duplicateCard).toBeVisible()

    // 3. Activate the profile
    await clickCardButton(page, 'Custom Profile', 'Activate')
    
    // Verify it is displayed in the active profile banner now
    const activeBanner = page.locator('.bg-indigo-500\\/5', { hasText: 'Custom Profile' })
    await expect(activeBanner).toBeVisible()

    // 4. Delete the duplicate profile
    await clickCardButton(page, 'Copy of Custom Profile', 'Delete')
    await clickByLabel(page, 'Delete') // confirm delete in alert dialog

    // Verify it is gone
    await expect(duplicateCard).not.toBeVisible()
  })
})
