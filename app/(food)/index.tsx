import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function FoodIndexScreen() {
  const router = useRouter();

  const RESTAURANTS = [
    { id: '1', name: 'Pizzaria Napolitana', type: 'Pizza • Italiana', time: '30-45 min', rating: '4.8', route: true },
    { id: '2', name: 'Burger Express', type: 'Lanches • Fast Food', time: '20-35 min', rating: '4.5', route: false },
    { id: '3', name: 'Sushi Zen', type: 'Japonesa • Oriental', time: '40-55 min', rating: '4.9', route: false },
    { id: '4', name: 'Saladas & Cia', type: 'Saudável', time: '15-25 min', rating: '4.6', route: false },
  ];

  async function handleCartLongPress() {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    router.push('/(hidden)/map');
  }

  const renderItem = ({ item }: { item: typeof RESTAURANTS[0] }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.8}
      onPress={() => item.route ? router.push('/(food)/restaurant') : null}
    >
      <View style={styles.cardImagePlaceholder}>
        <Feather name="image" size={24} color="#CBD5E1" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardType}>{item.type}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTime}>{item.time}</Text>
          <View style={styles.ratingBadge}>
            <Feather name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Entregar em</Text>
          <Text style={styles.addressTitle}>Rua Principal, 123 <Feather name="chevron-down" size={16} /></Text>
        </View>
        
        {/* Fake Cart Button - Hidden Gateway */}
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => {}}
          onLongPress={handleCartLongPress}
          delayLongPress={600}
        >
          <Feather name="shopping-cart" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={20} color="#94A3B8" />
        <TextInput 
          style={styles.searchInput}
          placeholder="Comida, restaurante, bebida..."
          editable={false}
        />
      </View>

      <Text style={styles.sectionTitle}>Lojas famosas</Text>
      
      <FlatList
        data={RESTAURANTS}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FFF' },
  greeting: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  addressTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  cartButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', margin: 20, paddingHorizontal: 16, borderRadius: 12, height: 50, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardImagePlaceholder: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardType: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTime: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#D97706', marginLeft: 4 },
});
