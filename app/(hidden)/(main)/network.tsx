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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useGuardianCircle } from '../../../hooks/useGuardianCircle';
import { theme } from '../../../constants/theme';
import { useAuthStore } from '../../../store/useAuthStore';

export default function NetworkScreen() {
  const router = useRouter();
  const { members, loading, addByCode, removeMember } = useGuardianCircle();
  const { profile } = useAuthStore();

  const [searchInput, setSearchInput] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (searchInput.trim().length < 3) {
      Alert.alert('Código ou Nome Inválido', 'Insira um código válido (6 caracteres) ou um nome de usuária (@).');
      return;
    }

    setAdding(true);
    // Envia exatamente o que foi digitado. A lógica backend usa toLowerCase.
    const { error } = await addByCode(searchInput.trim());
    setAdding(false);

    if (error) {
      Alert.alert('Erro', error);
    } else {
      Alert.alert('Sucesso', 'Guardiã vinculada à sua rede!');
      setSearchInput('');
    }
  }

  function handleRemove(relationId: string) {
     Alert.alert('Remover', 'Deseja desconectar esta heroína do seu Círculo?', [
       {text: 'Cancelar', style: 'cancel'},
       {text: 'Desconectar', style: 'destructive', onPress: () => removeMember(relationId)}
     ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonWrap} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Círculo de Guardiãs</Text>
        <Text style={styles.headerSubtitle}>
          Sua aliança de Círculo Fechado In-App. Conecte-se com segurança.
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.content}>
        
        <TouchableOpacity style={styles.smsButton} onPress={() => router.push('/(hidden)/contacts')} activeOpacity={0.8}>
           <Feather name="message-square" size={20} color={theme.colors.primary} />
           <View style={{ flex: 1, marginLeft: 12 }}>
             <Text style={styles.smsBtnTitle}>Apoio Externo (SMS)</Text>
             <Text style={styles.smsBtnDesc}>Configurar contatos que receberão SMS sem depender do app.</Text>
           </View>
           <Feather name="chevron-right" size={20} color={theme.colors.border} />
        </TouchableOpacity>

        <View style={styles.addSection}>
           <Text style={styles.sectionTitle}>ADICIONAR UMA GUARDIÃ</Text>
           <View style={styles.searchRow}>
             <TextInput 
               style={styles.searchInput}
               placeholder="@USERNAME OU CÓDIGO"
               placeholderTextColor={theme.colors.textMuted}
               value={searchInput}
               onChangeText={setSearchInput}
               autoCapitalize="none"
             />
             <TouchableOpacity style={styles.searchBtn} onPress={handleAdd} disabled={adding}>
               {adding ? <ActivityIndicator color="#FFF" size="small"/> : <Feather name="plus" size={20} color="#FFF" />}
             </TouchableOpacity>
           </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
               <Feather name="shield" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sua Rede de Prata</Text>
            <Text style={styles.emptyText}>
               Seu círculo de monitoria ativa em tempo real. Você não adicionou ninguém através do app ainda. Use o código alfanumérico ou procure pelo @username das suas conhecidas acima.
            </Text>
            <Text style={styles.myCodeHint}>O seu código de indicação invisível é: {profile?.share_code || '---'}</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
             <FlatList
                data={members}
                keyExtractor={(item) => item.relation_id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <View style={[
                    styles.memberRow,
                    index === members.length - 1 && { borderBottomWidth: 0 }
                  ]}>
                    <View style={styles.memberLeft}>
                      <View style={styles.memberAvatar}>
                        <Feather name="user" size={18} color={theme.colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.memberName}>{item.full_name || 'Guardiã'}</Text>
                        <Text style={styles.memberPhone}>{item.username ? `@${item.username}` : `Score: ${item.reputation_score || 0}`}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleRemove(item.relation_id)}>
                       <Feather name="trash-2" size={20} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}
             />
          </View>
        )}
      </KeyboardAvoidingView>
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 8, lineHeight: 22 },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },

  smsButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 92, 246, 0.05)', padding: 16, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)', marginTop: 8 },
  smsBtnTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  smsBtnDesc: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 16 },

  addSection: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: theme.colors.primary, letterSpacing: 1, marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 12 },
  searchInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 16, color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  searchBtn: { width: 56, height: 56, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },

  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(139, 92, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 14, lineHeight: 22, },
  myCodeHint: { textAlign: 'center', color: theme.colors.primary, fontSize: 13, fontWeight: '700', marginTop: 24, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: theme.borderRadius.md },

  listContainer: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 40 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  memberLeft: { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(139, 92, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  memberPhone: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4, fontWeight: '600' },
});
