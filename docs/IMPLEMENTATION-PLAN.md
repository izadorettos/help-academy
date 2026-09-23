# Implementation Plan — Help Academy

Cada fase segue: **IMPLEMENTAR → EXECUTAR → TESTAR → CORRIGIR → VALIDAR → SEGUIR**.
Uma fase por branch/PR. Nenhuma fase é concluída sem os critérios marcados e sem `lint`, `typecheck`, `test` e `build` verdes (e `supabase test db` a partir da fase 3).

Legenda de status: ⬜ não iniciada · 🟨 em andamento · ✅ concluída

---

## 1. Visão das fases

| # | Fase | Prioridade da spec | Depende de | Status |
|---|---|---|---|---|
| 1 | Setup Next.js | P1 Infra | — | 🟨 bloqueada |
| 2 | Supabase (local + projetos) | P1 Infra | 1 | ⬜ |
| 3 | Schema | P1 Infra | 2 | ⬜ |
| 4 | RLS + funções auxiliares | P1 Infra | 3 | ⬜ |
| 5 | Auth | P1 Infra / P2 | 4 | ⬜ |
| 6 | Layout + design system base | P2 Member | 5 | ⬜ |
| 7 | Dashboard | P2 | 6, 10* | ⬜ |
| 8 | Trilhas | P2 | 6 | ⬜ |
| 9 | Aulas | P2 | 8 | ⬜ |
| 10 | Progresso (start/complete) | P2 | 9 | ⬜ |
| 11 | Quiz | P3 | 10 | ⬜ |
| 12 | XP e níveis | P4 | 10, 11 | ⬜ |
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

### FASE 1 — Setup Next.js  🟨  *(escopo detalhado em §5)*
> **Bloqueio (23/09/2026):** o ambiente de execução do agente não acessa `registry.npmjs.org` (host fora da allowlist de rede da conta). Todos os arquivos da fase foram escritos, mas `npm install` e, portanto, lint/typecheck/test/build ainda **não foram executados**. A fase só será marcada ✅ após a validação.

**Tarefas**
- [ ] Criar app Next.js (App Router, TS, Tailwind, ESLint, `src/`, alias `@/*`)
- [ ] `tsconfig` strict + `noUncheckedIndexedAccess`
- [ ] Scripts `lint`, `typecheck`, `test`, `test:e2e`, `build`, `format`
- [ ] Prettier (+ plugin Tailwind) e ESLint sem conflitos
- [ ] Vitest + 1 teste de sanidade; Playwright + 1 teste de sanidade (página inicial responde)
- [ ] Estrutura de pastas vazia conforme `ARCHITECTURE.md` §3 (com `.gitkeep` só onde necessário)
- [ ] `lib/env.ts` (Zod) + `.env.example`
- [ ] `globals.css` com tokens do design system (provisórios) e fonte via `next/font`
- [ ] Página `/` temporária com o nome do produto (será redirecionamento na fase 5)
- [ ] GitHub Actions: install, lint, typecheck, test, build
- [ ] `README.md` com como rodar

**Concluída quando**
- `npm run lint`, `typecheck`, `test`, `build` passam localmente e no CI.
- `npm run test:e2e` passa (sanidade) em Chromium.
- `lib/env.ts` falha com mensagem clara se faltar variável.
- Nenhuma dependência além das listadas em §5.

### FASE 2 — Supabase  ⬜
**Tarefas**
- [ ] `supabase init`; `config.toml` com `enable_signup = false`, `site_url`, redirect URLs, templates de email em pt-BR
- [ ] Instalar `@supabase/supabase-js` e `@supabase/ssr`
- [ ] `lib/supabase/client.ts`, `server.ts`, `admin.ts` (`server-only`), `proxy.ts`
- [ ] `src/proxy.ts` (ou `middleware.ts`) renovando sessão
- [ ] Script `db:types`
- [ ] Criar projetos staging/produção (D-04) e documentar variáveis na Vercel

**Concluída quando**
- `supabase start` sobe localmente; app conecta (health check em Server Component lendo `select 1` via RPC ou `auth.getUser()` sem erro).
- Teste unitário garante que `admin.ts` não pode ser importado no cliente (`server-only`).
- Build de produção não contém a secret key (checagem por grep no `.next/`).

### FASE 3 — Schema  ⬜
**Tarefas**
- [ ] Migrations 0001–0005 e 0008 (tabelas, enums, constraints, índices, triggers de `updated_at`, `handle_new_user`, `protect_profile_columns`)
- [ ] `seed.sql` (áreas, níveis, settings, conquistas, usuários e trilha demo locais)
- [ ] Gerar `database.types.ts`

**Concluída quando**
- `supabase db reset` roda do zero sem erro.
- pgTAP: existência de tabelas/colunas/constraints-chave; constraints únicas rejeitam duplicata (progresso, XP, conquista, opção correta dupla).
- Criar usuário em `auth.users` gera `profiles`.

### FASE 4 — RLS + funções auxiliares  ⬜
**Tarefas**
- [ ] Migration 0006 (`is_admin`, `is_active_user`, `can_access_path`, `can_access_lesson`, `is_lesson_unlocked`, `get_setting`, `level_for_xp`)
- [ ] Migration 0007 (RLS + grants/revokes conforme matriz do `DATABASE.md` §8)
- [ ] Migration 0013 (buckets e políticas de Storage)
- [ ] Views 0012 (`v_user_path_access`, `v_user_path_progress`) com `security_invoker`

**Concluída quando**
- pgTAP cobre **toda** tabela com 4 perfis (anon, membro A, membro B, admin) — todos passando.
- Membro não lê `quiz_options`, não escreve em XP/conquistas/progresso, não altera `role`.
- Membro de outra área não vê trilha não atribuída; atribuição individual concede acesso.
- Usuário desativado perde acesso.

### FASE 5 — Auth  ⬜
**Tarefas**
- [ ] `/login`, `/recuperar-senha`, `/redefinir-senha`, `/auth/confirm`
- [ ] Actions `signIn`, `signOut`, `requestPasswordReset`, `updatePassword` com Zod
- [ ] `requireUser`, `requireAdmin` (com `React.cache`)
- [ ] `/` redireciona para `/dashboard` ou `/login`
- [ ] Mensagens de erro genéricas (“Email ou senha inválidos.”)

**Concluída quando**
- E2E: login válido → `/dashboard`; inválido → mensagem; logout; anônimo em `/dashboard` e `/admin` → `/login`; membro em `/admin` → 404.
- Recuperação de senha funciona localmente (Inbucket/Mailpit do Supabase).
- Usuário desativado não entra.

### FASE 6 — Layout + design system base  ⬜
**Tarefas**
- [ ] Primitivos `components/ui` do `DESIGN-SYSTEM.md` §4
- [ ] `(app)/layout.tsx` com Sidebar (≥ lg) e BottomNav (< lg), header com avatar
- [ ] `admin/layout.tsx` com AdminSidebar
- [ ] `not-found.tsx`, `error.tsx`, skip link
- [ ] Página interna `/dev/ui` (apenas em desenvolvimento) mostrando os componentes e estados

**Concluída quando**
- Navegação funciona por teclado; item ativo com `aria-current`.
- axe sem violações sérias nas páginas de layout.
- Screenshots Playwright em 390×844, 768×1024, 1440×900 revisados.

### FASE 7 — Dashboard  ⬜
**Tarefas**
- [ ] `features/learning/queries.ts`: trilhas do usuário com progresso, progresso geral (RN-05), última aula iniciada
- [ ] Cabeçalho, card de progresso geral, ContinueCard, grid “Minhas trilhas”, atalho admin
- [ ] `loading.tsx` e estados vazios

**Concluída quando**
- Membro do seed vê somente as trilhas da sua área/individuais; % bate com cálculo manual.
- Usuário sem trilhas vê o estado vazio correto.
- Teste unitário do cálculo de progresso geral.

### FASE 8 — Trilhas  ⬜
**Tarefas**
- [ ] `/trilhas` com Tabs de status
- [ ] `/trilhas/[slug]` com módulos, aulas, estados ✓ → 🔒, XP disponível
- [ ] 404 para trilha não acessível

**Concluída quando**
- E2E: membro abre trilha atribuída; URL de trilha de outra área → 404.
- Trilha sequencial mostra bloqueios corretos (conferido com `is_lesson_unlocked`).

### FASE 9 — Aulas  ⬜
**Tarefas**
- [ ] RPC `get_lesson_for_member`
- [ ] `/aula/[id]` com viewers dos 5 tipos, breadcrumb, anterior/próxima, tela de bloqueio
- [ ] `embed-allowlist.ts` + CSP `frame-src`
- [ ] URL assinada para PDF
- [ ] Markdown sanitizado

**Concluída quando**
- Todos os 5 tipos do seed renderizam em mobile e desktop.
- URL fora da allowlist não é renderizada (teste unitário + E2E).
- Aula bloqueada mostra tela de bloqueio; aula sem acesso → 404.

### FASE 10 — Progresso  ⬜
**Tarefas**
- [ ] Migration 0009: `start_lesson`, `_complete_lesson_internal`, `complete_lesson` — nesta fase a função só registra conclusões de aula/módulo/trilha; a concessão de XP é adicionada na fase 12 (sem stubs ou valores fictícios)
- [ ] Action `completeLesson`, `CompleteButton`, revalidação
- [ ] “Continue de onde parou” passa a refletir `start_lesson`

**Concluída quando**
- pgTAP: conclusão idempotente; módulo e trilha concluídos no momento certo; aula bloqueada rejeitada.
- E2E: concluir aula → recarregar → continua concluída, próxima liberada; duplo clique não gera duplicata.

### FASE 11 — Quiz  ⬜
**Tarefas**
- [ ] Migration 0010: `submit_quiz`, `validate_quiz`
- [ ] `QuizForm`, `QuizResult` com revisão; última tentativa exibida ao voltar
- [ ] `complete_lesson` rejeita aula com quiz não aprovado

**Concluída quando**
- pgTAP: correção no servidor; respostas inválidas rejeitadas; tentativas registradas (aprovadas e reprovadas).
- Gabarito não aparece em nenhuma resposta de rede antes do envio (E2E inspeciona payload).
- E2E: reprovar → mensagem “Você precisa atingir X%…” → refazer → aprovar → aula concluída.

### FASE 12 — XP e níveis  ⬜
**Tarefas**
- [ ] Migration 0011: `award_xp` e integração em `_complete_lesson_internal` e `submit_quiz`
- [ ] `XpCard`, `LevelBadge`, `RewardToast`; dados no dashboard e perfil
- [ ] `/perfil` (dados, XP, nível, trilhas concluídas, progresso; edição de nome/avatar)

**Concluída quando**
- pgTAP: cada evento concede o valor de `gamification_settings`/`xp_reward`; repetição concede 0; mudar setting altera concessões futuras.
- Teste unitário de `level_for_xp` nos limites (0, 99, 100, 999, 1000).
- E2E: concluir aula mostra “+10 XP”; recarregar não soma de novo.

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
