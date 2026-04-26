import { useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

export interface GuardianLocation {
  user_id: string;
  full_name: string;
  username: string | null;
  lat: number;
  lng: number;
  updated_at: string;
}

export type SharingMode = 'everyone' | 'selected' | 'nobody';

export function useLocationSharing() {
  const { session } = useAuthStore();
  const [guardiansLocations, setGuardiansLocations] = useState<GuardianLocation[]>([]);
  const [sharingMode, setSharingMode] = useState<SharingMode>('nobody');
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);

  // 1. Fetch own sharing settings
  const fetchSettings = useCallback(async () => {
    if (!session?.user?.id) return;
    
    const { data: settings } = await supabase
      .from('location_sharing_settings')
      .select('mode')
      .eq('user_id', session.user.id)
      .single();
      
    if (settings) {
      setSharingMode(settings.mode as SharingMode);
    } else {
      // If none exists, create default 'nobody'
      await supabase.from('location_sharing_settings').insert({
        user_id: session.user.id,
        mode: 'nobody'
      });
    }

    const { data: allowed } = await supabase
      .from('location_sharing_allowed')
      .select('allowed_user_id')
      .eq('user_id', session.user.id);
      
    if (allowed) {
      setAllowedUsers(allowed.map(a => a.allowed_user_id));
    }
  }, [session]);

  // 2. Fetch other guardians' locations
  const fetchGuardiansLocations = useCallback(async () => {
    if (!session?.user?.id) return;
    
    const { data, error } = await supabase.rpc('get_visible_locations');
    
    if (!error && data) {
      setGuardiansLocations(data);
    }
  }, [session]);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
    fetchGuardiansLocations();
  }, [fetchSettings, fetchGuardiansLocations]);

  // Update own location
  const updateOwnLocation = async (lat: number, lng: number) => {
    if (!session?.user?.id) return;
    await supabase.from('user_locations').upsert({
      user_id: session.user.id,
      lat,
      lng,
      updated_at: new Date().toISOString()
    });
  };

  // Update sharing mode
  const updateSharingMode = async (mode: SharingMode) => {
    if (!session?.user?.id) return;
    
    const { error } = await supabase
      .from('location_sharing_settings')
      .update({ mode, updated_at: new Date().toISOString() })
      .eq('user_id', session.user.id);
      
    if (!error) {
      setSharingMode(mode);
    }
  };

  // Update allowed users list
  const updateAllowedUsers = async (userIds: string[]) => {
    if (!session?.user?.id) return;
    
    // Simplest way: delete all, then insert new
    await supabase
      .from('location_sharing_allowed')
      .delete()
      .eq('user_id', session.user.id);
      
    if (userIds.length > 0) {
      const inserts = userIds.map(id => ({
        user_id: session.user!.id,
        allowed_user_id: id
      }));
      await supabase.from('location_sharing_allowed').insert(inserts);
    }
    
    setAllowedUsers(userIds);
  };

  return {
    guardiansLocations,
    sharingMode,
    allowedUsers,
    fetchGuardiansLocations,
    updateOwnLocation,
    updateSharingMode,
    updateAllowedUsers
  };
}
