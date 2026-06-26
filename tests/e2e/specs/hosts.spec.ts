import { test, expect, clickByLabel, clickCardButton, waitForAppReady } from '../fixtures'
import { readFileSync } from 'fs'

test.describe('Hosts CRUD', () => {
  test.beforeEach(async ({ tauriPage: page }) => {
    await page.goto('http://localhost:1420/')
    await waitForAppReady(page)
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should create a host entry, apply changes and verify hosts file write', async ({ tauriPage: page }) => {
    // 1. Create a profile first because hosts are auto-added to active profile
    await clickByLabel(page, 'Profiles')
    await expect(page.locator('h1')).toContainText('Profiles')
    await clickByLabel(page, 'Add Profile')
    await page.locator('#profile-name').fill('E2E Profile')
    await clickByLabel(page, 'Add')
    
    // Activate the profile
    await clickCardButton(page, 'E2E Profile', 'Activate')

    // 2. Add the host entry
    await clickByLabel(page, 'Hosts')
    await expect(page.locator('h1')).toContainText('Hosts')
    await clickByLabel(page, 'Add Host')
    await page.locator('#host-domain').fill('e2e.local')
    await page.locator('#host-ip').fill('127.0.0.99')
    await clickByLabel(page, 'Add')

    // Verify it is visible in the list
    await expect(page.locator('tbody')).toContainText('e2e.local')
    await expect(page.locator('tbody')).toContainText('127.0.0.99')

    // 3. Apply changes
    await clickByLabel(page, 'Apply Changes')
    
    // Click Confirm in the preview/apply confirmation dialog
    await clickByLabel(page, 'Confirm')

    // Verify that the hosts file contains the new entry
    const hostsFilePath = process.env.HOSTPILOT_TEST_HOSTS_PATH
    expect(hostsFilePath).toBeDefined()
    
    // Read the temp hosts file directly from filesystem to assert Tauri wrote to it!
    // Since file writing is asynchronous, poll until the content is updated.
    let hostsContent = ''
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      hostsContent = readFileSync(hostsFilePath!, 'utf-8')
      if (hostsContent.includes('# >>> HostPilot START: E2E Profile')) {
        break
      }
      await new Promise(r => setTimeout(r, 100))
    }
    
    expect(hostsContent).toContain('# >>> HostPilot START: E2E Profile')
    expect(hostsContent).toContain('127.0.0.99   e2e.local')
    expect(hostsContent).toContain('# <<< HostPilot END: E2E Profile')
  })
})
