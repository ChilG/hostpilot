import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: 1,
  workers: 1,
  fullyParallel: false,
  globalSetup: './global-setup.ts',
  use: {
    // Specify the custom mode type defined by @srsholmes/tauri-playwright
    // @ts-expect-error mode is added by tauri-playwright custom options
    mode: 'tauri',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:1420',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
