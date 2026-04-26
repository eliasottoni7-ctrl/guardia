import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { theme } from '../../constants/theme';
import { useTripStore } from '../../store/useTripStore';

export default function TripScreen() {
  const router = useRouter();
  const { startTrip, isActive } = useTripStore();
  const [minutes, setMinutes] = useState(15); // Default to 15 mins

  if (isActive) {
    // If a trip is already active, we don't need to configure one. Usually handled by layout/map.
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonWrap} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.contentActive}>
           <Feather name="shield" size={60} color={theme.colors.primary} />
           <Text style={styles.activeTitle}>Rede Ativa</Text>
           <Text style={styles.activeSub}>Você já possui um monitoramento em curso.</Text>
           <TouchableOpacity style={styles.btnAction} onPress={() => router.back()}>
               <LinearGradient colors={theme.colors.primaryGradient} style={styles.btnGradient}>
                 <Text style={styles.btnText}>Ver Mapa</Text>
               </LinearGradient>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  function handleStart() {
    startTrip(minutes);
    Alert.alert('Monitoramento Ativo', `Seu timer de ${minutes} minutos começou. Se você não cancelar, suas Guardiãs serão alertadas.`);
    router.replace('/(hidden)/map');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonWrap} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volta Pra Casa</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Feather name="clock" size={24} color={theme.colors.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.infoTitle}>Timer de Proteção (Dead-man)</Text>
          <Text style={styles.infoText}>
            Defina um tempo estimado para sua chegada. Se o relógio zerar antes de você desativá-lo, o aplicativo acionará silenciosamente **todas as Guardiãs** da sua rede In-App com o local exato do seu aparelho.
          </Text>
        </View>

        <Text style={styles.label}>Estimativa do Trajeto</Text>
        <View style={styles.timeSelector}>
          {[10, 15, 30, 60].map((val) => (
            <TouchableOpacity
              key={val}
              activeOpacity={0.8}
              onPress={() => setMinutes(val)}
              style={[styles.timeBtn, minutes === val && styles.timeBtnSelected]}
            >
               <Text style={[styles.timeBtnText, minutes === val && styles.timeBtnTextSelected]}>{val}m</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.btnAction} onPress={handleStart} activeOpacity={0.8}>
           <LinearGradient colors={theme.colors.primaryGradient} style={styles.btnGradient}>
             <Feather name="play" size={18} color="#FFF" style={{ marginRight: 8 }} />
             <Text style={styles.btnText}>Iniciar Trajeto Protegido</Text>
           </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 68, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl,
  },
  backButtonWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },
  contentActive: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
  activeTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginTop: 16 },
  activeSub: { fontSize: 16, color: theme.colors.textMuted, marginTop: 8, textAlign: 'center' },

  infoBox: { backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: 24, borderRadius: theme.borderRadius.xl, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)', marginBottom: 32 },
  infoTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 8 },
  infoText: { fontSize: 14, color: theme.colors.textMuted, lineHeight: 22 },

  label: { fontSize: 12, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 16 },
  timeSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  timeBtn: { flex: 1, backgroundColor: theme.colors.surfaceHighlight, paddingVertical: 16, marginHorizontal: 4, borderRadius: theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  timeBtnSelected: { backgroundColor: 'transparent', borderColor: theme.colors.primary },
  timeBtnText: { color: theme.colors.text, fontWeight: '700', fontSize: 18 },
  timeBtnTextSelected: { color: theme.colors.primary },

  btnAction: { marginTop: 'auto', marginBottom: 40 },
  btnGradient: { flexDirection: 'row', borderRadius: theme.borderRadius.lg, paddingVertical: 18, justifyContent: 'center', alignItems: 'center', ...theme.shadows.glow },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
