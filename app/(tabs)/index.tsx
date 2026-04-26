import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useLocationStore } from '../../store/useLocationStore';
import { dispatchAlert } from '../../lib/dispatchAlert';

interface FakeNote {
  id: string;
  title: string;
  preview: string;
  date: string;
  color: string;
  isLarge?: boolean;
}

const FAKE_NOTES: FakeNote[] = [
  {
    id: '1',
    title: 'Lista de Compras da Semana',
    preview: '- Leite desnatado\n- Ovos caipiras\n- Café moído\n- Pão integral\n- Queijo minas',
    date: 'Hoje',
    color: '#8B5CF6',
    isLarge: true,
  },
  {
    id: '2',
    title: 'Ideias TCC',
    preview: '1. Segurança Urbana\n2. Cidades Inteligentes',
    date: 'Ontem',
    color: '#3B82F6',
  },
  {
    id: '3',
    title: 'Estudos',
    preview: 'Revisar normalização de BD amanhã',
    date: '12 Abr',
    color: '#10B981',
  },
  {
    id: '4',
    title: 'Senhas Wifi',
    preview: 'Casa: router_5g_senha\nTrabalho: wifi_guest_visit',
    date: '10 Abr',
    color: '#F43F5E',
  },
  {
    id: '5',
    title: 'Contas',
    preview: 'Vencimento luz: 15/04\nVencimento internet: 20/04',
    date: '8 Abr',
    color: '#F59E0B',
  },
];

export default function NotesScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { location } = useLocationStore();

  async function handleFakeSOS() {
    // Se a usuária nunca logou no app secreto, falha silenciosamente
    if (!session?.user?.id) {
       Alert.alert('Sincronização', 'Suas notas foram sincronizadas com a nuvem.');
       return;
    }
    
    // Dispara alerta para TODOS os canais (emergency_alerts + guardiãs in-app)
    await dispatchAlert({
      userId: session.user.id,
      lat: location?.coords.latitude || 0,
      lng: location?.coords.longitude || 0,
      channel: 'facade_notes',
      message: 'Alerta acionado via Lumina Notes.',
    });
    
    // Dá um feedback tátil de sucesso e uma mensagem que não levanta suspeita
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    Alert.alert('Nota Sincronizada', 'Suas alterações foram salvas na nuvem com sucesso.');
  }

  function handleFabPress() {
    Alert.alert('Funcionalidade indisponível', 'A criação de notas ainda está em desenvolvimento.');
  }

  async function handleFabLongPress() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Haptics not available on this device
    }
    router.push('/(hidden)/map');
  }

  const renderNote = ({ item }: { item: FakeNote }) => (
    <TouchableOpacity 
      style={[
        styles.noteCard, 
        item.isLarge && styles.noteCardLarge
      ]} 
      activeOpacity={0.8}
      onLongPress={() => {
        if (item.id === '1') {
          handleFakeSOS();
        } else {
          Alert.alert('Nota arquivada', 'Item arquivado localmente.');
        }
      }}
    >
      <View style={[styles.noteHeader]}>
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
        <Text style={styles.noteDate}>{item.date}</Text>
      </View>
      
      <Text style={styles.noteTitle} numberOfLines={item.isLarge ? 2 : 1}>
        {item.title}
      </Text>
      <Text style={styles.notePreview} numberOfLines={item.isLarge ? 5 : 3}>
        {item.preview}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Bom dia,</Text>
            <Text style={styles.headerTitle}>Minhas Notas</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <Text style={styles.profileInitial}>
              {session?.user?.email?.charAt(0).toUpperCase() || 'E'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={20} color={theme.colors.textMuted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar notas..."
            placeholderTextColor={theme.colors.textMuted}
            editable={false}
          />
        </View>
      </View>

      {/* Masonry-style list simulation */}
      <FlatList
        data={FAKE_NOTES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={renderNote}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Main FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleFabPress}
        onLongPress={handleFabLongPress}
        delayLongPress={600}
        activeOpacity={0.85}
      >
        <Feather name="edit-2" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 68,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
  },
  row: {
    flex: 1,
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  noteCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 140,
  },
  noteCardLarge: {
    minHeight: 180,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noteDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  notePreview: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.glow,
  },
});
