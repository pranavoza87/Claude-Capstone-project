const fs = require('node:fs');
const path = require('node:path');
const { defineConfig, devices } = require('@playwright/test');
const { defineBddConfig } = require('playwright-bdd');

// E2E runs against a throwaway database, never backend/tasks.db.
const tmpDir = path.resolve(__dirname, 'tests', '.tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const e2eDb = path.join(tmpDir, 'e2e.db');

const reportRoot = path.resolve(__dirname, 'tests', 'Test Execution & Reporting');

const testDir = defineBddConfig({
  features: 'tests/bdd/features/*.feature',
  steps: 'tests/bdd/steps/*.js',
  outputDir: '.features-gen',
});

module.exports = defineConfig({
  testDir,
  fullyParallel: false,
  workers: 1, // shared database
  reporter: [['list'], ['html', { outputFolder: path.join(reportRoot, 'html-report'), open: 'never' }]],
  outputDir: path.join(reportRoot, 'test-results'),
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node backend/src/server.js',
      url: 'http://localhost:4000/api/health',
      // Never attach to a developer server that could be using the real tasks.db.
      reuseExistingServer: false,
      env: { PORT: '4000', DB_PATH: e2eDb },
      timeout: 60_000,
    },
    {
      command: 'npm run dev --prefix frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
