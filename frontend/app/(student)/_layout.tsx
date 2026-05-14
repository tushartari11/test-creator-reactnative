import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/lib/auth';

export default function StudentLayout() {
  const { isLoggedIn, isStudent } = useAuth();

  if (!isLoggedIn || !isStudent) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
