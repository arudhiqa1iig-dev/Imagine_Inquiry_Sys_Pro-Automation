// @ts-check
require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

const STORAGE_STATE = '.auth/admin.json';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 1,
  workers: 2, // staging server is slow under parallel load
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://smis.techarttrekkies.com.np',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off', // recording every test slowed context teardown on staging
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 90_000,
    // Pause (in ms) before every browser action so you can watch the test.
    // Off by default. Turn on with SLOWMO, e.g. `npm run test:slow` or $env:SLOWMO=1000
    launchOptions: { slowMo: Number(process.env.SLOWMO) || 0 },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    {
      // Public pages + login/logout flows: run without a stored session
      name: 'public',
      testMatch: /(landing|login)\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Everything behind login reuses the session saved by the setup project
      name: 'authenticated',
      testIgnore: /(landing|login)\.spec\.js|auth\.setup\.js/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: STORAGE_STATE },
    },
  ],
});

module.exports.STORAGE_STATE = STORAGE_STATE;
