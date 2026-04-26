import { supabase } from './supabase';
import type { Tables, TablesInsert } from '../types/database.types';

export type TrustedContact = Tables<'trusted_contacts'>;

const MAX_CONTACTS = 5;

/**
 * Remove tudo que não é dígito de um telefone.
 * Ex: "(11) 99999-9999" → "11999999999"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Busca todos os contatos de confiança do usuário autenticado.
 */
export async function fetchContacts(userId: string): Promise<{
  data: TrustedContact[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('trusted_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}

/**
 * Adiciona um contato de confiança.
 * Retorna erro se atingiu o limite ou se o telefone já existe.
 */
export async function addContact(
  userId: string,
  name: string,
  phone: string
): Promise<{ data: TrustedContact | null; error: string | null }> {
  // Check limit
  const { data: existing } = await supabase
    .from('trusted_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Using count from headers isn't available in head mode easily,
  // so let's count properly
  const { count } = await supabase
    .from('trusted_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (count !== null && count >= MAX_CONTACTS) {
    return { data: null, error: `Limite de ${MAX_CONTACTS} contatos atingido.` };
  }

  const phoneNormalized = normalizePhone(phone);
  if (phoneNormalized.length < 10) {
    return { data: null, error: 'Telefone inválido. Insira ao menos 10 dígitos.' };
  }

  const record: TablesInsert<'trusted_contacts'> = {
    user_id: userId,
    name: name.trim(),
    phone: phone.trim(),
    phone_normalized: phoneNormalized,
  };

  const { data, error } = await supabase
    .from('trusted_contacts')
    .insert(record)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'Este telefone já está cadastrado.' };
    }
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Atualiza nome e/ou telefone de um contato.
 * O trigger do banco atualiza `updated_at` automaticamente.
 */
export async function updateContact(
  contactId: string,
  name: string,
  phone: string
): Promise<{ error: string | null }> {
  const phoneNormalized = normalizePhone(phone);
  if (phoneNormalized.length < 10) {
    return { error: 'Telefone inválido. Insira ao menos 10 dígitos.' };
  }

  const { error } = await supabase
    .from('trusted_contacts')
    .update({
      name: name.trim(),
      phone: phone.trim(),
      phone_normalized: phoneNormalized,
    })
    .eq('id', contactId);

  if (error) {
    if (error.code === '23505') {
      return { error: 'Este telefone já está cadastrado.' };
    }
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Remove um contato de confiança.
 */
export async function deleteContact(
  contactId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('trusted_contacts')
    .delete()
    .eq('id', contactId);

  return { error: error?.message ?? null };
}
