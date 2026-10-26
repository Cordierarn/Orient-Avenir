import { defineConfig, devices } from '@playwright/test'

/**
 * Tests de bout en bout sur le build de production servi sous /Orient-Avenir/,
 * comme sur GitHub Pages (HashRouter, chemins des assets, IndexedDB).
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/Orient-Avenir/',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /(mobile|captures)\.spec/ },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true }, testMatch: /mobile\.spec/ },
    // Captures de comparaison visuelle (CAPTURES=1), une par maquette.
    { name: 'captures', use: { ...devices['Desktop Chrome'] }, testMatch: /captures\.spec/ },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/Orient-Avenir/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
