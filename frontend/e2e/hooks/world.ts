import { test as base, createBdd } from 'playwright-bdd';
import { randomUUID } from 'node:crypto';
import { TestSupportClient, CreateUserResponse } from '../fixtures/test-support-client';

export type ScenarioContext = {
  id: string;
  /** Backend-issued scenario UUID (only set once `useBackend()` has been called). */
  backendId?: string;
  /** Tracked actors keyed by the logical email used in steps. */
  actors: Map<string, CreateUserResponse>;
  /** Lazily creates the backend scenario on first access. */
  useBackend(): Promise<string>;
};

export const test = base.extend<{
  scenario: ScenarioContext;
  testSupport: TestSupportClient;
}>({
  testSupport: async ({}, use) => {
    const client = await TestSupportClient.create();
    await use(client);
    await client.dispose();
  },

  scenario: async ({ testSupport }, use, testInfo) => {
    const scenario: ScenarioContext = {
      id: randomUUID(),
      actors: new Map(),
      async useBackend() {
        if (!this.backendId) {
          this.backendId = await testSupport.createScenario();
          testInfo.annotations.push({ type: 'backendScenarioId', description: this.backendId });
        }
        return this.backendId;
      },
    };
    testInfo.annotations.push({ type: 'scenarioId', description: scenario.id });
    try {
      await use(scenario);
    } finally {
      if (scenario.backendId) {
        try {
          await testSupport.deleteScenario(scenario.backendId);
        } catch (err) {
          testInfo.annotations.push({
            type: 'cleanup-failed',
            description: `${scenario.backendId}: ${(err as Error).message}`,
          });
          throw err;
        }
      }
    }
  },
});

export const { Given, When, Then, Before, After } = createBdd(test);
