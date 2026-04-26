import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSettingsStore, DisguiseMode } from '../../../store/useSettingsStore';
import { useLocationSharing } from '../../../hooks/useLocationSharing';
import { supabase } from '../../../lib/supabase';
import { theme } from '../../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, profile, setProfile } = useAuthStore();
  const { disguiseMode, setDisguiseMode } = useSettingsStore();
  const { sharingMode, updateSharingMode } = useLocationSharing();

  React.useEffect(() => {
    async function fetchFresh() {
      if (session?.user?.id) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) setProfile(data);
      }
    }
    fetchFresh();
  }, [session, setProfile]);

  async function handleLogout() {
    Alert.alert(
      'Desconectar',
      'Tem certeza que deseja sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          setProfile(null);
        }}
      ]
    );
  }

  // Get medals array
  const medals = profile?.medals || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonWrap} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Feather name="user" size={40} color={theme.colors.primary} />
          {profile?.kyc_verified && (
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={12} color="#FFF" />
            </View>
          )}
        </View>
        <Text style={styles.fullNameText}>
          {profile?.full_name || session?.user?.user_metadata?.full_name || 'Usuária'}
        </Text>
        {profile?.username && <Text style={styles.usernameText}>@{profile.username}</Text>}
        <Text style={styles.emailSmall}>{session?.user?.email}</Text>
        <View style={styles.scoreBadge}>
          <Feather name="star" size={14} color={theme.colors.primary} />
          <Text style={styles.scoreText}>Score: {profile?.reputation_score || 0}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SEU CÓDIGO GUARDIÃ</Text>
        <TouchableOpacity 
          style={styles.codeBox} 
          activeOpacity={0.8} 
          onPress={async () => {
            if (profile?.share_code) {
              await Clipboard.setStringAsync(profile.share_code.toUpperCase());
              Alert.alert('Código copiado!', 'O seu código está na área de transferência.');
            }
          }}
        >
          <Text style={styles.codeText}>{profile?.share_code ? profile.share_code.toUpperCase() : '...'}</Text>
          <Feather name="copy" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.codeHint}>Compartilhe com mulheres que você confia.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MINHAS MEDALHAS</Text>
        {medals.length === 0 ? (
          <View style={styles.emptyMedals}>
            <Text style={styles.emptyMedalsText}>Nenhuma medalha conquistada ainda. Ajude a relatar pontos de risco e proteger outras mulheres na rede.</Text>
          </View>
        ) : (
          <View style={styles.medalsGrid}>
             {medals.map((medal, index) => (
                <View key={index} style={styles.medalCard}>
                   <Feather name="award" size={24} color={theme.colors.primary} />
                   <Text style={styles.medalName}>{medal}</Text>
                </View>
             ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LOCALIZAÇÃO EM TEMPO REAL</Text>
        <Text style={styles.sectionDesc}>Quem pode ver sua posição em tempo real no mapa da rede.</Text>
        
        <View style={styles.radioGroup}>
          <TouchableOpacity 
            style={[styles.radioBtn, sharingMode === 'everyone' && styles.radioBtnActive]} 
            onPress={() => updateSharingMode('everyone')}
          >
            <Feather name="users" size={18} color={sharingMode === 'everyone' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.radioText, sharingMode === 'everyone' && styles.radioTextActive]}>Toda a Rede</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.radioBtn, sharingMode === 'selected' && styles.radioBtnActive]} 
            onPress={() => updateSharingMode('selected')}
          >
            <Feather name="user-check" size={18} color={sharingMode === 'selected' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.radioText, sharingMode === 'selected' && styles.radioTextActive]}>Apenas Selecionados</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.radioBtn, sharingMode === 'nobody' && styles.radioBtnActive]} 
            onPress={() => updateSharingMode('nobody')}
          >
            <Feather name="eye-off" size={18} color={sharingMode === 'nobody' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.radioText, sharingMode === 'nobody' && styles.radioTextActive]}>Ninguém</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONFIGURAÇÃO DE DISFARCE</Text>
        <Text style={styles.sectionDesc}>Escolha qual app falso aparecerá ao abrir normalmente.</Text>
        
        <View style={styles.radioGroup}>
          <TouchableOpacity 
            style={[styles.radioBtn, disguiseMode === 'none' && styles.radioBtnActive]} 
            onPress={() => setDisguiseMode('none')}
          >
            <Feather name="shield" size={18} color={disguiseMode === 'none' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.radioText, disguiseMode === 'none' && styles.radioTextActive]}>Direto (Sem disfarce)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.radioBtn, disguiseMode === 'notes' && styles.radioBtnActive]} 
            onPress={() => setDisguiseMode('notes')}
          >
            <Feather name="file-text" size={18} color={disguiseMode === 'notes' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.radioText, disguiseMode === 'notes' && styles.radioTextActive]}>Lumina Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.radioBtn, disguiseMode === 'food' && styles.radioBtnActive]} 
            onPress={() => setDisguiseMode('food')}
          >
            <Feather name="shopping-bag" size={18} color={disguiseMode === 'food' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.radioText, disguiseMode === 'food' && styles.radioTextActive]}>Delivery App</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SEGURANÇA E ACESSO</Text>

        <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
          <Feather name="lock" size={20} color={theme.colors.textMuted} />
          <Text style={styles.settingsText}>Trocar Senha Principal</Text>
          <Feather name="chevron-right" size={20} color={theme.colors.border} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
          <Feather name="eye-off" size={20} color={theme.colors.textMuted} />
          <Text style={styles.settingsText}>Configurar PIN de Coação (Duress)</Text>
          <Feather name="chevron-right" size={20} color={theme.colors.border} />
        </TouchableOpacity>

      </View>

      <TouchableOpacity onPress={handleLogout} activeOpacity={0.8} style={styles.logoutWrapper}>
         <LinearGradient colors={theme.colors.dangerGradient} style={styles.logoutButton}>
           <Feather name="log-out" size={18} color="#FFF" style={{ marginRight: 8 }} />
           <Text style={styles.logoutButtonText}>Desconectar e Limpar Sessão</Text>
         </LinearGradient>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 68,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  backButtonWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  fullNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  emailSmall: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 4,
  },
  codeHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  emptyMedals: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyMedalsText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  medalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  medalCard: {
    backgroundColor: theme.colors.surfaceHighlight,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  medalName: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingsText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  logoutWrapper: {
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.dangerGlow,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDesc: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 20, marginBottom: 16 },
  radioGroup: { gap: 12 },
  radioBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  radioBtnActive: { borderColor: theme.colors.primary, backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  radioText: { marginLeft: 12, color: theme.colors.textMuted, fontSize: 15, fontWeight: '600' },
  radioTextActive: { color: theme.colors.primary },
});
