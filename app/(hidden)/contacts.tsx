import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useTrustedContacts } from '../../hooks/useTrustedContacts';
import { theme } from '../../constants/theme';
import type { TrustedContact } from '../../lib/contacts';

export default function ContactsScreen() {
  const router = useRouter();
  const { contacts, loading, isFull, add, update, remove } = useTrustedContacts();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<TrustedContact | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);

  function openAddModal() {
    setEditingContact(null);
    setNameInput('');
    setPhoneInput('');
    setModalVisible(true);
  }

  function openEditModal(contact: TrustedContact) {
    setEditingContact(contact);
    setNameInput(contact.name);
    setPhoneInput(contact.phone);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingContact(null);
    setNameInput('');
    setPhoneInput('');
  }

  async function handleSave() {
    if (!nameInput.trim() || !phoneInput.trim()) {
      Alert.alert('Atenção', 'Preencha nome e telefone.');
      return;
    }

    setSaving(true);

    if (editingContact) {
      const { error } = await update(editingContact.id, nameInput, phoneInput);
      setSaving(false);
      if (error) {
        Alert.alert('Erro', error);
      } else {
        closeModal();
      }
    } else {
      const { error } = await add(nameInput, phoneInput);
      setSaving(false);
      if (error) {
        Alert.alert('Erro', error);
      } else {
        closeModal();
      }
    }
  }

  function handleDelete(contact: TrustedContact) {
    Alert.alert(
      'Remover contato',
      `Deseja remover ${contact.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await remove(contact.id);
            if (error) Alert.alert('Erro', error);
          },
        },
      ]
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonWrap} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rede de Apoio</Text>
        <Text style={styles.headerSubtitle}>
          Esses contatos receberão sua localização imediata em situação de risco.
        </Text>
      </View>

      {/* Empty state */}
      {contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Feather name="users" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum contato blindado</Text>
          <Text style={styles.emptyText}>
            Adicione até 5 pessoas de extrema confiança. Nós enviaremos um SMS com sua exata localização.
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => openEditModal(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <View style={styles.contactAvatar}>
                <Text style={styles.contactInitial}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phone}</Text>
              </View>
              <Feather name="edit-2" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Counter */}
      <View style={styles.counterBar}>
        <Feather name="shield" size={14} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
        <Text style={styles.counterText}>
          {contacts.length}/5 Guardiões ativos
        </Text>
      </View>

      {/* FAB to add */}
      {!isFull && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <LinearGradient colors={theme.colors.primaryGradient} style={styles.fabGradient}>
            <Feather name="user-plus" size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalFullOverlay}
        >
          <View style={styles.modalSheetOverlay}>
            <BlurView intensity={90} tint="dark" style={styles.modalSheet}>
              <View style={styles.handleBar} />

              <Text style={styles.modalTitle}>
                {editingContact ? 'Atualizar Vinculo' : 'Adicionar Protetor'}
              </Text>

              <Text style={styles.inputLabel}>NOME DO CONTATO</Text>
              <TextInput
                style={styles.input}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Ex: Mãe, Irmão..."
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="words"
              />

              <Text style={styles.inputLabel}>TELEFONE (COM DDD)</Text>
              <TextInput
                style={styles.input}
                value={phoneInput}
                onChangeText={setPhoneInput}
                placeholder="(11) 99999-9999"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="phone-pad"
              />

              <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.8} style={{ marginTop: 12 }}>
                <LinearGradient colors={theme.colors.primaryGradient} style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingContact ? 'Salvar Edição' : 'Cadastrar na Rede'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  backButtonWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: theme.colors.textMuted,
    marginTop: 8,
    lineHeight: 22,
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
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 140,
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  contactInitial: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  counterBar: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHighlight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  counterText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    ...theme.shadows.glow,
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
  },
  modalFullOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 16,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  saveButton: {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    ...theme.shadows.glow,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
});
