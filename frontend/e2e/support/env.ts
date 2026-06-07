export const env = {
  baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
  backendURL: process.env.E2E_BACKEND_URL ?? 'http://localhost:8080',
  testSupportPath: process.env.E2E_TEST_SUPPORT_PATH ?? '/api/test-support',
  isCI: !!process.env.CI,
};
