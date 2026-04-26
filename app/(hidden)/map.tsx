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
  Dimensions,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, Marker, Heatmap } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocationStore } from '../../store/useLocationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTripStore } from '../../store/useTripStore';
import { supabase } from '../../lib/supabase';
import { dispatchAlert } from '../../lib/dispatchAlert';
import { fetchActiveTrip, updateTripStatus } from '../../lib/trips';
import { useLocationSharing } from '../../hooks/useLocationSharing';
import { theme } from '../../constants/theme';
import { darkMapStyle } from '../../lib/mapStyle';
import type { Tables, TablesInsert } from '../../types/database.types';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SOS_SIZE = Math.min(112, Math.max(96, SCREEN_WIDTH * 0.29));
const SIDE_ACTION_SIZE = Math.min(72, Math.max(62, SCREEN_WIDTH * 0.18));
const STATUS_RADIUS_METERS = 500;

function coordinateBounds(lat: number, lng: number, radiusMeters: number) {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lngMin: lng - lngDelta,
    lngMax: lng + lngDelta,
  };
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

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
  const insets = useSafeAreaInsets();
  const { location, errorMsg, setLocation, setErrorMsg } = useLocationStore();
  const { session, profile, setProfile } = useAuthStore();
  const router = useRouter();
  const canAccessMap = !session?.user?.id || profile?.kyc_verified === true;

  const mapRef = useRef<MapView>(null);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [displayLocation, setDisplayLocation] = useState('Localizando...');

  // States
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [reports, setReports] = useState<RiskReport[]>([]);
  const [statusReports, setStatusReports] = useState<RiskReport[]>([]);
  const [selectingLocation, setSelectingLocation] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RiskReport | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [tripTimeRemaining, setTripTimeRemaining] = useState<string>('');

  const { isActive: tripActive, activeTripId, expiresAt: tripExpiresAt, stopTrip, setActiveTrip } = useTripStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { guardiansLocations, updateOwnLocation, fetchGuardiansLocations } = useLocationSharing();
  const nearbyReports = location
    ? statusReports.filter((report) => distanceMeters(location.coords.latitude, location.coords.longitude, report.lat, report.lng) <= STATUS_RADIUS_METERS)
    : [];
  const statusLevel = nearbyReports.length >= 3 ? 'Atenção moderada' : nearbyReports.length > 0 ? 'Atenção leve' : 'Área estável';
  const statusColor = nearbyReports.length >= 3 ? '#FBBF24' : nearbyReports.length > 0 ? '#F59E0B' : '#5EEAD4';

  useEffect(() => {
    async function syncActiveTrip() {
      if (!session?.user?.id || !canAccessMap) return;

      const { data } = await fetchActiveTrip(session.user.id);
      if (data) {
        setActiveTrip(data.id, new Date(data.expires_at).getTime());
      }
    }

    syncActiveTrip();
  }, [canAccessMap, session, setActiveTrip]);

  // Polling location updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (location && canAccessMap) {
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
  }, [canAccessMap, location, updateOwnLocation, fetchGuardiansLocations]);

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
    const tripId = activeTripId;
    stopTrip();
    if (!session?.user?.id) return;

    if (tripId) {
      await updateTripStatus(tripId, 'expired');
    }
    
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

  const handleCancelTrip = async () => {
    const tripId = activeTripId;
    stopTrip();

    if (tripId) {
      await updateTripStatus(tripId, 'completed');
    }
  };

  useEffect(() => {
    if (!canAccessMap) return;

    async function fetchCategories() {
      const { data } = await supabase.from('risk_categories').select('*').order('name');
      if (data) setCategories(data);
    }
    fetchCategories();
  }, [canAccessMap]);

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
    if (canAccessMap) {
      requestLocation();
    }
  }, [canAccessMap, requestLocation]);

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

  const fetchStatusReports = useCallback(async (lat: number, lng: number) => {
    const bounds = coordinateBounds(lat, lng, STATUS_RADIUS_METERS);

    const { data } = await supabase
      .from('map_risk_reports')
      .select('*, risk_categories(*)')
      .gte('lat', bounds.latMin)
      .lte('lat', bounds.latMax)
      .gte('lng', bounds.lngMin)
      .lte('lng', bounds.lngMax)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) setStatusReports(data as RiskReport[]);
  }, []);

  const resolveDisplayLocation = useCallback(async (lat: number, lng: number) => {
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const city = address?.city || address?.subregion || address?.district;
      const state = address?.region;

      if (city && state) {
        setDisplayLocation(`${city} • ${state}`);
      } else if (city || state) {
        setDisplayLocation(city || state || 'Localização atual');
      } else {
        setDisplayLocation('Localização atual');
      }
    } catch {
      setDisplayLocation('Localização atual');
    }
  }, []);

  useEffect(() => {
    if (!location || !canAccessMap) return;

    fetchStatusReports(location.coords.latitude, location.coords.longitude);
    resolveDisplayLocation(location.coords.latitude, location.coords.longitude);
  }, [
    canAccessMap,
    fetchStatusReports,
    location?.coords.latitude,
    location?.coords.longitude,
    resolveDisplayLocation,
  ]);

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
      fetchStatusReports(location.coords.latitude, location.coords.longitude);
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
  }, [currentRegion, location, session, fetchNearbyReports, fetchStatusReports, selectedCategories]);

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
  if (!canAccessMap) {
    return (
      <View style={styles.centered}>
        <Feather name="lock" size={48} color={theme.colors.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.errorTitle}>Validação pendente</Text>
        <Text style={styles.errorText}>
          O acesso ao mapa fica bloqueado até a confirmação da conta. Isso protege a rede e reduz entrada indevida.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/(hidden)/auth/sign-up')} activeOpacity={0.8}>
          <Text style={styles.retryText}>Concluir validação</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={async () => {
            await supabase.auth.signOut();
            setProfile(null);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
             pinColor="#3BA6A3"
             zIndex={100}
           />
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
              title="Relato de risco"
              description={`${distanceMeters(location!.coords.latitude, location!.coords.longitude, report.lat, report.lng).toFixed(0)} m de distância`}
              pinColor={CATEGORY_COLORS[report.category_code] || theme.colors.danger}
              zIndex={80}
            />
          ))
        )}
      </MapView>

      {!selectingLocation && (
        <View style={[styles.topChrome, { paddingTop: Math.max(insets.top + 8, 42) }]}>
          <View style={styles.appHeader}>
            <LinearGradient colors={theme.colors.dangerGradient} style={styles.brandIcon}>
              <Feather name="shield" size={26} color="#FFF" />
            </LinearGradient>
            <View style={styles.headerCopy}>
              <Text style={styles.brandTitle}>Guardiã</Text>
              <Text style={styles.brandSubtitle} numberOfLines={1}>{displayLocation}</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/(hidden)/alerts')} activeOpacity={0.8}>
              <Feather name="bell" size={24} color={theme.colors.text} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileCircle} onPress={() => router.push('/(hidden)/profile')} activeOpacity={0.8}>
              <Feather name="user" size={25} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <BlurView intensity={75} tint="dark" style={styles.statusCard}>
            <View style={[styles.statusIconRing, { borderColor: statusColor }]}>
              <Feather name="shield" size={24} color={statusColor} />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusLabel}>Status da área</Text>
              <Text style={[styles.statusTitle, { color: statusColor }]}>{statusLevel}</Text>
              <Text style={styles.statusText}>
                <Text style={{ color: statusColor, fontWeight: '800' }}>{nearbyReports.length}</Text>
                {` sinalizações de risco em até 500 m`}
              </Text>
            </View>
            <Feather name="chevron-right" size={22} color={theme.colors.textMuted} />
          </BlurView>

          <TouchableOpacity
            style={[styles.heatmapFloating, showHeatmap && styles.heatmapFloatingActive]}
            onPress={() => setShowHeatmap(!showHeatmap)}
            activeOpacity={0.82}
          >
            <Feather name="thermometer" size={20} color={showHeatmap ? '#FFF' : theme.colors.text} />
          </TouchableOpacity>
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

      {!selectingLocation ? (
        <>
          {tripActive && (
            <View style={styles.tripBannerCont}>
              <BlurView intensity={85} tint="dark" style={styles.tripBannerBlur}>
                <Feather name="navigation" size={18} color={theme.colors.primary} />
                <View style={styles.tripBannerCopy}>
                  <Text style={styles.tripBannerTitle}>Trajeto ativo</Text>
                  <Text style={styles.tripBannerTime}>{tripTimeRemaining} restantes</Text>
                </View>
                <TouchableOpacity style={styles.tripCancelBtn} onPress={handleCancelTrip}>
                  <Text style={styles.tripCancelText}>Cheguei</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          )}

          <View style={[styles.quickActions, { bottom: 112 + Math.max(insets.bottom, 10) }]}>
            <TouchableOpacity style={styles.sideAction} onPress={() => router.push('/(hidden)/network')} activeOpacity={0.84}>
              <BlurView intensity={70} tint="dark" style={[styles.sideActionBlur, { width: SIDE_ACTION_SIZE, height: SIDE_ACTION_SIZE, borderRadius: SIDE_ACTION_SIZE / 2 }]}>
                <Feather name="users" size={21} color={theme.colors.text} />
                <Text style={styles.sideActionText}>Meus{'\n'}contatos</Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sosButton, { width: SOS_SIZE, height: SOS_SIZE, borderRadius: SOS_SIZE / 2 }]} onPress={() => router.push('/(hidden)/send')} activeOpacity={0.88}>
              <LinearGradient colors={['#FF4F68', '#E11D48']} style={[styles.sosGradient, { borderRadius: SOS_SIZE / 2 }]}>
                <Text style={styles.sosText}>SOS</Text>
                <Text style={styles.sosSubtext}>Pedir ajuda</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideAction} onPress={() => setSelectingLocation(true)} activeOpacity={0.84}>
              <BlurView intensity={70} tint="dark" style={[styles.sideActionBlur, styles.reportAction, { width: SIDE_ACTION_SIZE, height: SIDE_ACTION_SIZE, borderRadius: SIDE_ACTION_SIZE / 2 }]}>
                <Feather name="plus" size={25} color={theme.colors.text} />
                <Text style={styles.sideActionText}>Reportar{'\n'}risco</Text>
              </BlurView>
            </TouchableOpacity>
          </View>

          <View style={[styles.bottomNavWrap, { bottom: Math.max(insets.bottom, 10) + 12 }]}>
            <BlurView intensity={80} tint="dark" style={styles.bottomNav}>
              <TouchableOpacity style={[styles.navItem, styles.navItemActive]} activeOpacity={0.8}>
                <Feather name="home" size={24} color="#FF68C8" />
                <Text style={styles.navTextActive}>Mapa</Text>
                <View style={styles.navIndicator} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(hidden)/network')} activeOpacity={0.8}>
                <Feather name="users" size={24} color={theme.colors.textMuted} />
                <Text style={styles.navText}>Apoio</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(hidden)/trip')} activeOpacity={0.8}>
                <Feather name="navigation" size={24} color={tripActive ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.navText, tripActive && { color: theme.colors.primary }]}>Trajeto</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </>
      ) : (
        <BlurView intensity={80} tint="dark" style={[styles.confirmTargetPanel, { bottom: Math.max(insets.bottom, 12) + 18 }]}>
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
  secondaryButton: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  secondaryButtonText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 15 },

  // New map chrome
  topChrome: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 18, zIndex: 20 },
  appHeader: { flexDirection: 'row', alignItems: 'center' },
  brandIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  headerCopy: { flex: 1 },
  brandTitle: { color: theme.colors.text, fontSize: 30, fontWeight: '900' },
  brandSubtitle: { color: '#B7A6E8', fontSize: 16, fontWeight: '700', marginTop: 2 },
  notificationButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  notificationDot: { position: 'absolute', top: 9, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3E78' },
  profileCircle: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: 'rgba(139, 92, 246, 0.2)', alignItems: 'center', justifyContent: 'center' },
  statusCard: { minHeight: 86, marginTop: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(20, 18, 38, 0.74)', padding: 12, flexDirection: 'row', alignItems: 'center' },
  statusIconRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: 'rgba(0,0,0,0.12)' },
  statusCopy: { flex: 1 },
  statusLabel: { color: '#B7A6E8', fontSize: 13, fontWeight: '700' },
  statusTitle: { fontSize: 21, fontWeight: '900', marginTop: 2 },
  statusText: { color: '#B7A6E8', fontSize: 13, fontWeight: '600', marginTop: 2 },
  heatmapFloating: { position: 'absolute', right: 24, top: 154, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(24, 24, 40, 0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  heatmapFloatingActive: { backgroundColor: theme.colors.primary, borderColor: '#D8B4FE' },
  quickActions: { position: 'absolute', left: 30, right: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 },
  sideAction: { alignItems: 'center', justifyContent: 'center' },
  sideActionBlur: { overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(32, 28, 52, 0.72)', alignItems: 'center', justifyContent: 'center' },
  reportAction: { borderColor: 'rgba(139, 92, 246, 0.55)', backgroundColor: 'rgba(67, 38, 116, 0.72)' },
  sideActionText: { color: theme.colors.text, fontSize: 10, textAlign: 'center', fontWeight: '700', lineHeight: 12, marginTop: 2 },
  sosButton: { borderWidth: 6, borderColor: 'rgba(255, 119, 153, 0.34)', shadowColor: '#E11D48', shadowOpacity: 0.48, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 14 },
  sosGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  sosText: { color: '#FFF', fontSize: 34, fontWeight: '900', letterSpacing: 0 },
  sosSubtext: { color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 0 },
  bottomNavWrap: { position: 'absolute', left: 18, right: 18, zIndex: 20 },
  bottomNav: { height: 82, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(22, 20, 39, 0.86)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 },
  navItem: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  navItemActive: { backgroundColor: 'rgba(139, 92, 246, 0.26)' },
  navText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  navTextActive: { color: '#FF68C8', fontSize: 13, fontWeight: '800', marginTop: 4 },
  navIndicator: { width: 34, height: 3, borderRadius: 2, backgroundColor: '#FF68C8', marginTop: 5 },

  // Markers
  markerBody: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...theme.shadows.glow },
  markerPinWrap: { alignItems: 'center', justifyContent: 'center', width: 34, height: 42 },
  markerPinCircle: { width: 31, height: 31, borderRadius: 16, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.88)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  markerPinTip: { width: 13, height: 13, transform: [{ rotate: '45deg' }], marginTop: -8, borderRightWidth: 2, borderBottomWidth: 2, borderRightColor: 'rgba(255,255,255,0.88)', borderBottomColor: 'rgba(255,255,255,0.88)' },
  supportMarker: { backgroundColor: '#3BA6A3', borderColor: '#BFF8F0' },
  supportMarkerTip: { backgroundColor: '#3BA6A3', borderRightColor: '#BFF8F0', borderBottomColor: '#BFF8F0' },
  vectorPinWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  vectorPinGlyph: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' },
  mapMarkerStack: { alignItems: 'center' },
  markerLabel: { marginTop: 3, minWidth: 94, alignItems: 'center' },
  markerLabelTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '800', textAlign: 'center', textShadowColor: '#000', textShadowRadius: 4 },
  markerLabelSub: { color: '#B7A6E8', fontSize: 11, fontWeight: '700', marginTop: 1, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 4 },

  // Crosshair
  centerTarget: { position: 'absolute', top: '50%', left: '50%', width: 40, height: 40, marginLeft: -20, marginTop: -20, justifyContent: 'center', alignItems: 'center' },
  crosshairCenter: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  crosshairX: { position: 'absolute', width: 40, height: 2, backgroundColor: 'rgba(139, 92, 246, 0.4)' },
  crosshairY: { position: 'absolute', width: 2, height: 40, backgroundColor: 'rgba(139, 92, 246, 0.4)' },

  // Top Buttons
  profileBtnTopRight: { position: 'absolute', top: 60, right: 20, borderRadius: 24, overflow: 'hidden' },
  profileBtnBlur: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  // Trip Banner
  tripBannerCont: { position: 'absolute', left: 22, right: 22, bottom: 250, borderRadius: 16, overflow: 'hidden', zIndex: 18 },
  tripBannerBlur: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.62)', borderWidth: 1, borderColor: theme.colors.primary },
  tripBannerCopy: { flex: 1, marginLeft: 10 },
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
