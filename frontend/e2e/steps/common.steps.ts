import { expect } from '@playwright/test';
import { Given, Then, When } from '../hooks/world';
import { HomePage } from '../pages/HomePage';

Given('the testing framework is configured', async ({ scenario }) => {
  expect(scenario.id).toMatch(/^[0-9a-f-]{36}$/i);
});

When('I open the application home page', async ({ page }) => {
  const home = new HomePage(page);
  await home.open();
  await home.waitUntilHydrated();
});

Then('the page should load without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await expect(page.locator('#root')).toBeVisible();
  expect(errors, `Unexpected page errors: ${errors.join(', ')}`).toEqual([]);
});

Then('the document should have a non-empty body', async ({ page }) => {
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length, 'Body had no rendered text after hydration').toBeGreaterThan(0);
});
