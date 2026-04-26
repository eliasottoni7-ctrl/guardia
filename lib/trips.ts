import { supabase } from './supabase';
import type { Tables } from '../types/database.types';

export type ActiveTrip = Tables<'active_trips'>;

export async function createActiveTrip(params: {
  userId: string;
  minutes: number;
  lat?: number | null;
  lng?: number | null;
}): Promise<{ data: ActiveTrip | null; error: string | null }> {
  const expiresAt = new Date(Date.now() + params.minutes * 60000).toISOString();

  const { data, error } = await supabase
    .from('active_trips')
    .insert({
      user_id: params.userId,
      expires_at: expiresAt,
      status: 'active',
      destination_lat: params.lat ?? null,
      destination_lng: params.lng ?? null,
    })
    .select('*')
    .single();

  return { data, error: error?.message ?? null };
}

export async function fetchActiveTrip(userId: string): Promise<{ data: ActiveTrip | null; error: string | null }> {
  const { data, error } = await supabase
    .from('active_trips')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error: error?.message ?? null };
}

export async function updateTripStatus(
  tripId: string,
  status: 'completed' | 'cancelled' | 'expired'
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('active_trips')
    .update({ status })
    .eq('id', tripId);

  return { error: error?.message ?? null };
}
