import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../constants/theme';

type NavKey = 'map' | 'support' | 'trip';

const items: Array<{ key: NavKey; label: string; icon: keyof typeof Feather.glyphMap; href: string }> = [
  { key: 'map', label: 'Mapa', icon: 'home', href: '/(hidden)/map' },
  { key: 'support', label: 'Apoio', icon: 'users', href: '/(hidden)/network' },
  { key: 'trip', label: 'Trajeto', icon: 'navigation', href: '/(hidden)/trip' },
];

export function GuardianBottomNav({ active }: { active: NavKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 12 }]}>
      <BlurView intensity={80} tint="dark" style={styles.nav}>
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => {
                if (!isActive) router.push(item.href as never);
              }}
              activeOpacity={0.8}
            >
              <Feather name={item.icon} size={24} color={isActive ? '#FF68C8' : theme.colors.textMuted} />
              <Text style={isActive ? styles.textActive : styles.text}>{item.label}</Text>
              {isActive && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 18, right: 18, zIndex: 30 },
  nav: { height: 82, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(22, 20, 39, 0.86)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 },
  item: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  itemActive: { backgroundColor: 'rgba(139, 92, 246, 0.26)' },
  text: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  textActive: { color: '#FF68C8', fontSize: 13, fontWeight: '800', marginTop: 4 },
  indicator: { width: 34, height: 3, borderRadius: 2, backgroundColor: '#FF68C8', marginTop: 5 },
});
