import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';

export default function IndexScreen() {
  const { disguiseMode } = useSettingsStore();
  const { initialized } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand persist to hydrate
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useSettingsStore.persist.hasHydrated());
    return unsub;
  }, []);

  if (!initialized || !hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#8B5CF6" size="large" />
      </View>
    );
  }

  if (disguiseMode === 'food') {
    return <Redirect href="/(food)" />;
  }

  if (disguiseMode === 'notes') {
    return <Redirect href="/(tabs)" />;
  }

  // disguiseMode === 'none'
  return <Redirect href="/(hidden)/map" />;
}
