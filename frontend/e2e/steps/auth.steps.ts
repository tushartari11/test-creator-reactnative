import { Given, When, Then } from '../hooks/world';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage';

function scopedEmail(scenarioBackendId: string, alias: string): string {
  // Already-qualified emails pass through (used for the "unknown email" path).
  if (alias.includes('@')) return alias;
  const short = scenarioBackendId.replace(/-/g, '').slice(0, 8);
  return `${alias}-${short}@e2e.test`;
}

Given(
  'a teacher {string} exists with password {string}',
  async ({ scenario, testSupport }, alias: string, password: string) => {
    const backendId = await scenario.useBackend();
    const email = scopedEmail(backendId, alias);
    const user = await testSupport.createTeacher(backendId, {
      email,
      name: alias,
      password,
    });
    scenario.actors.set(alias, user);
  }
);

Given(
  'a student {string} exists with password {string}',
  async ({ scenario, testSupport }, alias: string, password: string) => {
    const backendId = await scenario.useBackend();
    const email = scopedEmail(backendId, alias);
    const user = await testSupport.createStudent(backendId, {
      email,
      name: alias,
      password,
    });
    scenario.actors.set(alias, user);
  }
);

When('I open the login page', async ({ page }) => {
  await new LoginPage(page).open();
});

When('I open the registration page', async ({ page }) => {
  await new RegisterPage(page).open();
});

When(
  'I sign in as {string} with password {string}',
  async ({ page, scenario }, alias: string, password: string) => {
    const actor = scenario.actors.get(alias);
    // Falls back to the alias as-is when no fixture exists — supports the
    // "unknown email" scenario where we expect the login to fail.
    const email = actor?.email ?? alias;
    await new LoginPage(page).signIn(email, password);
  }
);

When(
  'I register as a {string} named {string}',
  async ({ page, scenario }, role: string, name: string) => {
    const backendId = await scenario.useBackend();
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || 'User';
    const email = `${firstName.toLowerCase()}-${backendId.replace(/-/g, '').slice(0, 8)}@e2e.test`;
    await new RegisterPage(page).fill({
      firstName,
      lastName,
      email,
      password: 'Password123',
      role: role as 'TEACHER' | 'STUDENT',
    });
    await new RegisterPage(page).submit();
  }
);

When(
  'I register as a {string} named {string} with mismatched passwords',
  async ({ page, scenario }, role: string, name: string) => {
    const backendId = await scenario.useBackend();
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || 'User';
    const email = `${firstName.toLowerCase()}-${backendId.replace(/-/g, '').slice(0, 8)}@e2e.test`;
    await new RegisterPage(page).fill({
      firstName,
      lastName,
      email,
      password: 'Password123',
      confirmPassword: 'Password456',
      role: role as 'TEACHER' | 'STUDENT',
    });
    await new RegisterPage(page).submit();
  }
);

Then('I land on the teacher dashboard', async ({ page }) => {
  await new TeacherDashboardPage(page).waitUntilVisible();
});

Then('I see a login error containing {string}', async ({ page }, fragment: string) => {
  await new LoginPage(page).expectError(fragment);
});

Then('I see a registration error containing {string}', async ({ page }, fragment: string) => {
  await new RegisterPage(page).expectError(fragment);
});
