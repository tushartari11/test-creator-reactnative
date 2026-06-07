import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: path.resolve(__dirname, '.env.e2e') });

const isCI = !!process.env.CI;
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173';
const distDir = path.resolve(__dirname, '..', 'dist');
/** When baseURL targets the static-serve port we manage, auto-start `serve`.
 *  When baseURL points anywhere else (e.g. Spring Boot on :8080), assume the
 *  user already has it running and skip the auto-start. */
const usesStaticServe = baseURL === 'http://localhost:4173';

const testDir = defineBddConfig({
  features: path.resolve(__dirname, 'features/**/*.feature'),
  steps: [
    path.resolve(__dirname, 'steps/**/*.ts'),
    path.resolve(__dirname, 'hooks/**/*.ts'),
  ],
  outputDir: path.resolve(__dirname, '.features-gen'),
});

export default defineConfig({
  testDir,
  fullyParallel: isCI,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [['github'], ['html', { open: 'never', outputFolder: path.resolve(__dirname, 'playwright-report') }]]
    : [['list'], ['html', { open: 'never', outputFolder: path.resolve(__dirname, 'playwright-report') }]],
  outputDir: path.resolve(__dirname, 'test-results'),
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: usesStaticServe
    ? {
        command: `npx serve "${distDir}" --single --listen 4173 --no-clipboard`,
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : undefined,
});
