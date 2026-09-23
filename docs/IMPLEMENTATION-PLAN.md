# Implementation Plan — Help Academy

Cada fase segue: **IMPLEMENTAR → EXECUTAR → TESTAR → CORRIGIR → VALIDAR → SEGUIR**.
Uma fase por branch/PR. Nenhuma fase é concluída sem os critérios marcados e sem `lint`, `typecheck`, `test` e `build` verdes (e `supabase test db` a partir da fase 3).

Legenda de status: ⬜ não iniciada · 🟨 em andamento · ✅ concluída

---

## 1. Visão das fases

| # | Fase | Prioridade da spec | Depende de | Status |
|---|---|---|---|---|
| 1 | Setup Next.js | P1 Infra | — | ✅ |
| 2 | Supabase (local + projetos) | P1 Infra | 1 | ✅ |
| 3 | Schema | P1 Infra | 2 | ✅ |
| 4 | RLS + funções auxiliares | P1 Infra | 3 | ✅ |
| 5 | Auth | P1 Infra / P2 | 4 | ✅ |
| 6 | Layout + design system base | P2 Member | 5 | ✅ |
| 7 | Dashboard | P2 | 6, 10* | ✅ |
| 8 | Trilhas | P2 | 6 | ✅ |
| 9 | Aulas | P2 | 8 | ✅ |
| 10 | Progresso (start/complete) | P2 | 9 | ✅ |
| 11 | Quiz | P3 | 10 | ✅ |
| 12 | XP e níveis | P4 | 10, 11 | ✅ |
| 13 | Conquistas | P4 | 12 | ⬜ |
| 14 | Admin | P5 | 5, 6 | ⬜ |
| 15 | Relatórios | P6 | 14 | ⬜ |
| 16 | Testes (endurecimento) | — | todas | ⬜ |
| 17 | Deploy | — | 16 | ⬜ |

\* O dashboard é construído na fase 7 com dados reais disponíveis (trilhas, progresso por view); os cards de XP/conquistas são ligados nas fases 12–13. Sem dados falsos: enquanto não existirem, os cards mostram estado vazio real.

> Observação: a fase 14 (Admin) depende apenas de 5 e 6 no código, mas fica depois do fluxo do membro por prioridade. Até lá, o conteúdo de teste vem do `seed.sql`.

---

## 2. Decisões pendentes (resolver antes/durante as fases indicadas)

| ID | Decisão | Proposta padrão (se não houver resposta) | Bloqueia |
|---|---|---|---|
| **D-01** | Identidade visual: logo SVG, cores HEX, fonte oficial da Help | Tokens provisórios do `DESIGN-SYSTEM.md` | Fase 6 (visual final) |
| **D-02** | **Entregadores e estabelecimentos têm email?** Se não, como fazem login (telefone/SMS, CPF + senha)? | MVP só email; login alternativo vira fase pós-MVP | Fase 5 |
| **D-03** | Serviço de email para convites/recuperação (o SMTP padrão do Supabase tem limite baixo e não serve para produção) e remetente (ex.: `academy@helpentregas.com.br`) | Resend ou SMTP corporativo, com SPF/DKIM no domínio | Fase 5 (produção), Fase 17 |
| **D-04** | Contas/planos Supabase e Vercel; quem é dono; 2 projetos Supabase (staging + produção) em `sa-east-1` | Sim, 2 projetos | Fase 2 |
| **D-05** | Aula com quiz: conclui automaticamente ao aprovar? | Sim (RN-03); sem botão manual | Fase 11 |
| **D-06** | Onde ficam os vídeos? Quais domínios de embed são permitidos? | Vídeo externo (YouTube não listado/Vimeo/Drive); allowlist YouTube, Vimeo, Google Drive/Docs/Slides, Loom | Fase 9 |
| **D-07** | Uma trilha pode ter várias áreas-alvo? | Sim (tabela N:N) | Fase 3 |
| **D-08** | Limite de tentativas de quiz / intervalo entre tentativas | Ilimitadas, sem intervalo | Fase 11 |
| **D-09** | Definição de “usuário ativo” no admin | Acessou nos últimos 30 dias | Fase 14 |
| **D-10** | Um usuário pertence a uma única área? | Sim; trilhas extras via atribuição individual | Fase 3 |
| **D-11** | Aula nova em trilha já concluída: reabre a trilha? | Não (RN-06): conclusão fica, % reflete as novas aulas | Fase 10 |
| **D-12** | Email do primeiro ADMIN (bootstrap em produção) | Informado no deploy; promovido via SQL documentado | Fase 17 |
| **D-13** | LGPD: o que fazer com dados de pessoas desligadas? Retenção? | Desativar e manter histórico; exclusão sob solicitação | Fase 14 |
| **D-14** | Domínio da aplicação | `academy.helpentregas.com.br` | Fase 17 |
| **D-15** | Sequência obrigatória atravessa módulos? | Sim — ordem global módulo → aula | Fase 10 |
| **D-16** | Refazer quiz após aprovado é permitido? | Sim, registra tentativa, sem XP extra | Fase 11 |
| **D-17** | Atribuição de trilha a usuário **desativa** a por área? (ex.: remover alguém de uma trilha da sua área) | Não no MVP: acesso = área ∪ individual | Fase 3 |

---

## 3. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Público sem email (D-02) | Alto — pode excluir entregadores do MVP | Decidir cedo; arquitetura de auth isolada em `features/auth` |
| Limite de email do Supabase | Convites não chegam | SMTP próprio antes do primeiro uso real |
| Performance de RLS em relatórios | Telas admin lentas | Views/RPC com índices; medir na fase 16 |
| Conteúdo de terceiros em iframe | Segurança | Allowlist + sandbox + CSP |
| Escopo crescendo (ranking, certificados…) | Atraso | Lista “fora do MVP” no `CLAUDE.md` |
| Identidade visual indefinida | Retrabalho de UI | Tokens semânticos: troca de valores sem mexer em componentes |

---

## 4. Fases

### FASE 1 — Setup Next.js  ✅

**Tarefas**
- [x] Criar app Next.js (App Router, TS, Tailwind, ESLint, `src/`, alias `@/*`)
- [x] `tsconfig` strict + `noUncheckedIndexedAccess`
- [x] Scripts `lint`, `typecheck`, `test`, `test:e2e`, `build`, `format`
- [x] Prettier (+ plugin Tailwind) e ESLint sem conflitos
- [x] Vitest + 1 teste de sanidade; Playwright + 1 teste de sanidade (página inicial responde)
- [x] Estrutura de pastas vazia conforme `ARCHITECTURE.md` §3 (com `.gitkeep` só onde necessário)
- [x] `lib/env.ts` (Zod) + `.env.example`
- [x] `globals.css` com tokens do design system (provisórios) e fonte via `next/font`
- [x] Página `/` temporária com o nome do produto (será redirecionamento na fase 5)
- [x] GitHub Actions: install, lint, typecheck, test, build
- [x] `README.md` com como rodar

**Concluída quando**
- `npm run lint`, `typecheck`, `test`, `build` passam localmente e no CI.
- `npm run test:e2e` passa (sanidade) em Chromium.
- `lib/env.ts` falha com mensagem clara se faltar variável.
- Nenhuma dependência além das listadas em §5.

### FASE 2 — Supabase  ✅

**Tarefas**
- [x] `supabase init`; `config.toml` com `enable_signup = false`, `site_url`, redirect URLs, templates de email em pt-BR
- [x] Instalar `@supabase/supabase-js` e `@supabase/ssr`
- [x] `lib/supabase/client.ts`, `server.ts`, `admin.ts` (`server-only`), `proxy.ts`
- [x] `src/proxy.ts` renovando sessão (Next.js 16 usa `proxy` em vez de `middleware`)
- [x] Script `db:types`
- [ ] Criar projetos staging/produção (D-04) — requer credenciais Supabase (resolver na Fase 17)

**Notas**
- Porta E2E configurada como 3001 (evita conflito com outros processos locais).
- Chaves locais em `.env.local` (não versionado); `.env.example` atualizado.
- `supabase start` baixa imagens Docker na primeira execução (~300 MB); em runs subsequentes é instantâneo.

### FASE 3 — Schema  ✅

**Tarefas**
- [x] Migrations 0001–0005 e 0008 (tabelas, enums, constraints, índices, triggers de `updated_at`, `handle_new_user`, `protect_profile_columns`)
- [x] `seed.sql` (áreas, níveis, settings, conquistas, usuários e trilha demo locais)
- [x] Gerar `database.types.ts`

**Notas**
- `protect_profile_columns` inclui stub de `is_admin()` (substituído na 0006) e proteção para `auth.uid() is null` (operações internas/seed).
- pgTAP: 37 testes passando (tabelas, RLS habilitado, triggers, contagens do seed, constraint `quiz_options_one_correct`).

### FASE 4 — RLS + funções auxiliares  ✅
**Tarefas**
- [x] Migration 0006 (`is_admin`, `is_active_user`, `can_access_path`, `can_access_lesson`, `is_lesson_unlocked`, `get_setting`, `level_for_xp`)
- [x] Migration 0007 (RLS + grants/revokes conforme matriz do `DATABASE.md` §8)
- [x] Migration 0013 (buckets e políticas de Storage)
- [x] Views 0012 (`v_user_path_access`, `v_user_path_progress`) com `security_invoker`

**Notas**
- pgTAP: 81 testes passando (44 RLS + 37 schema). Cobre anon (permission denied), membro-A (acesso), membro-B (sem acesso a trilha de outra área), admin (acesso total).
- `throws_ok` para anon porque `revoke all … from anon` nega o próprio SELECT (403, não filtragem de linhas).
- `get_setting` usa plpgsql com `raise exception` (versão sql com `raise_exception()` removida).

### FASE 5 — Auth  ✅
**Tarefas**
- [x] `/login`, `/recuperar-senha`, `/redefinir-senha`, `/auth/confirm`
- [x] Actions `signIn`, `signOut`, `requestPasswordReset`, `updatePassword` com Zod
- [x] `requireUser`, `requireAdmin` (com `React.cache`)
- [x] `/` redireciona para `/dashboard` ou `/login`
- [x] Mensagens de erro genéricas (“E-mail ou senha inválidos.”)

**Notas**
- Seed corrigido: `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change` precisam ser `''` (GoTrue escaneia como `string`, não `NullString`). `phone` omitido (unique + default NULL).
- Proxy redireciona anon → `/login` para rotas protegidas e usuário autenticado → `/dashboard` em páginas de auth.
- E2E: 20/20 passando (10 auth + 10 smoke × 2 viewports). Cobre login, logout, erro, anon→redirect, membro em /admin→404.
- `(app)/layout.tsx` tem só `requireUser()`; layout completo (Sidebar, BottomNav) na Fase 6.

### FASE 6 — Layout + design system base  ✅
**Tarefas**
- [x] Primitivos `components/ui` do `DESIGN-SYSTEM.md` §4
- [x] `(app)/layout.tsx` com Sidebar (≥ lg) e BottomNav (< lg), header com avatar
- [x] `admin/layout.tsx` com AdminSidebar
- [x] `not-found.tsx`, `error.tsx`, skip link
- [x] Página interna `/dev/ui` (apenas em desenvolvimento) mostrando os componentes e estados

**Concluída quando**
- [x] Navegação funciona por teclado; item ativo com `aria-current`.
- [x] axe sem violações sérias nas páginas de layout.
- [x] Screenshots Playwright em 390×844, 768×1024, 1440×900 revisados.

**Notas**
- Cor ativa da sidebar: `bg-brand-soft text-brand-hover` (#b80023 sobre #fdecef ≈ 9:1) para atender contraste WCAG AA.
- `playwright.config.ts`: `retries: 1` (antes era 0 local / 1 CI) — necessário pela concorrência de workers locais com Supabase Docker.

### FASE 7 — Dashboard  ✅
**Tarefas**
- [x] `features/learning/queries.ts`: trilhas do usuário com progresso, progresso geral (RN-05), última aula iniciada
- [x] Cabeçalho, card de progresso geral, ContinueCard, grid “Minhas trilhas”, atalho admin
- [x] `loading.tsx` e estados vazios

**Concluída quando**
- [x] Membro do seed vê somente as trilhas da sua área/individuais; % bate com cálculo manual.
- [x] Usuário sem trilhas vê o estado vazio correto.
- [x] Teste unitário do cálculo de progresso geral.

**Notas**
- Botão “Sair” adicionado ao Sidebar (desktop) e AppHeader (mobile).
- `features/learning/progress.ts` contém lógica pura de cálculo de progresso geral (RN-05).
- 8 testes unitários em `tests/unit/overall-progress.test.ts`.

### FASE 8 — Trilhas  ✅
**Tarefas**
- [x] `/trilhas` com Tabs de status (filtro por `?status=` searchParam, server-rendered)
- [x] `/trilhas/[slug]` com módulos, aulas, estados ✓ → 🔒, XP disponível
- [x] 404 para trilha não acessível (RLS + notFound())

**Concluída quando**
- [x] E2E: membro abre trilha atribuída; URL de trilha de outra área → 404.
- [x] Trilha sequencial mostra bloqueios corretos (lógica em JS a partir de lesson_progress).

**Notas**
- Lock sequencial calculado em JS (sem N+1 RPCs): espelha a lógica da função SQL `is_lesson_unlocked`.
- `getPathBySlug` retorna null tanto para "não existe" quanto para "sem acesso" — evita enumeração.

### FASE 9 — Aulas  ✅
**Tarefas**
- [x] `getLessonForMember` em queries.ts (RLS + lock state + prev/next)
- [x] `/aula/[id]` com viewers dos 5 tipos, breadcrumb, anterior/próxima, tela de bloqueio
- [x] `embed-allowlist.ts` + CSP `frame-src`
- [x] URL assinada para PDF (Supabase Storage signed URL, 1h)
- [x] Markdown sanitizado (marked + sanitize-html)

**Concluída quando**
- [x] Todos os 5 tipos do seed renderizam em mobile e desktop.
- [x] URL fora da allowlist não é renderizada (26 testes unitários).
- [x] Aula bloqueada mostra tela de bloqueio; aula sem acesso → 404.

**Notas**
- X-Frame-Options mantido como DENY (controla quem embeda NOSSAS páginas); frame-src na CSP controla iframes externos que carregamos.
- 26 testes unitários: embed-allowlist (17) + getYouTubeEmbedUrl (9).

### FASE 10 — Progresso  ✅
**Tarefas**
- [x] Migration 0009: `start_lesson`, `_complete_lesson_internal`, `complete_lesson` (sem XP — Fase 12)
- [x] Action `completeLesson`, `CompleteButton`, revalidação
- [x] `getLessonForMember` chama `start_lesson` (fire-and-forget); dashboard reflete via `getLastStartedLesson`

**Concluída quando**
- [x] pgTAP: 107 testes passando (18 novos para funções de progresso)
- [x] Conclusão idempotente; módulo e trilha concluídos no momento certo; aula bloqueada rejeitada

**Notas**
- `eslint.config.mjs`: adicionado `argsIgnorePattern: '^_'` para `no-unused-vars` (convensão padrão).
- `_complete_lesson_internal` sem GRANT para nenhuma role — só chamável por funções SECURITY DEFINER.

### FASE 11 — Quiz  ✅
**Tarefas**
- [x] Migration 0010: `submit_quiz` (SECURITY DEFINER, correção server-side)
- [x] `QuizForm`, `QuizResult` com revisão; última tentativa exibida ao voltar
- [x] `complete_lesson` rejeita aula com quiz não aprovado (QUIZ_REQUIRED guard)

**Concluída quando**
- [x] pgTAP: 124 testes (29 novos) — correção server-side, inválidos rejeitados, tentativas registradas.
- [x] Gabarito não aparece em nenhuma resposta antes do envio (E2E verifica payload de rede).
- [x] E2E: reprovar → fail message → refazer → aprovar → aula concluída.

**Notas**
- `is_correct` nunca sai do servidor: query usa admin client com SELECT explícito sem `is_correct`; RLS bloqueia SELECT de `quiz_options` para members.
- `submit_quiz` chama `_complete_lesson_internal` automaticamente quando passed=true.

### FASE 12 — XP e níveis  ✅
**Tarefas**
- [x] Migration 0011: `award_xp` idempotente (ON CONFLICT), integrado em `_complete_lesson_internal` e `submit_quiz`
- [x] `XpCard`, `LevelBadge`, `RewardToast`; dados no dashboard e perfil
- [x] `/perfil` (dados, XP, nível, trilhas concluídas, progresso; edição de nome/avatar com upload)

**Concluída quando**
- [x] pgTAP: 167 testes (40 novos xp_functions) — idempotência, settings, módulo/path, quiz perfect bonus
- [x] 28 testes unitários para levelForXp nos limites exatos
- [x] completeLesson e submitQuiz retornam xpEarned; RewardToast exibido no client

**Notas**
- `award_xp` idempotente por (user_id, reason, reference_id) — ON CONFLICT DO NOTHING.
- XP de módulo e trilha concedido apenas na PRIMEIRA conclusão.

### FASE 13 — Conquistas  ⬜
**Tarefas**
- [ ] `evaluate_achievements` com as 5 regras
- [ ] `/conquistas`, conquistas recentes no dashboard, toast de desbloqueio

**Concluída quando**
- pgTAP: cada conquista desbloqueia exatamente na condição e só uma vez.
- Membro não consegue inserir `user_achievements` (já coberto na fase 4, reexecutado).

### FASE 14 — Admin  ⬜
Subdividir em PRs: 14a Dashboard + Áreas · 14b Usuários · 14c Trilhas + construtor · 14d Aulas + quiz + conteúdos · 14e Configurações.

**Tarefas**
- [ ] `/admin` métricas (D-09)
- [ ] Áreas: CRUD + desativar
- [ ] Usuários: convidar (Auth Admin API), editar, desativar/reativar (ban), área, role, trilhas individuais, reenviar convite
- [ ] Trilhas: CRUD, duplicar, publicar/despublicar, arquivar, áreas-alvo, ordem, obrigatória, sequencial
- [ ] Construtor: módulos/aulas/quiz, reordenar com ↑↓ (RPC transacional)
- [ ] Editor de aula por tipo (upload de PDF, validação de URL) e de quiz
- [ ] `/admin/conteudos` com busca/filtros
- [ ] `/admin/configuracoes` (XP e níveis)
- [ ] `ConfirmDialog` em toda ação destrutiva

**Concluída quando**
- Toda action admin começa com `requireAdmin()` (teste que chama a action como membro → erro).
- E2E: admin convida usuário → usuário define senha → vê trilha da área; admin cria trilha completa com quiz, publica e atribui individualmente → membro conclui.
- Admin não consegue remover o próprio papel de admin nem desativar a si mesmo.

### FASE 15 — Relatórios  ⬜
**Tarefas**
- [ ] RPC `admin_report` (usuário, área, trilha, %, último acesso, quiz médio, status) com filtros e paginação
- [ ] `/admin/relatorios` com filtros área/trilha/status
- [ ] Exportar CSV (route handler protegido)

**Concluída quando**
- Números conferem com o seed (teste pgTAP com dados conhecidos).
- CSV abre corretamente no Excel (UTF-8 com BOM, separador `;`).
- Membro recebe 404/403 na rota de CSV.

### FASE 16 — Testes (endurecimento)  ⬜
**Tarefas**
- [ ] Rodar todos os critérios de aceite do PRD §9 como E2E
- [ ] Suite de autorização: membro tentando cada action admin, RPCs com IDs de outros usuários/trilhas
- [ ] axe em todas as páginas principais
- [ ] Viewports 360, 390, 768, 1024, 1440
- [ ] `explain analyze` nas queries de dashboard e relatório com volume sintético (500 usuários, 20 trilhas)
- [ ] Revisão de segurança: headers, CSP, secret no bundle, logs sem PII

**Concluída quando**
- 17 critérios de aceite com teste automatizado verde.
- Nenhuma violação axe séria/crítica.
- Dashboard < 2,5 s LCP (Lighthouse mobile) em staging.

### FASE 17 — Deploy  ⬜
**Tarefas**
- [ ] Vercel: projeto, variáveis por ambiente, domínio (D-14)
- [ ] Supabase produção: migrations via CI, seed de referência, SMTP (D-03), templates, URLs de redirect, backups
- [ ] Bootstrap do primeiro admin (D-12)
- [ ] Runbook no README (deploy, rollback de migration, promover admin)

**Concluída quando**
- Smoke test E2E em produção: login, abrir trilha, concluir aula, admin acessa relatório.
- Convite real chega na caixa de entrada (não spam).
- Preview deployments funcionando por PR apontando para staging.

---

## 5. Primeira fase — escopo exato

**Objetivo:** repositório executável, com qualidade automatizada, sem nenhuma funcionalidade de produto ainda.

**Será criado**
```
package.json (scripts: dev, build, start, lint, typecheck, test, test:e2e, format)
tsconfig.json (strict, noUncheckedIndexedAccess, paths @/*)
next.config.ts (headers de segurança básicos: X-Content-Type-Options, Referrer-Policy, X-Frame-Options)
eslint.config.mjs · .prettierrc · postcss.config.mjs
vitest.config.ts · playwright.config.ts
.env.example · .gitignore · .nvmrc
.github/workflows/ci.yml
README.md
src/app/layout.tsx         (lang="pt-BR", fonte, metadata "Help Academy")
src/app/globals.css        (tokens do DESIGN-SYSTEM §2)
src/app/page.tsx           (placeholder: logo/nome do produto)
src/app/not-found.tsx
src/lib/env.ts             (+ teste unitário)
src/lib/action-result.ts   (+ teste unitário)
tests/unit/env.test.ts · tests/unit/action-result.test.ts
tests/e2e/smoke.spec.ts
pastas vazias: src/components/{ui,layout,learning,quiz,gamification,admin}, src/features, src/types, supabase/
```

**Dependências**
- runtime: `next`, `react`, `react-dom`, `zod`
- dev: `typescript`, `@types/*`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss`, `vitest`, `@playwright/test`

**Não será feito na fase 1:** Supabase, autenticação, banco, telas de produto, componentes de UI.

**Validação ao final**
```
npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e
```
+ CI verde no primeiro push. Resultado de cada comando reportado.
