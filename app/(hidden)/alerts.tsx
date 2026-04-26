import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useGuardianAlerts, GuardianAlert } from '../../hooks/useGuardianAlerts';
import { theme } from '../../constants/theme';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function AlertsScreen() {
  const router = useRouter();
  const { alerts, loading, unseenCount, fetchAlerts, markAsSeen, markAllSeen } = useGuardianAlerts();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  }

  function openMap(alert: GuardianAlert) {
    markAsSeen(alert.id);
    const url = `https://maps.google.com/?q=${alert.lat},${alert.lng}`;
    Linking.openURL(url);
  }

  function renderAlert({ item }: { item: GuardianAlert }) {
    return (
      <TouchableOpacity 
        style={[styles.alertCard, !item.seen && styles.alertCardUnseen]}
        onPress={() => openMap(item)}
        activeOpacity={0.7}
      >
        <View style={styles.alertLeft}>
          <View style={[styles.alertIcon, !item.seen && styles.alertIconUnseen]}>
            <Feather 
              name="alert-triangle" 
              size={20} 
              color={!item.seen ? '#FFF' : theme.colors.textMuted} 
            />
          </View>
          <View style={styles.alertContent}>
            <View style={styles.alertNameRow}>
              <Text style={styles.alertName}>{item.sender_name}</Text>
              {item.sender_username && (
                <Text style={styles.alertUsername}>@{item.sender_username}</Text>
              )}
            </View>
            <Text style={styles.alertMessage} numberOfLines={2}>
              {item.message || 'Enviou um alerta de localização.'}
            </Text>
            <Text style={styles.alertTime}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
        <View style={styles.alertRight}>
          <Feather name="map-pin" size={16} color={theme.colors.primary} />
          <Text style={styles.alertMapText}>Ver local</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Alertas Recebidos</Text>
          {unseenCount > 0 && (
            <Text style={styles.headerSubtitle}>{unseenCount} alerta{unseenCount > 1 ? 's' : ''} não lido{unseenCount > 1 ? 's' : ''}</Text>
          )}
        </View>
        {unseenCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllSeen}>
            <Feather name="check-circle" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="bell-off" size={40} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Tudo tranquilo</Text>
          <Text style={styles.emptyText}>
            Nenhuma guardiã da sua rede acionou um alerta recentemente. Continue vigilante!
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 16,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: theme.colors.danger, fontWeight: '600', marginTop: 2 },
  markAllBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 14, lineHeight: 22 },

  list: { padding: theme.spacing.lg },
  
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  alertCardUnseen: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },

  alertLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  alertIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  alertIconUnseen: {
    backgroundColor: theme.colors.danger,
  },
  alertContent: { flex: 1 },
  alertNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  alertName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  alertUsername: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', marginLeft: 6 },
  alertMessage: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
  alertTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4, fontWeight: '600' },

  alertRight: { alignItems: 'center', marginLeft: 8 },
  alertMapText: { fontSize: 10, color: theme.colors.primary, fontWeight: '700', marginTop: 4 },
});
