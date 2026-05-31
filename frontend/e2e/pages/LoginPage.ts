import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/login');
    await expect(this.page.getByTestId('login-heading')).toBeVisible();
  }

  async fillEmail(email: string) {
    await this.page.getByTestId('login-email').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByTestId('login-password').fill(password);
  }

  async submit() {
    await this.page.getByTestId('login-submit').click();
  }

  async signIn(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async expectError(matcher: string | RegExp) {
    const error = this.page.getByTestId('login-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(matcher);
  }
}
