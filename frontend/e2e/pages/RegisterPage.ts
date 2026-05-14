import { Page, expect } from '@playwright/test';

export type Role = 'TEACHER' | 'STUDENT';

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/register');
    await expect(this.page.getByTestId('register-heading')).toBeVisible();
  }

  async fill(opts: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role: Role;
  }) {
    await this.page.getByTestId('register-first-name').fill(opts.firstName);
    await this.page.getByTestId('register-last-name').fill(opts.lastName);
    await this.page.getByTestId('register-email').fill(opts.email);
    await this.page.getByTestId('register-password').fill(opts.password);
    await this.page.getByTestId('register-confirm-password').fill(opts.confirmPassword ?? opts.password);
    await this.page
      .getByTestId(opts.role === 'TEACHER' ? 'register-role-teacher' : 'register-role-student')
      .click();
  }

  async submit() {
    await this.page.getByTestId('register-submit').click();
  }

  async expectError(matcher: string | RegExp) {
    const error = this.page.getByTestId('register-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(matcher);
  }
}
