import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';

export default function HiddenLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) return;

    // Check if we are trying to access a hidden route BUT we are not in the auth group
    const routeSegments = segments as string[];
    const inHiddenAuth = routeSegments[1] === 'auth';

    if (!session && !inHiddenAuth) {
      router.replace('/(hidden)/auth/sign-in');
    }
  }, [session, initialized, segments]);

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
