import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '../../store/useAuthStore';
import { useLocationStore } from '../../store/useLocationStore';
import { useTrustedContacts } from '../../hooks/useTrustedContacts';
import { prepareAlert, openComposer, updateAlertStatus } from '../../lib/sendAlert';
import { theme } from '../../constants/theme';

export default function SendLocationScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { location } = useLocationStore();
  const { contacts, loading: contactsLoading } = useTrustedContacts();

  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!session?.user?.id) return;
    if (!location) {
      Alert.alert('Erro', 'Localização indisponível. Aguarde a obtenção do GPS.');
      return;
    }

    setSending(true);

    const { data: prepared, error } = await prepareAlert(
      session.user.id,
      location.coords.latitude,
      location.coords.longitude,
      contacts
    );

    if (error || !prepared) {
      setSending(false);
      Alert.alert('Erro', error || 'Falha ao preparar envio.');
      return;
    }

    const resultStatus = await openComposer(prepared);
    await updateAlertStatus(prepared.alertId, resultStatus);

    setSending(false);

    if (resultStatus === 'failed') {
      Alert.alert('Erro', 'Não foi possível abrir o compositor de mensagens.');
    } else if (resultStatus === 'share_opened') {
      Alert.alert('Pronto', 'Compartilhamento aberto.');
    } else {
      Alert.alert('Pronto', 'Mensagem pronta para envio.');
    }
  }

  if (contactsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonWrap} onPress={() => router.back()} activeOpacity={0.7} disabled={sending}>
          <Feather name="arrow-left" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.dangerIconBadge}>
          <Feather name="shield-alert" size={40} color={theme.colors.danger} />
        </View>
        <Text style={styles.headerTitle}>Disparar Alerta</Text>
        <Text style={styles.headerSubtitle}>
          Sua localização será enviada imediatamente para sua rede de contatos.
        </Text>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Feather name="user-x" size={32} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum contato</Text>
          <Text style={styles.emptyText}>
            Você ainda não adicionou guardiões à sua rede.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(hidden)/contacts')} activeOpacity={0.8}>
            <LinearGradient colors={theme.colors.primaryGradient} style={styles.addContactButton}>
              <Text style={styles.addContactText}>Cadastrar Contatos</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.infoBadge}>
            <Feather name="info" size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>Destinatários ({contacts.length}) informados via App de Mensagens</Text>
          </View>

          <View style={styles.listContainer}>
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={[
                  styles.recipientRow,
                  index === contacts.length - 1 && { borderBottomWidth: 0 }
                ]}>
                  <View style={styles.recipientLeft}>
                    <View style={styles.recipientAvatar}>
                      <Feather name="user" size={16} color={theme.colors.textMuted} />
                    </View>
                    <View>
                      <Text style={styles.recipientName}>{item.name}</Text>
                      <Text style={styles.recipientPhone}>{item.phone}</Text>
                    </View>
                  </View>
                </View>
              )}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSend} disabled={sending} activeOpacity={0.8}>
              <LinearGradient 
                colors={theme.colors.dangerGradient} 
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              >
                {sending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Feather name="navigation" size={20} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.sendButtonText}>Compartilhar Agora</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.footerNote}>
              Este disparo não contacta as autoridades automaticamente. Se estiver em iminente perigo, ligue 190.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 68,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  backButtonWrap: {
    position: 'absolute',
    top: 68,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.3)',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  addContactButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.glow,
  },
  addContactText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHighlight,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recipientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recipientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  recipientPhone: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    paddingBottom: 40,
  },
  sendButton: {
    flexDirection: 'row',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.dangerGlow,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerNote: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
  },
});
