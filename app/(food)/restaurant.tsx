import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { dispatchAlert } from '../../lib/dispatchAlert';
import { useAuthStore } from '../../store/useAuthStore';
import { useLocationStore } from '../../store/useLocationStore';

export default function RestaurantScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { location } = useLocationStore();

  const MENU = [
    { id: '1', name: 'Pizza Calabresa', desc: 'Molho de tomate, muita calabresa e cebola.', price: 'R$ 49,90' },
    { id: '2', name: 'Pizza Marguerita', desc: 'Molho, mussarela, tomate e manjericão fresco.', price: 'R$ 55,00' },
    { id: '3', name: 'Refrigerante 2L', desc: 'Coca-cola gelada.', price: 'R$ 14,00' },
  ];

  async function handleOrder(itemId: string) {
    if (itemId === '1') {
      // Hidden emergency trigger behind a normal-looking order action.
      if (session?.user?.id) {
        await dispatchAlert({
          userId: session.user.id,
          lat: location?.coords.latitude || 0,
          lng: location?.coords.longitude || 0,
          channel: 'facade_food',
          message: 'Alerta acionado via Delivery App.',
        });
      }
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      Alert.alert('Pedido Confirmado', 'O restaurante já está preparando seu pedido! Tempo estimado: 30-45 min.');
      router.back();
    } else {
      Alert.alert('Indisponível', 'Este item está fora de estoque no momento.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Pizzaria Napolitana</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.banner}>
        <Feather name="award" size={32} color="#D97706" />
        <Text style={styles.bannerText}>Mais pedidos da região!</Text>
      </View>

      <FlatList
        data={MENU}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
              <Text style={styles.itemPrice}>{item.price}</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => handleOrder(item.id)}
            >
              <Text style={styles.addButtonText}>Pedir</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  banner: { backgroundColor: '#FEF3C7', padding: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  bannerText: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#B45309' },
  list: { padding: 20 },
  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  itemInfo: { flex: 1, paddingRight: 16 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  itemDesc: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 8 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#10B981' },
  addButton: { backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
