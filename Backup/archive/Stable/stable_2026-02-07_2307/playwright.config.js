const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    viewport: { width: 1366, height: 768 }
  },
  webServer: {
    command: 'npx http-server . -p 4173 -c-1',
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000
  }
});
