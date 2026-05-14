import { Page, expect } from '@playwright/test';

export class HomePage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/');
  }

  async waitUntilHydrated() {
    const root = this.page.locator('#root');
    await expect(root).toBeAttached();
    await expect.poll(async () => root.evaluate((el) => el.childElementCount), {
      message: 'React root never received children — hydration likely failed',
      timeout: 15_000,
    }).toBeGreaterThan(0);
  }
}
