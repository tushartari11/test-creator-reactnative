import { Then } from '../hooks/world';
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage';

Then('the dashboard shows my user name', async ({ page, scenario }) => {
  const teacher = [...scenario.actors.values()].find((u) => u.role === 'TEACHER');
  if (!teacher) {
    throw new Error('No teacher fixture in scenario — add `Given a teacher ... exists`.');
  }
  await new TeacherDashboardPage(page).expectUserName(teacher.name);
});
