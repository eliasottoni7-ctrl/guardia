import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, Marker, Heatmap } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useLocationStore } from '../../../store/useLocationStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useTripStore } from '../../../store/useTripStore';
import { supabase } from '../../../lib/supabase';
import { dispatchAlert } from '../../../lib/dispatchAlert';
import { useLocationSharing } from '../../../hooks/useLocationSharing';
import { theme } from '../../../constants/theme';
import { darkMapStyle } from '../../../lib/mapStyle';
import type { Tables, TablesInsert } from '../../../types/database.types';

type RiskCategory = Tables<'risk_categories'>;
type RiskReport = Tables<'map_risk_reports'> & {
  risk_categories: RiskCategory | null;
};

// Icons map for Feather
const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  baixa_iluminacao: 'moon',
  sem_iluminacao: 'eye-off',
  local_ermo: 'map-pin',
  risco_assalto: 'alert-triangle',
  recorrencia_assedio: 'shield-off',
  inseguranca_geral: 'alert-circle',
};

const CATEGORY_COLORS: Record<string, string> = {
  baixa_iluminacao: '#FBBF24',
  sem_iluminacao: '#6B7280',
  local_ermo: '#8B5CF6',
  risco_assalto: '#EF4444',
  recorrencia_assedio: '#F97316',
  inseguranca_geral: '#F59E0B',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Agora mesmo';
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  return `${days} dias atrás`;
}

export default function MapScreen() {
  const { location, errorMsg, setLocation, setErrorMsg } = useLocationStore();
  const { session } = useAuthStore();
  const router = useRouter();

  const mapRef = useRef<MapView>(null);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

  // States
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [reports, setReports] = useState<RiskReport[]>([]);
  const [selectingLocation, setSelectingLocation] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RiskReport | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [tripTimeRemaining, setTripTimeRemaining] = useState<string>('');

  const { isActive: tripActive, expiresAt: tripExpiresAt, stopTrip } = useTripStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { guardiansLocations, updateOwnLocation, fetchGuardiansLocations } = useLocationSharing();

  // Polling location updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (location) {
      // Upsert immediately on first valid location
      updateOwnLocation(location.coords.latitude, location.coords.longitude);
      
      // Upsert own location every 30s
      interval = setInterval(() => {
        updateOwnLocation(location.coords.latitude, location.coords.longitude);
        fetchGuardiansLocations(); // Also grab latest buddies
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [location, updateOwnLocation, fetchGuardiansLocations]);

  // Monitor the trip timer
  useEffect(() => {
    if (!tripActive || !tripExpiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = tripExpiresAt - Date.now();
      
      if (remainingMs <= 0) {
        clearInterval(interval);
        handleDeadmanTrigger();
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTripTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tripActive, tripExpiresAt]);

  const handleDeadmanTrigger = async () => {
    stopTrip();
    if (!session?.user?.id) return;
    
    // In a real scenario, this would contact an external SMS gateway or push notification service
    // For MVP, we register the alert and notify the user that SOS was triggered automatically.
    Alert.alert('ALERTA ENVIADO', 'Seu tempo expirou. Seus contatos de emergência e Guardiãs foram acionados silenciosamente.');

    await dispatchAlert({
      userId: session.user.id,
      lat: location?.coords.latitude || 0,
      lng: location?.coords.longitude || 0,
      channel: 'dead_man_switch',
      message: 'Dead-man switch ativado. A usuária não confirmou chegada.',
    });
  };

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('risk_categories').select('*').order('name');
      if (data) setCategories(data);
    }
    fetchCategories();
  }, []);

  const requestLocation = useCallback(async () => {
    setErrorMsg(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Precisamos da sua localização para funcionar.\nVá em Configurações > Aplicativos e libere o acesso.');
      return;
    }
    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch {
      setErrorMsg('Não foi possível obter sua localização. Tente novamente.');
    }
  }, [setLocation, setErrorMsg]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const fetchNearbyReports = useCallback(async (region: Region) => {
    const latMin = region.latitude - region.latitudeDelta / 2;
    const latMax = region.latitude + region.latitudeDelta / 2;
    const lngMin = region.longitude - region.longitudeDelta / 2;
    const lngMax = region.longitude + region.longitudeDelta / 2;

    const { data } = await supabase
      .from('map_risk_reports')
      .select('*, risk_categories(*)')
      .gte('lat', latMin)
      .lte('lat', latMax)
      .gte('lng', lngMin)
      .lte('lng', lngMax)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) setReports(data as RiskReport[]);
  }, []);

  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      setCurrentRegion(region);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchNearbyReports(region);
      }, 300);
    },
    [fetchNearbyReports]
  );

  const handleSaveReport = useCallback(async () => {
    if (!session?.user?.id || !location) return;

    if (selectedCategories.length === 0) {
      Alert.alert('Atenção', 'Selecione no mínimo uma categoria.');
      return;
    }

    setSaving(true);
    setShowCategoryModal(false);

    const lat = currentRegion?.latitude ?? location.coords.latitude;
    const lng = currentRegion?.longitude ?? location.coords.longitude;

    const newReports: TablesInsert<'map_risk_reports'>[] = selectedCategories.map(code => ({
      user_id: session.user.id,
      category_code: code,
      lat,
      lng,
    }));

    const { error } = await supabase.from('map_risk_reports').insert(newReports);

    setSaving(false);
    setSelectingLocation(false);
    setSelectedCategories([]);

    if (error) {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } else {
      Alert.alert('Sucesso', 'Perigo documentado.');
      if (currentRegion) {
        fetchNearbyReports(currentRegion);
      } else {
        fetchNearbyReports({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    }
  }, [currentRegion, location, session, fetchNearbyReports, selectedCategories]);

  const handleConfirmReport = useCallback(
    async (report: RiskReport) => {
      if (!session?.user?.id) return;

      setConfirming(true);
      const { data, error } = await supabase.rpc('confirm_risk_report', { p_report_id: report.id });
      setConfirming(false);

      if (error) {
        Alert.alert('Erro', 'Falha ao validar.');
        return;
      }

      const result = data as { status: string; confirmation_count: number; report_id: string };

      switch (result.status) {
        case 'confirmed':
          setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, confirmation_count: result.confirmation_count } : r));
          setSelectedReport((prev) => prev && prev.id === report.id ? { ...prev, confirmation_count: result.confirmation_count } : prev);
          break;
        case 'already_confirmed':
          Alert.alert('Guardião', 'Você já reportou este ponto.');
          break;
        case 'own_report':
          Alert.alert('Guardião', 'Não é possível validar o próprio ponto.');
          break;
        case 'not_found':
          Alert.alert('Guardião', 'Ponto não encontrado.');
          break;
      }
    },
    [session]
  );

  // Fallbacks
  if (!location && !errorMsg) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Acessando satélites...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Feather name="map-pin" size={48} color={theme.colors.danger} style={{ marginBottom: 16 }} />
        <Text style={styles.errorTitle}>Localização Desativada</Text>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocation} activeOpacity={0.8}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: location!.coords.latitude,
          longitude: location!.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle="dark"
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {/* Render Guardian Locations */}
        {guardiansLocations.map(guardian => (
           <Marker
             key={guardian.user_id}
             coordinate={{ latitude: guardian.lat, longitude: guardian.lng }}
             title={guardian.full_name || 'Guardiã'}
             description={guardian.username ? `@${guardian.username}` : ''}
             zIndex={100}
           >
             <View style={styles.guardianAvatar}>
               {guardian.full_name ? (
                 <Text style={styles.guardianAvatarText}>
                   {guardian.full_name.charAt(0).toUpperCase()}
                 </Text>
               ) : (
                 <Feather name="user" size={20} color="#FFF" />
               )}
               <View style={styles.guardianAvatarBadge}>
                 <Feather name="shield" size={10} color="#FFF" />
               </View>
             </View>
           </Marker>
        ))}

        {showHeatmap && reports.length > 0 ? (
          <Heatmap
            points={reports.map((r) => ({
              latitude: r.lat,
              longitude: r.lng,
              weight: 1 + (r.confirmation_count ?? 0),
            }))}
            radius={45}
            opacity={0.8}
            gradient={{ colors: ['#A78BFA', '#F97316', '#E11D48'], startPoints: [0.1, 0.4, 1.0], colorMapSize: 256 }}
          />
        ) : (
          reports.map((report) => (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.lat, longitude: report.lng }}
              onPress={() => setSelectedReport(report)}
            >
              <View style={[styles.markerBody, { backgroundColor: CATEGORY_COLORS[report.category_code] || theme.colors.danger }]}>
                <Feather 
                  name={CATEGORY_ICONS[report.category_code] || 'alert-circle'} 
                  size={14} 
                  color="#FFF" 
                />
              </View>
            </Marker>
          ))
        )}
      </MapView>

      {/* Top Profile Icon */}
      {!selectingLocation && (
        <TouchableOpacity 
          style={styles.profileBtnTopRight}
          onPress={() => router.push('/(hidden)/profile')}
        >
          <BlurView intensity={80} tint="dark" style={styles.profileBtnBlur}>
            <Feather name="user" size={20} color={theme.colors.text} />
          </BlurView>
        </TouchableOpacity>
      )}

      {/* Trip Active Top Banner */}
      {tripActive && (
         <View style={styles.tripBannerCont}>
           <BlurView intensity={90} tint="dark" style={styles.tripBannerBlur}>
             <Feather name="shield" size={20} color={theme.colors.primary} />
             <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.tripBannerTitle}>Modo Volta pra Casa</Text>
                <Text style={styles.tripBannerTime}>{tripTimeRemaining} restantes</Text>
             </View>
             <TouchableOpacity style={styles.tripCancelBtn} onPress={stopTrip}>
                <Text style={styles.tripCancelText}>Cheguei (Desarmar)</Text>
             </TouchableOpacity>
           </BlurView>
         </View>
      )}

      {/* Target Crosshair */}
      {selectingLocation && (
        <View style={styles.centerTarget} pointerEvents="none">
          <View style={styles.crosshairX} />
          <View style={styles.crosshairY} />
          <View style={styles.crosshairCenter} />
        </View>
      )}

      {/* Controls Dashboard */}
      {!selectingLocation ? (
        <View style={styles.dashboardContainer}>
          <BlurView intensity={70} tint="dark" style={styles.dashboardGlass}>
            <TouchableOpacity style={styles.dashBtn} onPress={() => router.push('/(hidden)/network')}>
              <Feather name="users" size={22} color={theme.colors.text} />
              <Text style={styles.dashLabel}>Rede</Text>
            </TouchableOpacity>

            <View style={styles.dashDivider} />

            <TouchableOpacity style={styles.dashBtn} onPress={() => setShowHeatmap(!showHeatmap)}>
              <Feather name="thermometer" size={22} color={showHeatmap ? theme.colors.primary : theme.colors.text} />
              <Text style={[styles.dashLabel, showHeatmap && { color: theme.colors.primary }]}>
                Calor
              </Text>
            </TouchableOpacity>

            <View style={styles.dashDivider} />

            <TouchableOpacity style={styles.dashBtn} onPress={() => router.push('/(hidden)/trip')}>
              <Feather name="clock" size={22} color={tripActive ? theme.colors.primary : theme.colors.text} />
              <Text style={[styles.dashLabel, tripActive && { color: theme.colors.primary }]}>
                Viagem
              </Text>
            </TouchableOpacity>

            <View style={styles.dashDivider} />

            {/* Danger Action */}
            <TouchableOpacity style={styles.dashBtnAction} onPress={() => router.push('/(hidden)/send')}>
               <LinearGradient
                 colors={theme.colors.dangerGradient}
                 style={styles.dangerGradientBtn}
                 start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
               >
                  <Feather name="shield" size={22} color="#FFF" />
               </LinearGradient>
            </TouchableOpacity>
          </BlurView>

          {/* Add Pin FAB */}
          <TouchableOpacity 
            style={styles.mainFab} 
            onPress={() => setSelectingLocation(true)}
            activeOpacity={0.8}
          >
             <LinearGradient
               colors={theme.colors.primaryGradient}
               style={styles.mainFabGradient}
             >
                <Feather name="plus" size={30} color="#FFF" />
             </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <BlurView intensity={80} tint="dark" style={styles.confirmTargetPanel}>
          <Text style={styles.confirmTargetLabel}>Mova o mapa para ajustar o pino</Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setSelectingLocation(false)}>
              <Text style={styles.confirmCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmOkBtn} 
              onPress={() => {
                setSelectedCategories([]);
                setShowCategoryModal(true);
              }}
            >
              <Text style={styles.confirmOkText}>Fixar Ponto</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}

      {/* Saving Overlay */}
      {saving && (
        <BlurView intensity={90} tint="dark" style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.savingText}>Registrando...</Text>
        </BlurView>
      )}

      {/* Add Report Modal (Multi-select Glass Sheet) */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <BlurView intensity={95} tint="dark" style={styles.sheetContent}>
            <View style={styles.handleBar} />
            <Text style={styles.sheetTitle}>Quais fatores de risco?</Text>
            <Text style={styles.sheetSubtitle}>Assinale uma ou mais opções pertinentes.</Text>

            <FlatList
              data={categories}
              keyExtractor={(i) => i.code}
              contentContainerStyle={styles.catList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedCategories.includes(item.code);
                return (
                  <TouchableOpacity
                    style={[styles.catCard, isSelected && styles.catCardSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedCategories(prev => 
                        prev.includes(item.code) ? prev.filter(c => c !== item.code) : [...prev, item.code]
                      );
                    }}
                  >
                    <View style={[styles.catIconWrap, isSelected && styles.catIconWrapSelected]}>
                      <Feather name={CATEGORY_ICONS[item.code] || 'info'} size={18} color={isSelected ? '#FFF' : theme.colors.text} />
                    </View>
                    <Text style={[styles.catName, isSelected && styles.catNameSelected]}>
                      {item.name}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    ) : (
                      <View style={styles.checkboxEmpty} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {selectedCategories.length > 0 && (
               <TouchableOpacity style={{ marginTop: 16 }} onPress={handleSaveReport} activeOpacity={0.8}>
                 <LinearGradient colors={theme.colors.primaryGradient} style={styles.saveSheetBtn}>
                    <Text style={styles.saveSheetText}>Registrar Ocorrência</Text>
                 </LinearGradient>
               </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelSheetBtn} onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.cancelSheetText}>Cancelar</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      {/* Pin Detail Modal */}
      <Modal visible={!!selectedReport} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setSelectedReport(null)}>
          {selectedReport && (
            <BlurView intensity={95} tint="dark" style={styles.detailCard}>
              <View style={styles.detailHeaderBox}>
                <View style={[styles.detailIconBox, { backgroundColor: CATEGORY_COLORS[selectedReport.category_code] || theme.colors.primary }]}>
                   <Feather name={CATEGORY_ICONS[selectedReport.category_code] || 'info'} size={24} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={styles.detailTitle}>{selectedReport.risk_categories?.name || 'Risco'}</Text>
                   <Text style={styles.detailTime}>{timeAgo(selectedReport.created_at)}</Text>
                </View>
              </View>

              <View style={styles.detailStatsContainer}>
                <View style={styles.statBox}>
                   <Text style={styles.statValue}>{selectedReport.confirmation_count ?? 0}</Text>
                   <Text style={styles.statLabel}>Validações</Text>
                </View>
                <View style={styles.statVerticalDivider} />
                <View style={styles.statBox}>
                   <Text style={styles.statValue}>{selectedReport.lat.toFixed(3)}</Text>
                   <Text style={styles.statLabel}>Coordenadas</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.actionBtnCont} 
                onPress={() => handleConfirmReport(selectedReport)} 
                disabled={confirming}
              >
                 <LinearGradient colors={theme.colors.primaryGradient} style={styles.confirmBadgeBtn}>
                    {confirming ? <ActivityIndicator color="#FFF" size="small"/> : (
                      <>
                        <Feather name="check" size={18} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.confirmBtnText}>Validar Ocorrência</Text>
                      </>
                    )}
                 </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          )}
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  map: { flex: 1 },
  centered: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: theme.colors.textMuted, marginTop: 16, fontSize: 15 },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  errorText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 15, marginBottom: 24 },
  retryButton: { backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  retryText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Markers
  markerBody: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...theme.shadows.glow },
  guardianAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  guardianAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  guardianAvatarBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#10B981', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },

  // Crosshair
  centerTarget: { position: 'absolute', top: '50%', left: '50%', width: 40, height: 40, marginLeft: -20, marginTop: -20, justifyContent: 'center', alignItems: 'center' },
  crosshairCenter: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  crosshairX: { position: 'absolute', width: 40, height: 2, backgroundColor: 'rgba(139, 92, 246, 0.4)' },
  crosshairY: { position: 'absolute', width: 2, height: 40, backgroundColor: 'rgba(139, 92, 246, 0.4)' },

  // Top Buttons
  profileBtnTopRight: { position: 'absolute', top: 60, right: 20, borderRadius: 24, overflow: 'hidden' },
  profileBtnBlur: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  // Trip Banner
  tripBannerCont: { position: 'absolute', top: 60, left: 20, right: 80, borderRadius: 16, overflow: 'hidden' },
  tripBannerBlur: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: theme.colors.primary },
  tripBannerTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  tripBannerTime: { color: theme.colors.primary, fontSize: 16, fontWeight: '800', marginTop: 2 },
  tripCancelBtn: { backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  tripCancelText: { color: theme.colors.text, fontSize: 12, fontWeight: '600' },

  // Dashboard
  dashboardContainer: { position: 'absolute', bottom: 32, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashboardGlass: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 8, paddingVertical: 8, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  dashBtn: { alignItems: 'center', justifyContent: 'center', width: 56, height: 50 },
  dashLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4, fontWeight: '600' },
  dashDivider: { width: 1, height: 32, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  dashBtnAction: { marginLeft: 8 },
  dangerGradientBtn: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', ...theme.shadows.dangerGlow },

  mainFab: { width: 64, height: 64, borderRadius: 32, ...theme.shadows.glow },
  mainFabGradient: { flex: 1, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },

  // Location Selector
  confirmTargetPanel: { position: 'absolute', bottom: 32, left: 20, right: 20, borderRadius: 24, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  confirmTargetLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  confirmRow: { flexDirection: 'row', gap: 12 },
  confirmCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: theme.colors.surfaceHighlight, alignItems: 'center' },
  confirmCancelText: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
  confirmOkBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center' },
  confirmOkText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  // Overlays & Sheets
  savingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  savingText: { color: theme.colors.text, marginTop: 12, fontSize: 16, fontWeight: '600' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 12, paddingBottom: 40, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  handleBar: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
  sheetSubtitle: { fontSize: 15, color: theme.colors.textMuted, marginBottom: 24 },

  catList: { gap: 12 },
  catCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'transparent' },
  catCardSelected: { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: theme.colors.primary },
  catIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  catIconWrapSelected: { backgroundColor: theme.colors.primary },
  catName: { flex: 1, fontSize: 16, color: theme.colors.text, fontWeight: '600' },
  catNameSelected: { color: theme.colors.primary },
  checkboxEmpty: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  saveSheetBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', ...theme.shadows.glow },
  saveSheetText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cancelSheetBtn: { marginTop: 12, paddingVertical: 16, alignItems: 'center' },
  cancelSheetText: { color: theme.colors.textMuted, fontWeight: 'bold', fontSize: 16 },

  // Detail Modal
  detailCard: { width: '100%', borderRadius: 24, overflow: 'hidden', padding: 24, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  detailHeaderBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  detailIconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  detailTime: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
  detailStatsContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 24 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, fontWeight: '600' },
  statVerticalDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  actionBtnCont: { borderRadius: 16 },
  confirmBadgeBtn: { flexDirection: 'row', paddingVertical: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 16, ...theme.shadows.glow },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
