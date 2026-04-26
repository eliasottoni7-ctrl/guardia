-- Schema do chat em tempo real da rede de apoio.
-- Execute este SQL no Supabase SQL Editor do projeto e habilite Realtime para a tabela.

create unique index if not exists guardians_circle_user_guardian_uidx
on public.guardians_circle (user_id, guardian_id);

create table if not exists public.network_chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'location', 'news', 'image')),
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 1000),
  lat double precision,
  lng double precision,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.network_chat_messages enable row level security;

drop policy if exists "network_chat_messages_select_circle" on public.network_chat_messages;
create policy "network_chat_messages_select_circle"
on public.network_chat_messages
for select
to authenticated
using (
  sender_id = auth.uid()
  or exists (
    select 1
    from public.guardians_circle gc
    where gc.user_id = auth.uid()
      and gc.guardian_id = network_chat_messages.sender_id
      and gc.status = 'accepted'
  )
  or exists (
    select 1
    from public.guardians_circle gc
    where gc.guardian_id = auth.uid()
      and gc.user_id = network_chat_messages.sender_id
      and gc.status = 'accepted'
  )
);

drop policy if exists "network_chat_messages_insert_own" on public.network_chat_messages;
create policy "network_chat_messages_insert_own"
on public.network_chat_messages
for insert
to authenticated
with check (sender_id = auth.uid());

create index if not exists network_chat_messages_sender_created_idx
on public.network_chat_messages (sender_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'network_chat_messages'
  ) then
    alter publication supabase_realtime add table public.network_chat_messages;
  end if;
end $$;
