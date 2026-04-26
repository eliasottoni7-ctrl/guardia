# Projeto Guardião - Review e Roadmap do TCC

**Propósito:** aplicação móvel de ciberproteção feminina e inteligência territorial com mapa colaborativo, rede de apoio e modo discreto.

**Stack:** React Native, Expo Router, TypeScript, Supabase, Zustand.

**Status técnico atual:** o projeto passa em `npm run typecheck` (`tsc --noEmit`). O MVP está funcional em base, mas ainda precisa de validação manual em dispositivo/Expo Go e revisão do schema real do Supabase antes da apresentação final.

## 1. Estado Atual do MVP

### Concluído
- Autenticação com Supabase e persistência de sessão.
- Rotas públicas de disfarce (`Lumina Notes` e delivery) e rotas internas sensíveis.
- Mapa com localização da usuária, pinos colaborativos e heatmap.
- Cadastro e confirmação de pontos de risco.
- CRUD de contatos de confiança.
- Fluxo de preparação de alerta por SMS/share.
- Perfil interno com código de convite, score, medalhas e preferências.
- Rede de apoio unificada com contatos SMS, círculo privado e chat em tempo real.
- Modo "Volta Pra Casa" em memória com temporizador e alerta automático.

### Parcial
- Chat da rede: UI e integração Realtime estão implementadas; precisa aplicar `supabase_network_chat_schema.sql` no Supabase real.
- Localização em tempo real: há hooks e permissões de compartilhamento, mas precisa validação de RLS e dados reais.
- Alertas in-app: há estrutura de listagem/envio, mas ainda sem Realtime ativo.
- KYC: fluxo é simulado para fins acadêmicos.
- Medalhas: exibidas no perfil, mas sem regra completa de ganho.

### Pendente
- Melhorias avançadas do chat: confirmação de leitura, anexos reais e histórico por conversa.
- Persistência completa do "Volta Pra Casa" no banco.
- Duress PIN.
- Deploy/build nativo.
- Roteiro formal de demonstração do TCC.

## 2. Próximas Sprints

### Sprint 1 - Estabilização Técnica
- Manter `npm run typecheck` passando em todo commit.
- Conferir se `types/database.types.ts` reflete o schema real do Supabase.
- Validar as RPCs `complete_kyc`, `confirm_risk_report`, `dispatch_guardian_alert` e `get_visible_locations`.
- Testar navegação entre disfarce, login, mapa, perfil, rede, contatos, alerta e volta para casa.
- Revisar RLS para `profiles`, `guardians_circle`, `guardian_alerts`, `user_locations`, `location_sharing_settings`, `location_sharing_allowed`, `map_risk_reports` e `trusted_contacts`.

### Sprint 2 - Documentação e Base do TCC
- Documentar arquitetura: Expo Router, Supabase, Zustand, hooks e serviços.
- Criar roteiro de demonstração: disfarce, acesso oculto, mapa, cadastro de risco, validação, contato, alerta e comunidade.
- Registrar limitações acadêmicas: KYC simulado, SMS dependente do compositor do celular, ausência de Realtime completo e ausência de serviço externo de emergência.
- Manter o checklist de QA em `QA_CHECKLIST.md` atualizado para Android/Expo Go.

### Sprint 3 - Redesign Discreto e Seguro
- Priorizar interface discreta, consistente e segura.
- Melhorar hierarquia visual das telas internas sem expor termos sensíveis fora do contexto autenticado.
- Deixar telas de disfarce mais convincentes como apps comuns.
- Revisar estados vazios, botões principais, textos de erro e feedbacks.
- Melhorar legibilidade do mapa, pinos, heatmap, painel inferior e ações críticas.

### Sprint 4 - Comunidade em Fases
- Fase 1: validar círculos privados locais com convite por código/@username, remoção, status e alertas in-app.
- Fase 2: validar chat em tempo real da rede com texto, localização, notícias e imagem por link.
- Implementar permissões de localização: ninguém, selecionadas, toda rede.
- Validar privacidade ponta a ponta com RLS e testes manuais.

### Sprint 5 - Fechamento para Apresentação
- Persistir o "Volta Pra Casa" no banco com status, expiração e cancelamento.
- Implementar medalhas mínimas demonstráveis: primeiro relato, primeira validação, rede criada e apoio acionado.
- Preparar build ou demonstração confiável via Expo Go.
- Preparar roteiro final do TCC: problema, público-alvo, solução, arquitetura, diferenciais, riscos éticos, limitações e próximos passos.

## 3. Demonstração do MVP

1. Abrir o app em modo disfarce.
2. Usar long press no gatilho oculto para acessar a área interna.
3. Fazer login/cadastro.
4. Exibir mapa com localização atual.
5. Criar ponto de risco e selecionar categoria.
6. Confirmar um ponto existente e mostrar contador/heatmap.
7. Cadastrar contato de confiança.
8. Preparar envio de localização.
9. Abrir comunidade/círculo e mostrar código de convite.
10. Iniciar "Volta Pra Casa" e demonstrar o temporizador.

## 4. Testes e Validação

- `npm run typecheck`.
- Fluxo público: abertura, disfarce escolhido e acesso oculto.
- Fluxo autenticado: cadastro, login, perfil e logout.
- Mapa: permissão de localização, pinos, confirmação e heatmap.
- SOS: contato externo, fallback de share e status do alerta.
- Comunidade: adicionar por código/@username, listar e remover integrante.
- Privacidade: usuário sem sessão não acessa rota interna; dados privados respeitam RLS.
- Dispositivo real: validar GPS, SMS/share, haptics e mapa no Expo Go.

## 5. Regras de Produto

- A interface pública deve parecer um app comum e não revelar o objetivo de segurança.
- Termos como "Guardião", "segurança", "SOS", "risco" e "proteção" devem ficar restritos à área autenticada.
- Recursos sensíveis devem priorizar privacidade, consentimento e clareza.
- O projeto deve priorizar uma demonstração confiável para o TCC antes de novas features grandes.

## 6. Variáveis de Ambiente

Use `.env` localmente e mantenha `.env.example` como referência segura:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```
