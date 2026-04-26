import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../constants/theme';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized, setSession, setInitialized, setProfile } = useAuthStore();

  // Fetch or clear profile
  async function syncProfile(userId?: string) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
    }
  }

  // Listen to auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      syncProfile(session?.user?.id).then(() => setInitialized(true));
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      syncProfile(session?.user?.id);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Route protection
  useEffect(() => {
    if (!initialized) return;

    const inHidden = segments[0] === '(hidden)';

    if (inHidden) {
      // If navigating into the hidden area
      const routeSegments = segments as string[];
      const inHiddenAuth = routeSegments[1] === 'auth';
      
      if (!session && !inHiddenAuth) {
        // trying to enter hidden app without session -> auth screen
        router.replace('/(hidden)/auth/sign-in');
      }
      // NOTE: We do NOT auto-redirect session+inHiddenAuth to map, 
      // because the sign-up wizard needs to stay on auth screens 
      // through all 3 steps even after signUp creates a session.
      // Each auth screen handles its own post-auth navigation.
    }
    // Public routes like /(tabs) and /(food) can be freely accessed by anyone regardless of session.
    
  }, [initialized, session, segments]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
