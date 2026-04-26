import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useGuardianCircle } from '../../../hooks/useGuardianCircle';
import { useTrustedContacts } from '../../../hooks/useTrustedContacts';
import { useNetworkChat, type ChatKind, type NetworkChatMessage } from '../../../hooks/useNetworkChat';
import { theme } from '../../../constants/theme';
import { useAuthStore } from '../../../store/useAuthStore';
import { useLocationStore } from '../../../store/useLocationStore';
import { GuardianBottomNav } from '../../../components/GuardianBottomNav';
import type { TrustedContact } from '../../../lib/contacts';

type ActiveTab = 'contacts' | 'circle' | 'chat';

function formatChatTime(date: string) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function NetworkScreen() {
  const router = useRouter();
  const { members, loading: membersLoading, addByCode, removeMember, refresh } = useGuardianCircle();
  const { contacts, loading: contactsLoading, isFull, add, update, remove } = useTrustedContacts();
  const { profile } = useAuthStore();
  const { location } = useLocationStore();
  const { messages, loading: chatLoading, backendReady, participantCount, fetchMessages, sendMessage } = useNetworkChat(members);

  const [activeTab, setActiveTab] = useState<ActiveTab>('contacts');
  const [searchInput, setSearchInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatKind, setChatKind] = useState<ChatKind>('text');
  const [sendingChat, setSendingChat] = useState(false);

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<TrustedContact | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');

  function openAddContact() {
    setEditingContact(null);
    setNameInput('');
    setPhoneInput('');
    setContactModalVisible(true);
  }

  function openEditContact(contact: TrustedContact) {
    setEditingContact(contact);
    setNameInput(contact.name);
    setPhoneInput(contact.phone);
    setContactModalVisible(true);
  }

  function closeContactModal() {
    setContactModalVisible(false);
    setEditingContact(null);
    setNameInput('');
    setPhoneInput('');
  }

  async function handleSaveContact() {
    if (!nameInput.trim() || !phoneInput.trim()) {
      Alert.alert('Atenção', 'Preencha nome e telefone.');
      return;
    }

    setSavingContact(true);
    const result = editingContact
      ? await update(editingContact.id, nameInput.trim(), phoneInput.trim())
      : await add(nameInput.trim(), phoneInput.trim());
    setSavingContact(false);

    if (result.error) {
      Alert.alert('Erro', result.error);
      return;
    }

    closeContactModal();
  }

  function handleDeleteContact(contact: TrustedContact) {
    Alert.alert('Remover contato', `Deseja remover ${contact.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const { error } = await remove(contact.id);
          if (error) Alert.alert('Erro', error);
        },
      },
    ]);
  }

  async function handleAddMember() {
    if (searchInput.trim().length < 3) {
      Alert.alert('Código ou nome inválido', 'Insira um código válido ou um @username.');
      return;
    }

    setAdding(true);
    const { error } = await addByCode(searchInput.trim());
    setAdding(false);

    if (error) {
      Alert.alert('Erro', error);
      return;
    }

    Alert.alert('Sucesso', 'Integrante vinculada à sua rede.');
    setSearchInput('');
  }

  function handleRemoveMember(relationId: string) {
    Alert.alert('Remover', 'Deseja desconectar esta integrante do seu círculo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desconectar', style: 'destructive', onPress: () => removeMember(relationId) },
    ]);
  }

  async function handleSendChat() {
    setSendingChat(true);
    const { error } = await sendMessage({ kind: chatKind, body: chatText });
    setSendingChat(false);

    if (error) {
      Alert.alert('Chat indisponível', error);
      return;
    }

    setChatText('');
    setChatKind('text');
  }

  async function handleShareLocation() {
    if (!location) {
      Alert.alert('Localização indisponível', 'Abra o mapa uma vez para atualizar sua localização.');
      return;
    }

    setSendingChat(true);
    const { error } = await sendMessage({
      kind: 'location',
      body: 'Compartilhei minha localização atual.',
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    });
    setSendingChat(false);

    if (error) Alert.alert('Chat indisponível', error);
  }

  async function handleSendImage() {
    if (!imageUrlInput.trim()) {
      Alert.alert('Imagem', 'Cole um link de imagem para enviar.');
      return;
    }

    setSendingChat(true);
    const { error } = await sendMessage({
      kind: 'image',
      body: imageCaptionInput.trim() || 'Imagem compartilhada.',
      imageUrl: imageUrlInput.trim(),
    });
    setSendingChat(false);

    if (error) {
      Alert.alert('Chat indisponível', error);
      return;
    }

    setImageUrlInput('');
    setImageCaptionInput('');
    setImageModalVisible(false);
  }

  function renderContact({ item }: { item: TrustedContact }) {
    return (
      <TouchableOpacity
        style={styles.personRow}
        onPress={() => openEditContact(item)}
        onLongPress={() => handleDeleteContact(item)}
        activeOpacity={0.75}
      >
        <View style={styles.contactAvatar}>
          <Text style={styles.contactInitial}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.personCopy}>
          <Text style={styles.personName}>{item.name}</Text>
          <Text style={styles.personMeta}>{item.phone}</Text>
        </View>
        <Feather name="edit-2" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  }

  function renderChatMessage({ item }: { item: NetworkChatMessage }) {
    const author = item.is_own
      ? 'Você'
      : item.author_username
        ? `@${item.author_username}`
        : item.author_name || 'Integrante';
    const mapUrl = item.lat && item.lng ? `https://maps.google.com/?q=${item.lat},${item.lng}` : null;

    return (
      <View style={[styles.messageRow, item.is_own && styles.messageRowOwn]}>
        <View style={[styles.messageBubble, item.is_own && styles.messageBubbleOwn]}>
          <Text style={styles.messageAuthor}>{author} • {formatChatTime(item.created_at)}</Text>
          {item.kind === 'location' && (
            <View style={styles.messageAttachment}>
              <Feather name="map-pin" size={16} color={theme.colors.primary} />
              <Text style={styles.messageAttachmentText}>{mapUrl || 'Localização compartilhada'}</Text>
            </View>
          )}
          {item.kind === 'image' && item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.chatImage} resizeMode="cover" />
          )}
          {item.kind === 'news' && (
            <View style={styles.newsBadge}>
              <Feather name="file-text" size={13} color={theme.colors.primary} />
              <Text style={styles.newsBadgeText}>Notícia</Text>
            </View>
          )}
          <Text style={styles.messageBody}>{item.body}</Text>
        </View>
      </View>
    );
  }

  function renderContacts() {
    if (contactsLoading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    return (
      <View style={styles.content}>
        <View style={styles.actionHeader}>
          <View>
            <Text style={styles.sectionTitle}>CONTATOS SMS</Text>
            <Text style={styles.sectionDescription}>Pessoas externas que recebem sua localização pelo app de mensagens.</Text>
          </View>
          {!isFull && (
            <TouchableOpacity style={styles.smallAddButton} onPress={openAddContact} activeOpacity={0.8}>
              <Feather name="user-plus" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="message-square" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum contato SMS</Text>
            <Text style={styles.emptyText}>
              Cadastre até 5 pessoas de confiança para receberem SMS em situações de risco.
            </Text>
            <TouchableOpacity style={styles.emptyAction} onPress={openAddContact} activeOpacity={0.8}>
              <Text style={styles.emptyActionText}>Adicionar contato</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            renderItem={renderContact}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              <View style={styles.counterPill}>
                <Feather name="shield" size={14} color={theme.colors.textMuted} />
                <Text style={styles.counterText}>{contacts.length}/5 contatos ativos</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  function renderCircle() {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>CÍRCULO PRIVADO</Text>
          <Text style={styles.sectionDescription}>Pessoas que usam o app e podem conversar com você no chat.</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="@USERNAME OU CÓDIGO"
              placeholderTextColor={theme.colors.textMuted}
              value={searchInput}
              onChangeText={setSearchInput}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleAddMember} disabled={adding}>
              {adding ? <ActivityIndicator color="#FFF" size="small" /> : <Feather name="plus" size={20} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </View>

        {membersLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="users" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Seu círculo privado</Text>
            <Text style={styles.emptyText}>
              Adicione pessoas conhecidas por código ou @username para liberar a conversa em tempo real.
            </Text>
            <Text style={styles.myCodeHint}>Seu código: {profile?.share_code?.toUpperCase() || '---'}</Text>
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.relation_id}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={membersLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.personRow}>
                <View style={styles.memberAvatar}>
                  <Feather name="user" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.personCopy}>
                  <Text style={styles.personName}>{item.full_name || 'Integrante'}</Text>
                  <Text style={styles.personMeta}>{item.username ? `@${item.username}` : `Score: ${item.reputation_score || 0}`}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveMember(item.relation_id)}>
                  <Feather name="trash-2" size={20} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    );
  }

  function renderChat() {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <View>
            <Text style={styles.sectionTitle}>CHAT DA REDE</Text>
            <Text style={styles.sectionDescription}>{participantCount} pessoa(s) conectada(s) ao seu círculo.</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={fetchMessages} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {!backendReady && (
          <View style={styles.backendNotice}>
            <Feather name="database" size={18} color={theme.colors.primary} />
            <Text style={styles.backendNoticeText}>
              Aplique `supabase_network_chat_schema.sql` no Supabase e habilite Realtime para ativar o chat.
            </Text>
          </View>
        )}

        {chatLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderChatMessage}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={chatLoading} onRefresh={fetchMessages} tintColor={theme.colors.primary} />}
            contentContainerStyle={styles.chatList}
            ListEmptyComponent={
              <View style={styles.emptyStateCompact}>
                <Feather name="message-circle" size={32} color={theme.colors.primary} />
                <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
                <Text style={styles.emptyText}>Envie uma mensagem para iniciar o chat com sua rede.</Text>
              </View>
            }
          />
        )}

        <View style={styles.chatComposer}>
          <View style={styles.chatActions}>
            <TouchableOpacity style={styles.chatAction} onPress={handleShareLocation} disabled={sendingChat}>
              <Feather name="map-pin" size={16} color={theme.colors.primary} />
              <Text style={styles.chatActionText}>Local</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chatAction, chatKind === 'news' && styles.chatActionActive]}
              onPress={() => setChatKind(chatKind === 'news' ? 'text' : 'news')}
            >
              <Feather name="file-text" size={16} color={chatKind === 'news' ? '#FFF' : theme.colors.primary} />
              <Text style={[styles.chatActionText, chatKind === 'news' && styles.chatActionTextActive]}>Notícia</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatAction} onPress={() => setImageModalVisible(true)}>
              <Feather name="image" size={16} color={theme.colors.primary} />
              <Text style={styles.chatActionText}>Imagem</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatText}
              onChangeText={setChatText}
              placeholder={chatKind === 'news' ? 'Escreva a notícia para sua rede...' : 'Mensagem para sua rede...'}
              placeholderTextColor={theme.colors.textMuted}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendChat} disabled={sendingChat}>
              {sendingChat ? <ActivityIndicator color="#FFF" size="small" /> : <Feather name="send" size={18} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonWrap} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rede de Apoio</Text>
        <Text style={styles.headerSubtitle}>
          Centralize contatos SMS, círculo privado e conversa em tempo real.
        </Text>

        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, activeTab === 'contacts' && styles.tabActive]} onPress={() => setActiveTab('contacts')}>
            <Feather name="message-square" size={15} color={activeTab === 'contacts' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'circle' && styles.tabActive]} onPress={() => setActiveTab('circle')}>
            <Feather name="users" size={15} color={activeTab === 'circle' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'circle' && styles.tabTextActive]}>Círculo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'chat' && styles.tabActive]} onPress={() => setActiveTab('chat')}>
            <Feather name="message-circle" size={15} color={activeTab === 'chat' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'contacts' ? renderContacts() : activeTab === 'circle' ? renderCircle() : renderChat()}

      <Modal visible={contactModalVisible} transparent animationType="slide" onRequestClose={closeContactModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFullOverlay}>
          <View style={styles.modalSheetOverlay}>
            <BlurView intensity={90} tint="dark" style={styles.modalSheet}>
              <View style={styles.handleBar} />
              <Text style={styles.modalTitle}>{editingContact ? 'Atualizar contato' : 'Adicionar contato SMS'}</Text>

              <Text style={styles.inputLabel}>NOME DO CONTATO</Text>
              <TextInput
                style={styles.input}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Ex: Mãe, irmã, amiga..."
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="words"
              />

              <Text style={styles.inputLabel}>TELEFONE COM DDD</Text>
              <TextInput
                style={styles.input}
                value={phoneInput}
                onChangeText={setPhoneInput}
                placeholder="(11) 99999-9999"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="phone-pad"
              />

              <TouchableOpacity onPress={handleSaveContact} disabled={savingContact} activeOpacity={0.8} style={{ marginTop: 12 }}>
                <LinearGradient colors={theme.colors.primaryGradient} style={[styles.saveButton, savingContact && styles.saveButtonDisabled]}>
                  {savingContact ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>{editingContact ? 'Salvar edição' : 'Cadastrar contato'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={closeContactModal} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={imageModalVisible} transparent animationType="slide" onRequestClose={() => setImageModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalFullOverlay}>
          <View style={styles.modalSheetOverlay}>
            <BlurView intensity={90} tint="dark" style={styles.modalSheet}>
              <View style={styles.handleBar} />
              <Text style={styles.modalTitle}>Enviar imagem</Text>
              <Text style={styles.inputLabel}>LINK DA IMAGEM</Text>
              <TextInput
                style={styles.input}
                value={imageUrlInput}
                onChangeText={setImageUrlInput}
                placeholder="https://..."
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>LEGENDA</Text>
              <TextInput
                style={styles.input}
                value={imageCaptionInput}
                onChangeText={setImageCaptionInput}
                placeholder="Contexto da imagem"
                placeholderTextColor={theme.colors.textMuted}
              />
              <TouchableOpacity onPress={handleSendImage} disabled={sendingChat} activeOpacity={0.8} style={{ marginTop: 12 }}>
                <LinearGradient colors={theme.colors.primaryGradient} style={[styles.saveButton, sendingChat && styles.saveButtonDisabled]}>
                  {sendingChat ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveButtonText}>Enviar imagem</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setImageModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <GuardianBottomNav active="support" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingTop: 68,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  backButtonWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  headerSubtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 8, lineHeight: 22 },
  tabBar: { flexDirection: 'row', gap: 8, marginTop: 18 },
  tab: {
    flex: 1,
    height: 42,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { borderColor: theme.colors.primary, backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  tabText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: theme.colors.primary },

  content: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingBottom: 116 },
  chatContent: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingBottom: 108 },
  actionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: theme.colors.primary, letterSpacing: 1, marginBottom: 6 },
  sectionDescription: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, maxWidth: 260 },
  smallAddButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', ...theme.shadows.glow },
  addSection: { marginBottom: theme.spacing.xl },
  searchRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  searchInput: {
    flex: 1,
    height: 54,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  searchBtn: { width: 54, height: 54, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 128, gap: 12 },

  personRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  personCopy: { flex: 1 },
  personName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  personMeta: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4, fontWeight: '600' },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(139, 92, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' },
  contactInitial: { color: theme.colors.primary, fontSize: 17, fontWeight: '800' },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(139, 92, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  counterPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surfaceHighlight, paddingVertical: 10, paddingHorizontal: 14, borderRadius: theme.borderRadius.round, borderWidth: 1, borderColor: theme.colors.border, marginTop: 4 },
  counterText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingBottom: 80 },
  emptyStateCompact: { alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: 36 },
  emptyIconCircle: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(139, 92, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 12, marginBottom: 8, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 14, lineHeight: 22 },
  emptyAction: { marginTop: 18, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: 18, paddingVertical: 12 },
  emptyActionText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  myCodeHint: { textAlign: 'center', color: theme.colors.primary, fontSize: 13, fontWeight: '700', marginTop: 24, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: theme.borderRadius.md },

  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  backendNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.25)', backgroundColor: 'rgba(139, 92, 246, 0.08)', padding: 12, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
  backendNoticeText: { flex: 1, color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  chatList: { paddingBottom: 14 },
  messageRow: { alignItems: 'flex-start', marginBottom: 10 },
  messageRowOwn: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '86%', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 12 },
  messageBubbleOwn: { backgroundColor: 'rgba(139, 92, 246, 0.22)', borderColor: 'rgba(139, 92, 246, 0.45)' },
  messageAuthor: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  messageBody: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },
  messageAttachment: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139, 92, 246, 0.12)', borderRadius: 12, padding: 10, marginBottom: 8 },
  messageAttachmentText: { flex: 1, color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  newsBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139, 92, 246, 0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  newsBadgeText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  chatImage: { width: 220, height: 140, borderRadius: 14, backgroundColor: theme.colors.surfaceHighlight, marginBottom: 8 },
  chatComposer: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, paddingBottom: 8 },
  chatActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chatAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 34, borderRadius: 17, backgroundColor: theme.colors.surfaceHighlight, borderWidth: 1, borderColor: theme.colors.border },
  chatActionActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chatActionText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  chatActionTextActive: { color: '#FFF' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  chatInput: { flex: 1, maxHeight: 92, minHeight: 46, backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, color: theme.colors.text, fontSize: 14 },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },

  modalFullOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: theme.spacing.lg, paddingTop: 16, paddingBottom: 40, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  handleBar: { width: 40, height: 5, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 3, alignSelf: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginBottom: theme.spacing.xl },
  inputLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 16, paddingHorizontal: theme.spacing.md, fontSize: 16, color: theme.colors.text, marginBottom: theme.spacing.lg },
  saveButton: { borderRadius: theme.borderRadius.lg, paddingVertical: 18, alignItems: 'center', ...theme.shadows.glow },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelButton: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: theme.colors.textMuted, fontSize: 16, fontWeight: '600' },
});
