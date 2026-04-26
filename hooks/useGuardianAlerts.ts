import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

export interface GuardianAlert {
  id: string;
  sender_id: string;
  receiver_id: string;
  lat: number;
  lng: number;
  message: string;
  seen: boolean;
  created_at: string;
  // Joined from profiles
  sender_name?: string;
  sender_username?: string;
}

export function useGuardianAlerts() {
  const { session } = useAuthStore();
  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    // Fetch my received alerts
    const { data, error } = await supabase
      .from('guardian_alerts')
      .select('*')
      .eq('receiver_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch sender profiles for names
    const senderIds = [...new Set(data.map(a => a.sender_id))];
    
    let profileMap: Record<string, { full_name: string | null; username: string | null }> = {};
    
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', senderIds);
      
      if (profiles) {
        profiles.forEach(p => {
          profileMap[p.id] = { full_name: p.full_name, username: p.username };
        });
      }
    }

    const enriched: GuardianAlert[] = data.map(a => ({
      ...a,
      sender_name: profileMap[a.sender_id]?.full_name || 'Guardiã',
      sender_username: profileMap[a.sender_id]?.username || undefined,
    }));

    setAlerts(enriched);
    setUnseenCount(enriched.filter(a => !a.seen).length);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markAsSeen = async (alertId: string) => {
    await supabase
      .from('guardian_alerts')
      .update({ seen: true })
      .eq('id', alertId);
    
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, seen: true } : a));
    setUnseenCount(prev => Math.max(0, prev - 1));
  };

  const markAllSeen = async () => {
    if (!session?.user?.id) return;
    
    await supabase
      .from('guardian_alerts')
      .update({ seen: true })
      .eq('receiver_id', session.user.id)
      .eq('seen', false);
    
    setAlerts(prev => prev.map(a => ({ ...a, seen: true })));
    setUnseenCount(0);
  };

  return { alerts, loading, unseenCount, fetchAlerts, markAsSeen, markAllSeen };
}
