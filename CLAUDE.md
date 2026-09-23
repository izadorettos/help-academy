# CLAUDE.md — Help Academy

Guia de trabalho para qualquer agente (ou pessoa) que for alterar este repositório.
Leia este arquivo inteiro antes de escrever código. Os detalhes estão em `docs/`.

---

## 1. Produto

**Help Academy** é a plataforma própria de onboarding, treinamento e gamificação da **Help Entregas**.

- Colaboradores e parceiros (Geral, Suporte, TI, Comercial, Operacional, Supervisão, Entregadores, Estabelecimentos) acessam **trilhas** atribuídas ao seu perfil.
- Trilha → Módulos → Conteúdos (aulas) → Quiz opcional.
- O sistema registra progresso, tentativas de quiz, XP, níveis e conquistas.
- Administradores gerenciam usuários, áreas, trilhas, conteúdos e acompanham relatórios.

Documentos de referência:

| Documento | Conteúdo |
|---|---|
| `docs/PRD.md` | Requisitos de produto, regras de negócio, critérios de aceite |
| `docs/ARCHITECTURE.md` | Arquitetura, fluxos, estrutura de pastas, padrões de código |
| `docs/DATABASE.md` | Schema, constraints, índices, funções, RLS |
| `docs/DESIGN-SYSTEM.md` | Tokens, componentes, estados, acessibilidade |
| `docs/IMPLEMENTATION-PLAN.md` | Fases, tarefas e critérios de conclusão |

---

## 2. Stack

- **Next.js** (App Router, Server Components, Server Actions) + **TypeScript** (strict)
- **Tailwind CSS** (v4)
- **Supabase**: Postgres, Auth, Storage, RLS
- **Vercel** para deploy
- **Zod** para validação de entrada
- **Vitest** (unitários), **pgTAP** via `supabase test db` (RLS e funções SQL), **Playwright** (E2E)

Dependências novas exigem justificativa. Antes de instalar algo, verifique se a plataforma (Next, Supabase, Tailwind, Web APIs) já resolve.

---

## 3. Comandos

```bash
npm install                 # instalar dependências
npm run dev                 # app em http://localhost:3000
npm run lint                # ESLint
npm run typecheck           # tsc --noEmit
npm run test                # Vitest
npm run test:e2e            # Playwright
npm run build               # build de produção

npx supabase start          # Supabase local (Docker)
npx supabase db reset       # recria o banco local: migrations + seed
npx supabase migration new <nome>   # nova migration
npx supabase test db        # testes pgTAP (RLS e funções)
npm run db:types            # gera src/types/database.types.ts
```

**Uma etapa só está concluída quando `lint`, `typecheck`, `test` e `build` passam** (e `supabase test db` quando houver mudança de banco).

---

## 4. Arquitetura em uma página

```
Browser ──► proxy/middleware (renova sessão Supabase)
        ──► Server Components (leitura via cliente Supabase com a sessão do usuário → RLS aplica)
        ──► Server Actions  (mutação: valida com Zod → requireUser/requireAdmin → RPC/INSERT)
                              │
                              ▼
                       Postgres (Supabase)
                       ├─ RLS em TODAS as tabelas
                       └─ Funções SECURITY DEFINER para regras sensíveis:
                          complete_lesson, submit_quiz, award_xp, evaluate_achievements
```

- **Regras de gamificação vivem no banco** (funções SQL), não no frontend. O cliente nunca envia valores de XP, nota ou conquista.
- **Leitura**: Server Components com o cliente `server` (sessão do usuário).
- **Escrita de membro**: apenas via RPC (`complete_lesson`, `submit_quiz`, `start_lesson`).
- **Escrita de admin (conteúdo)**: Server Actions com sessão do admin; RLS verifica `is_admin()`.
- **Escrita de admin (Auth: convidar, banir, redefinir)**: Server Actions com o cliente `admin` (service role) **somente após** `requireAdmin()`.

Detalhes em `docs/ARCHITECTURE.md`.

---

## 5. Estrutura do projeto

```
src/
  app/
    (auth)/         login, recuperar-senha, redefinir-senha
    (app)/          área do membro (dashboard, trilhas, aula, conquistas, perfil)
    admin/          painel administrativo (layout com requireAdmin)
    auth/           route handlers de callback/confirm do Supabase
  components/
    ui/             primitivos (Button, Card, Input, ProgressBar, Badge, Skeleton, Dialog…)
    layout/         Sidebar, BottomNav, Header
    learning/ quiz/ gamification/ admin/   componentes de domínio
  features/<domínio>/
    queries.ts      leituras (server-only)
    actions.ts      Server Actions ('use server')
    schemas.ts      schemas Zod
  lib/
    supabase/       client.ts (browser) · server.ts · admin.ts (server-only) · session.ts
    auth/guards.ts  requireUser(), requireAdmin()
    env.ts          validação de variáveis de ambiente
  types/database.types.ts   GERADO — não editar à mão
supabase/
  migrations/       SQL versionado (fonte da verdade do schema)
  seed.sql          áreas, níveis, configurações, conquistas, trilha demo
  tests/            pgTAP
tests/
  unit/  e2e/
```

---

## 6. Convenções

**Código**
- TypeScript `strict`. Proibido `any` (use `unknown` + validação).
- Server Components por padrão; `'use client'` só quando há interação/estado no navegador.
- Arquivos de leitura/escrita de domínio ficam em `src/features/<domínio>/`, nunca soltos em componentes.
- Server Actions retornam `{ ok: true, data } | { ok: false, error }` — nunca lançam erro para o cliente com detalhes internos.
- Nomes de código, tabelas e colunas em **inglês**; textos de interface, rotas públicas e documentação em **português (pt-BR)**.
- Componentes em PascalCase; arquivos de componente `kebab-case.tsx`; hooks `use-*.ts`.
- Nada de números mágicos de gamificação no código: valores vêm de `gamification_settings` e `levels`.

**Banco**
- Toda alteração de schema = nova migration em `supabase/migrations/`. **Nunca editar migration já aplicada.**
- Toda tabela nova: `enable row level security` + políticas + teste pgTAP.
- Funções `SECURITY DEFINER` sempre com `set search_path = ''` e nomes totalmente qualificados.
- Após mudar schema: `npm run db:types` e commitar o arquivo gerado.

**Git**
- Commits pequenos, no imperativo, com escopo: `feat(quiz): registra tentativas`, `fix(rls): …`, `docs: …`.
- Uma fase do `IMPLEMENTATION-PLAN.md` por branch/PR.

---

## 7. Regras de segurança (não negociáveis)

1. `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` **nunca** em código cliente, nunca com prefixo `NEXT_PUBLIC_`. O módulo `lib/supabase/admin.ts` importa `server-only`.
2. Autorização é **sempre** server-side: RLS no banco + `requireUser()`/`requireAdmin()` em layouts **e** em cada Server Action. Esconder botão não é autorização.
3. Todo input externo passa por Zod (actions, route handlers, searchParams).
4. Não confiar em IDs vindos do cliente: o banco verifica se o usuário pode acessar aquele recurso (`can_access_lesson`, etc.).
5. Membros **não** escrevem em `xp_transactions`, `user_achievements`, `quiz_attempts` diretamente — só via funções SQL.
6. `quiz_options.is_correct` nunca é enviado ao membro antes de ele submeter a tentativa.
7. Usuário não altera o próprio `role`, `active`, `department_id` (trigger de proteção em `profiles`).
8. Conteúdo HTML/embed de admin é renderizado com sanitização e allowlist de domínios de iframe.
9. Não logar tokens, senhas ou dados pessoais.
10. Erros para o usuário são genéricos; o detalhe vai para o log do servidor.

---

## 8. Fluxo de trabalho obrigatório

```
IMPLEMENTAR → EXECUTAR → TESTAR → CORRIGIR → VALIDAR → SEGUIR
```

- Não construir várias fases de uma vez.
- Não substituir funcionalidade real por mock durante o MVP.
- Não esconder erros; se algo falhar, reportar.
- Atualizar `docs/` quando uma decisão mudar (principalmente `DATABASE.md` e `IMPLEMENTATION-PLAN.md`).

---

## 9. Não alterar sem necessidade explícita

- Migrations já aplicadas (crie uma nova).
- `src/types/database.types.ts` manualmente (é gerado).
- Funções SQL de gamificação (`complete_lesson`, `submit_quiz`, `award_xp`, `evaluate_achievements`) sem atualizar os testes pgTAP correspondentes.
- Políticas RLS sem teste cobrindo membro, admin e usuário anônimo.
- Tokens do design system (`globals.css`) sem atualizar `docs/DESIGN-SYSTEM.md`.
- Estrutura de rotas públicas (`/login`, `/dashboard`, `/trilhas`, `/aula`, `/perfil`, `/admin/*`).

## 10. Fora do escopo do MVP

Chat, feed social, comunidade, pagamentos, assinaturas, marketplace, IA, ranking competitivo, certificados avançados, push, app nativo. Não implementar nem “deixar meio pronto”.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
