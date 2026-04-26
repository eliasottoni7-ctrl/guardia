# Projeto Guardião - MVP (TCC)
**Propósito:** Aplicação móvel de ciberproteção feminina e inteligência territorial com mapa colaborativo.
**Stack:** React Native, Expo, TypeScript, Supabase, Zustand.

## 1. Arquitetura de Dados (Supabase)
- [x] Tabela `profiles` e trigger de auth.
- [x] Tabela `risk_categories` e dados iniciais.
- [x] Tabela `map_risk_reports` (RLS configurado).
- [x] Tabela `map_risk_confirmations` (RLS configurado).
- [x] Tabela `trusted_contacts`.

## 2. Roadmap de Execução (Tarefas)

### Fase 1: Fundação & Autenticação
- [x] Setup do projeto Expo Router.
- [x] Configuração e conexão do cliente Supabase.
- [x] Store do Zustand para sessão.
- [x] Criação das telas de Sign In e Sign Up.
- [x] Proteção de rotas (Redirecionamento dinâmico).

### Fase 2: Infraestrutura Espacial (Atual)
- [x] Geração das tipagens do banco (database.types.ts).
- [x] Instalação do react-native-maps e expo-location.
- [x] Tela principal renderizando o mapa com a localização da usuária.

### Fase 3: Mapa Colaborativo
- [x] UI para adicionar novo pino no mapa.
- [x] Integração com banco para salvar ponto de risco (com categoria).
- [x] Renderização dos pinos cadastrados baseados na região visível (Bounding Box).

### Fase 4: Validação Comunitária e Analítica
- [x] Funcionalidade de clicar em um pino e "Confirmar Risco".
- [x] Atualização do contador de confirmações.
- [x] Toggle para visualização de Heatmap (peso baseado em confirmações).

### Fase 5: Rede de Apoio e SOS
- [x] CRUD de contatos de confiança.
- [x] Fluxo e UI do Botão SOS (disparo de localização).

### Fase 6: Redesign Premium UI/UX (Concluído)
- [x] Implementação de navegação e componentes Glassmorphism (expo-blur).
- [x] Refatoração pública do Lumina Notes para visual premium.
- [x] Refatoração das telas ocultas com tipografia, contrastes e hierarquia consistentes.

### Fase 7: Segurança Primária, KYC e Validação de Gênero (Concluído)
- [x] Implementação do simulador de verificação biométrica e CPF (KYC simulado).
- [x] Bloqueio de acesso total ao mapa para contas não-verificadas.
- [x] Construção do Perfil Oculto com patente, repasse de medalhas e gerência de conta (Logout).

### Fase 8: Inteligência Preventiva e Redes Ocultas (Atual)
- [ ] Criação do sistema de Grupos / Círculos de Guardiãs Locais.
- [ ] Modo "Volta Pra Casa" (ETA). Temporizador com dead-man's switch para alerta automático.

### Fase 9: Timeline Georreferenciada & Gamificação
- [ ] Waze da Segurança: Mural de alertas Live e engajamento dinâmico no Supabase Realtime.
- [ ] Sistema lógico e algorítmico de ganho de Medalhas no banco de dados.

### Fase 10: Defesa Suprema & Deploy
- [ ] Duress PIN (Senha falsa de Coação).
- [ ] Deploy nativo final e encapsulamento anti-rastreio.

## 3. Princípios de UX/Produto

### Estratégia de Camuflagem (Stealth Mode)
- O app se apresenta externamente como **"Lumina Notes"** — um app de anotações inofensivo.
- **Nenhuma tela visível** deve conter palavras como "Guardião", "Segurança", "SOS", "Risco" ou "Proteção".
- O objetivo é proteger usuárias cujos agressores inspecionam o celular.
- Funcionalidades sensíveis (mapa de risco, SOS, contatos de confiança) ficam atrás do login.

### Protocolo de Gatilho (Acesso ao Guardião)
- **Long Press (600ms)** no FAB da Home (Lumina Notes) desativa o disfarce e abre `/(hidden)/map`.
- O tap simples no FAB exibe Toast "Funcionalidade em desenvolvimento" (comportamento normal de app de notas).
- Feedback tátil (Haptics Heavy) confirma a ativação sem indicação visual.
- Rotas sensíveis ficam no grupo `(hidden)/` — invisíveis na navegação convencional.

### Paleta de Cores — Dark Mode (`constants/theme.ts`)
| Token         | Cor       | Uso                                    |
|---------------|-----------|----------------------------------------|
| `background`  | `#121214` | Fundo principal (não ilumina o rosto)  |
| `surface`     | `#202024` | Cards, inputs, superfícies elevadas    |
| `primary`     | `#8B5CF6` | Botões de ação, links, destaques       |
| `text`        | `#F3F4F6` | Texto principal                        |
| `textMuted`   | `#A1A1AA` | Labels, placeholders, texto secundário |
| `danger`      | `#EF4444` | Exclusivo para botão SOS interno       |
| `border`      | `#3F3F46` | Bordas de inputs e divisores           |

### Design Tokens
- `spacing`: sm(8), md(16), lg(24), xl(32)
- `borderRadius`: sm(4), md(8), lg(12), round(9999)

## 4. Regras do Agente
- Nunca iniciar código sem aprovação prévia do planejamento.
- Sempre atualizar o status `[ ]` para `[x]` neste arquivo ao finalizar uma tarefa.
- Consultar o schema de dados aqui ou no MCP antes de gerar código de frontend.
- **Nunca expor o nome "Guardião" ou termos de segurança em interfaces visíveis ao usuário.**
