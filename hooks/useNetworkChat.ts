import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { CircleMember } from './useGuardianCircle';
import type { Tables } from '../types/database.types';

export type ChatKind = 'text' | 'location' | 'news' | 'image';

export type NetworkChatMessage = Tables<'network_chat_messages'> & {
  author_name?: string | null;
  author_username?: string | null;
  is_own?: boolean;
};

type SendMessageInput = {
  kind: ChatKind;
  body: string;
  lat?: number | null;
  lng?: number | null;
  imageUrl?: string | null;
};

export function useNetworkChat(members: CircleMember[]) {
  const { session, profile } = useAuthStore();
  const userId = session?.user?.id;
  const [messages, setMessages] = useState<NetworkChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(true);

  const participantIds = useMemo(() => {
    if (!userId) return [];
    return [userId, ...members.map((member) => member.id)];
  }, [members, userId]);

  const authorMap = useMemo(() => {
    const mapped: Record<string, { full_name: string | null; username: string | null }> = {};
    if (userId) {
      mapped[userId] = {
        full_name: profile?.full_name ?? 'Você',
        username: profile?.username ?? null,
      };
    }
    members.forEach((member) => {
      mapped[member.id] = {
        full_name: member.full_name,
        username: member.username,
      };
    });
    return mapped;
  }, [members, profile, userId]);

  const hydrateMessage = useCallback(
    (message: Tables<'network_chat_messages'>): NetworkChatMessage => ({
      ...message,
      author_name: authorMap[message.sender_id]?.full_name,
      author_username: authorMap[message.sender_id]?.username,
      is_own: message.sender_id === userId,
    }),
    [authorMap, userId]
  );

  const fetchMessages = useCallback(async () => {
    if (!userId || participantIds.length === 0) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('network_chat_messages')
      .select('*')
      .in('sender_id', participantIds)
      .order('created_at', { ascending: true })
      .limit(120);

    if (error || !data) {
      setBackendReady(false);
      setMessages([]);
      setLoading(false);
      return;
    }

    setBackendReady(true);
    setMessages(data.map(hydrateMessage));
    setLoading(false);
  }, [hydrateMessage, participantIds, userId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!userId || participantIds.length === 0) return;

    const channel = supabase
      .channel(`network-chat-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'network_chat_messages' },
        (payload) => {
          const incoming = payload.new as Tables<'network_chat_messages'>;
          if (!participantIds.includes(incoming.sender_id)) return;

          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) return current;
            return [...current, hydrateMessage(incoming)];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hydrateMessage, participantIds, userId]);

  const sendMessage = useCallback(
    async ({ kind, body, lat = null, lng = null, imageUrl = null }: SendMessageInput) => {
      if (!userId) return { error: 'Sessão expirada.' };

      const trimmed = body.trim();
      if (!trimmed && kind !== 'location') {
        return { error: 'Escreva uma mensagem antes de enviar.' };
      }

      const { error } = await supabase.from('network_chat_messages').insert({
        sender_id: userId,
        kind,
        body: trimmed || 'Localização compartilhada',
        lat,
        lng,
        image_url: imageUrl,
      });

      if (error) {
        setBackendReady(false);
        return { error: 'A tabela do chat ainda não está disponível no Supabase.' };
      }

      setBackendReady(true);
      return { error: null };
    },
    [userId]
  );

  return {
    messages,
    loading,
    backendReady,
    participantCount: Math.max(participantIds.length - 1, 0),
    fetchMessages,
    sendMessage,
  };
}
