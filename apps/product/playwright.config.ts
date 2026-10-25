import { defineConfig, devices } from '@playwright/test'
import { API_URL, APP_ORIGIN, E2E_PORT } from './e2e/support/origins'

const serverEnv = {
  NEXT_PUBLIC_API_URL: API_URL,
  NEXT_PUBLIC_APP_URL: APP_ORIGIN,
  API_INTERNAL_URL: API_URL,
  PORT: String(E2E_PORT),
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/support/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: APP_ORIGIN,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm exec next build && pnpm start',
    url: `${APP_ORIGIN}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: serverEnv,
  },
})
