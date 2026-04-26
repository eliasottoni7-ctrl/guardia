import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { Tables } from '../types/database.types';

export type CircleMember = Tables<'Profiles'> & { status: string; relation_id: string };

export function useGuardianCircle() {
  const { session } = useAuthStore();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNetwork = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    // Get relations where current user is user_id
    const { data: relations, error } = await supabase
      .from('guardians_circle')
      .select('id, guardian_id, status')
      .eq('user_id', session.user.id);

    if (error || !relations) {
      setLoading(false);
      return;
    }

    if (relations.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const guardianIds = relations.map(r => r.guardian_id);

    // Fetch profiles
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', guardianIds);

    if (!profileErr && profiles) {
       const mapped = profiles.map(p => {
         const rel = relations.find(r => r.guardian_id === p.id);
         return {
           ...p,
           status: rel?.status || 'pending',
           relation_id: rel?.id || ''
         };
       }) as any[];
       setMembers(mapped);
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  const addByCode = async (code: string) => {
    if (!session?.user?.id) return { error: 'No session' };

    const sanitizedCode = code.toLowerCase().replace('@', '');

    // Find user by code or username
    const { data: targetProfile, error: targetErr } = await supabase
      .from('profiles')
      .select('id')
      .or(`share_code.eq.${sanitizedCode},username.eq.${sanitizedCode}`)
      .single();

    if (targetErr || !targetProfile) {
      return { error: 'Guardiã não encontrada com este identificador.' };
    }

    if (targetProfile.id === session.user.id) {
       return { error: 'Você não pode se adicionar.' };
    }

    // Add relation
    const { error: insertErr } = await supabase
      .from('guardians_circle')
      .insert({
        user_id: session.user.id,
        guardian_id: targetProfile.id,
        status: 'accepted' // Auto accepted in this MVP flow
      });

    if (insertErr) {
       if (insertErr.code === '23505') {
          return { error: 'Ela já está na sua rede de guardiãs.' };
       }
       return { error: insertErr.message };
    }

    await fetchNetwork();
    return { error: null };
  };

  const removeMember = async (relationId: string) => {
     const { error } = await supabase.from('guardians_circle').delete().eq('id', relationId);
     if (!error) {
       setMembers(prev => prev.filter(m => m.relation_id !== relationId));
     }
     return { error: error?.message || null };
  };

  return { members, loading, addByCode, removeMember, refresh: fetchNetwork };
}
