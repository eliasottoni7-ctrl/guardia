# QA Checklist - Projeto Guardião

Use este checklist antes de apresentar o MVP no TCC ou antes de uma nova sprint.

## 1. Validação Técnica
- [ ] Rodar `npm run typecheck`.
- [ ] Confirmar que o app abre no Expo Go sem tela vermelha.
- [ ] Confirmar que `.env` local existe e `.env.example` não contém chave real.
- [ ] Conferir se `types/database.types.ts` está alinhado com o schema real do Supabase.

## 2. Fluxo Público Discreto
- [ ] Abrir o app e verificar se o nome visível é `Lumina Notes`.
- [ ] Conferir se a tela pública parece um app comum de notas.
- [ ] Garantir que não aparecem termos sensíveis na interface pública.
- [ ] Tocar normalmente no FAB e confirmar resposta comum de funcionalidade indisponível.
- [ ] Fazer long press no FAB e confirmar acesso à área interna.

## 3. Autenticação
- [ ] Acessar a área interna sem sessão e confirmar redirecionamento para login.
- [ ] Criar conta nova.
- [ ] Passar pelo fluxo de verificação simulada.
- [ ] Fazer login com conta existente.
- [ ] Fazer logout pelo perfil.

## 4. Mapa Colaborativo
- [ ] Permitir localização e confirmar centralização no mapa.
- [ ] Negar localização e confirmar mensagem de erro clara.
- [ ] Criar um ponto no mapa.
- [ ] Validar um ponto existente.
- [ ] Ativar/desativar heatmap.
- [ ] Confirmar que pinos e painel inferior não escondem ações principais.

## 5. Rede e Comunidade
- [ ] Visualizar o próprio código de convite.
- [ ] Adicionar integrante por código ou @username.
- [ ] Remover integrante do círculo.
- [ ] Validar que integrantes aparecem no mapa apenas quando permitido.
- [ ] Testar estados vazios da rede.
- [ ] Aplicar `supabase_community_schema.sql` no Supabase.
- [ ] Publicar uma mensagem no mural global.
- [ ] Recarregar o mural e confirmar listagem com autora/categoria.
- [ ] Confirmar que contas não verificadas não conseguem publicar por RLS.

## 6. Alertas
- [ ] Cadastrar contato de confiança.
- [ ] Preparar compartilhamento de localização.
- [ ] Validar fallback de Share quando SMS não estiver disponível.
- [ ] Conferir registro em `emergency_alerts`.
- [ ] Confirmar recebimento/listagem de alerta in-app quando o backend estiver disponível.

## 7. Volta Pra Casa
- [ ] Iniciar temporizador.
- [ ] Cancelar antes do fim.
- [ ] Deixar expirar e confirmar alerta automático.
- [ ] Validar comportamento ao fechar/reabrir o app; este item ainda depende de persistência no banco.

## 8. Riscos Conhecidos
- [ ] KYC é simulado e deve ser apresentado como limitação acadêmica.
- [ ] SMS depende do compositor do sistema e não garante envio final.
- [ ] Realtime ainda precisa ser finalizado.
- [ ] RLS deve ser revisada diretamente no Supabase antes de qualquer uso real.
