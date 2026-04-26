import { useState, useEffect, useCallback } from 'react';
import {
  fetchContacts,
  addContact,
  updateContact,
  deleteContact,
  type TrustedContact,
} from '../lib/contacts';
import { useAuthStore } from '../store/useAuthStore';

export function useTrustedContacts() {
  const { session } = useAuthStore();
  const userId = session?.user?.id;

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const result = await fetchContacts(userId);
    setContacts(result.data);
    setError(result.error);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (name: string, phone: string) => {
      if (!userId) return { error: 'Sessão expirada.' };
      const result = await addContact(userId, name, phone);
      if (!result.error) await reload();
      return { error: result.error };
    },
    [userId, reload]
  );

  const update = useCallback(
    async (contactId: string, name: string, phone: string) => {
      const result = await updateContact(contactId, name, phone);
      if (!result.error) await reload();
      return { error: result.error };
    },
    [reload]
  );

  const remove = useCallback(
    async (contactId: string) => {
      const result = await deleteContact(contactId);
      if (!result.error) await reload();
      return { error: result.error };
    },
    [reload]
  );

  return {
    contacts,
    loading,
    error,
    reload,
    add,
    update,
    remove,
    isFull: contacts.length >= 5,
  };
}
