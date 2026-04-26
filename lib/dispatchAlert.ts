import { supabase } from './supabase';

/**
 * Dispatches an alert to ALL channels:
 * 1. Inserts emergency_alert record (SMS/share tracking)
 * 2. Sends guardian_alerts to all Circle members via RPC
 * 
 * Returns the number of in-app guardians alerted.
 */
export async function dispatchAlert(params: {
  userId: string;
  lat: number;
  lng: number;
  channel: string;
  message: string;
}): Promise<{ guardianCount: number; error: string | null }> {
  const { userId, lat, lng, channel, message } = params;

  try {
    // 1. Register in emergency_alerts (for SMS/audit trail)
    await supabase.from('emergency_alerts').insert({
      user_id: userId,
      lat,
      lng,
      channel,
      message_body: message,
      status: 'prepared',
    });

    // 2. Send in-app alerts to all guardians in the Circle
    const { data, error } = await supabase.rpc('dispatch_guardian_alert', {
      p_lat: lat,
      p_lng: lng,
      p_message: message,
    });

    if (error) {
      console.warn('Guardian alert dispatch error:', error.message);
      return { guardianCount: 0, error: error.message };
    }

    return { 
      guardianCount: data?.alerts_sent || 0, 
      error: null 
    };
  } catch (e: any) {
    console.error('dispatchAlert error:', e);
    return { guardianCount: 0, error: e.message };
  }
}
