import { Page, expect } from '@playwright/test';

export class TeacherDashboardPage {
  constructor(private readonly page: Page) {}

  async waitUntilVisible() {
    await expect(this.page.getByTestId('teacher-dashboard')).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByTestId('teacher-dashboard-role-badge')).toHaveText('TEACHER');
  }

  async expectUserName(name: string) {
    await expect(this.page.getByTestId('teacher-dashboard-user-name')).toHaveText(name);
  }
}
