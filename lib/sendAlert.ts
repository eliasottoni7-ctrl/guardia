import * as SMS from 'expo-sms';
import { Share, Platform } from 'react-native';
import { supabase } from './supabase';
import type { TablesInsert } from '../types/database.types';
import type { TrustedContact } from './contacts';

interface AlertPrepared {
  alertId: string;
  message: string;
  targetPhones: string[];
}

/**
 * 1. Prepara o alerta: cria a mensagem e salva no banco os logs iniciais
 * com status 'prepared'. Retorna o ID do alerta e a mensagem para o passo seguinte.
 */
export async function prepareAlert(
  userId: string,
  lat: number,
  lng: number,
  contacts: TrustedContact[]
): Promise<{ data: AlertPrepared | null; error: string | null }> {
  // Mount the message
  const message = `Estou compartilhando minha localização atual: https://maps.google.com/?q=${lat},${lng}`;

  // Which channel will we attempt first?
  let channel = 'share';
  const isSmsAvailable = await SMS.isAvailableAsync();
  if (isSmsAvailable) {
    channel = 'sms';
  }

  // Insert emergency_alerts record
  const alertRecord: TablesInsert<'emergency_alerts'> = {
    user_id: userId,
    lat,
    lng,
    message_body: message,
    channel,
    status: 'prepared',
    recipients_count: contacts.length,
  };

  const { data: insertedAlert, error: alertError } = await supabase
    .from('emergency_alerts')
    .insert(alertRecord)
    .select('id')
    .single();

  if (alertError || !insertedAlert) {
    return { data: null, error: alertError?.message || 'Erro ao registrar alerta inicial.' };
  }

  const alertId = insertedAlert.id;

  // Insert alert_recipients
  if (contacts.length > 0) {
    const recipients: TablesInsert<'alert_recipients'>[] = contacts.map((c) => ({
      alert_id: alertId,
      contact_id: c.id,
      phone: c.phone,
      name: c.name,
    }));

    const { error: recipientsError } = await supabase
      .from('alert_recipients')
      .insert(recipients);

    if (recipientsError) {
      // Non fatal, but we should log? We'll ignore failing to insert some recipients if it somehow fails,
      // but return the error for safety.
      return { data: null, error: recipientsError.message };
    }
  }

  const targetPhones = contacts.map((c) => c.phone_normalized);

  return {
    data: {
      alertId,
      message,
      targetPhones,
    },
    error: null,
  };
}

/**
 * 2. Abre o compositor (SMS ou Share) com a mensagem e contatos preparados.
 * Retorna o status final.
 */
export async function openComposer(prepared: AlertPrepared): Promise<'composer_opened' | 'share_opened' | 'failed'> {
  const isSmsAvailable = await SMS.isAvailableAsync();

  try {
    if (isSmsAvailable) {
      await SMS.sendSMSAsync(prepared.targetPhones, prepared.message);
      return 'composer_opened';
    } else {
      // Fallback to share
      await Share.share({
        message: prepared.message,
      });
      return 'share_opened';
    }
  } catch (e) {
    return 'failed';
  }
}

/**
 * 3. Atualiza o status do alerta no banco após chamar o compositor.
 */
export async function updateAlertStatus(
  alertId: string,
  status: 'composer_opened' | 'share_opened' | 'failed'
): Promise<void> {
  await supabase
    .from('emergency_alerts')
    .update({ status })
    .eq('id', alertId);
}
