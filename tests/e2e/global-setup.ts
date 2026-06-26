import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'

let tauriProcess: ChildProcess | null = null

async function waitForSocket(socketPath: string, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (existsSync(socketPath)) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Timeout waiting for socket at ${socketPath}`)
}

export default async function globalSetup() {
  console.log('Starting E2E Global Setup...')

  // 1. Clean up any stale socket file
  const socketPath = '/tmp/tauri-playwright.sock'
  if (existsSync(socketPath)) {
    try {
      rmSync(socketPath, { force: true })
    } catch (e) {
      console.warn('Failed to clean up stale socket:', e)
    }
  }

  // 2. Create temp test directories
  const testDataDir = mkdtempSync(join(tmpdir(), 'hostpilot-test-data-'))
  const testHostsPath = join(tmpdir(), `hostpilot-test-hosts-${Date.now()}`)

  // 3. Write default hosts file content
  writeFileSync(testHostsPath, '# HostPilot Test Hosts File\n127.0.0.1 localhost\n::1 localhost\n')

  // 4. Set environment variables for Tauri binary
  process.env.HOSTPILOT_TEST_DATA_DIR = testDataDir
  process.env.HOSTPILOT_TEST_HOSTS_PATH = testHostsPath

  console.log(`Temp Data Directory: ${testDataDir}`)
  console.log(`Temp Hosts Path: ${testHostsPath}`)

  // 5. Spawn Tauri debug binary (Must be built first with: pnpm build:e2e)
  const binaryPath = 'src-tauri/target/debug/hostpilot'
  if (!existsSync(binaryPath)) {
    throw new Error(`Tauri debug binary not found at ${binaryPath}. Did you run "pnpm build:e2e" first?`)
  }

  console.log('Spawning Tauri debug binary...')
  tauriProcess = spawn(binaryPath, [], {
    env: { ...process.env },
    stdio: 'inherit',
  })

  // 6. Wait for the socket to become available
  console.log('Waiting for tauri-plugin-playwright socket...')
  await waitForSocket(socketPath)
  console.log('Tauri app and socket are ready for E2E tests!')

  // Return teardown function
  return async () => {
    console.log('Running E2E Global Teardown...')
    
    if (tauriProcess) {
      console.log('Killing Tauri application...')
      tauriProcess.kill()
    }

    // Clean up temporary files and folders
    try {
      rmSync(testDataDir, { recursive: true, force: true })
      rmSync(testHostsPath, { force: true })
      if (existsSync(socketPath)) {
        rmSync(socketPath, { force: true })
      }
      console.log('Cleanup completed successfully.')
    } catch (e) {
      console.error('Failed to clean up test directories:', e)
    }
  }
}
