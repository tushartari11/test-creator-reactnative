import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../src/lib/auth';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
    if (loaded) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <RootStack />
    </AuthProvider>
  );
}

function RootStack() {
  const { loadFromStorage } = useAuth();

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(student)" options={{ headerShown: false }} />
      <Stack.Screen name="(teacher)" options={{ headerShown: false }} />
      <Stack.Screen name="(guest)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
