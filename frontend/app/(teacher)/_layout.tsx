import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/lib/auth';

export default function TeacherLayout() {
  const { isLoggedIn, isTeacher } = useAuth();

  if (!isLoggedIn || !isTeacher) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
