# Arquitetura — Help Academy

Documento de referência técnica. Regras de produto em `PRD.md`; schema em `DATABASE.md`.

---

## 1. Visão geral

```
┌──────────────────────────── Vercel ────────────────────────────┐
│                                                                │
│  proxy.ts (middleware)                                         │
│   └─ renova cookies de sessão Supabase; redireciona anônimo    │
│      para /login (checagem otimista, NÃO é a autorização)      │
│                                                                │
│  App Router                                                    │
│   ├─ Server Components  → leitura com sessão do usuário (RLS)  │
│   ├─ Server Actions     → mutações: Zod → guard → RPC/SQL      │
│   └─ Route Handlers     → /auth/confirm, /admin/relatorios/csv │
│                                                                │
└───────────────┬────────────────────────────────────────────────┘
                │ HTTPS (supabase-js + @supabase/ssr)
┌───────────────▼──────────── Supabase (sa-east-1) ──────────────┐
│  Auth (email/senha, convites, reset)                           │
│  Postgres                                                      │
│   ├─ RLS em todas as tabelas de `public`                       │
│   ├─ Funções auxiliares: is_admin(), can_access_path(), …      │
│   └─ RPCs SECURITY DEFINER: start_lesson, complete_lesson,     │
│      submit_quiz (+ internas award_xp, evaluate_achievements)  │
│  Storage: bucket privado `lesson-files` (PDF), público `avatars`│
│           e `covers`                                           │
└────────────────────────────────────────────────────────────────┘
```

### Princípios

1. **O banco é a fronteira de segurança.** RLS + funções SQL garantem as regras mesmo se o frontend tiver bug.
2. **Regras de gamificação em um único lugar** (funções SQL transacionais). O cliente nunca informa XP, nota, aprovação ou conquista.
3. **Server-first.** Páginas são Server Components; JS no cliente só para interação (quiz, botões, formulários, menus).
4. **Idempotência por constraint**, não por “checar antes de inserir”.
5. **Sem camada de API própria no MVP.** Server Actions + RPCs cobrem tudo; não criar REST interno.

---

## 2. Stack e versões

| Camada | Escolha | Observação |
|---|---|---|
| Framework | Next.js (versão estável atual, App Router) | Confirmar versão no setup; em Next 16 o middleware chama-se `proxy.ts` |
| Linguagem | TypeScript strict | `noUncheckedIndexedAccess: true` |
| Estilo | Tailwind CSS v4 | Tokens via `@theme` em `globals.css` |
| Supabase | `@supabase/supabase-js` + `@supabase/ssr` | Chaves novas (`sb_publishable_…` / `sb_secret_…`); as legadas anon/service_role também funcionam |
| Validação | Zod | Única lib de validação |
| Markdown | `react-markdown` + `rehype-sanitize` | Justificativa: aulas de texto; sanitização obrigatória |
| Ícones | `lucide-react` | Tree-shakeable |
| Testes | Vitest, Playwright, pgTAP (`supabase test db`) | |
| CI | GitHub Actions | lint, typecheck, test, build, `supabase test db` |

Nenhuma outra dependência de runtime sem registrar a justificativa aqui.

---

## 3. Árvore de arquivos planejada

```
help-academy/
├─ CLAUDE.md
├─ README.md
├─ .env.example
├─ .github/workflows/ci.yml
├─ docs/
│  ├─ PRD.md · ARCHITECTURE.md · DATABASE.md · DESIGN-SYSTEM.md · IMPLEMENTATION-PLAN.md
├─ package.json · tsconfig.json · next.config.ts · eslint.config.mjs · postcss.config.mjs
├─ vitest.config.ts · playwright.config.ts
├─ public/
│  └─ brand/ (logo Help, favicon)
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  ├─ 0001_extensions_and_enums.sql
│  │  ├─ 0002_core_tables.sql          (departments, profiles)
│  │  ├─ 0003_learning_tables.sql      (paths, modules, lessons, quizzes…)
│  │  ├─ 0004_progress_tables.sql      (progress, attempts, completions)
│  │  ├─ 0005_gamification_tables.sql  (settings, levels, xp, achievements)
│  │  ├─ 0006_helper_functions.sql     (is_admin, can_access_*)
│  │  ├─ 0007_rls_policies.sql
│  │  ├─ 0008_triggers.sql             (updated_at, handle_new_user, protect_profile)
│  │  ├─ 0009_rpc_learning.sql         (start_lesson, complete_lesson)
│  │  ├─ 0010_rpc_quiz.sql             (submit_quiz, get_quiz_for_member)
│  │  ├─ 0011_gamification_functions.sql (award_xp, evaluate_achievements)
│  │  ├─ 0012_views_reports.sql
│  │  └─ 0013_storage.sql
│  ├─ seed.sql
│  └─ tests/
│     ├─ 00_setup_helpers.sql
│     ├─ rls_profiles.test.sql · rls_learning.test.sql · rls_progress.test.sql
│     ├─ complete_lesson.test.sql · submit_quiz.test.sql · achievements.test.sql
├─ src/
│  ├─ proxy.ts                      (ou middleware.ts, conforme versão)
│  ├─ app/
│  │  ├─ layout.tsx · globals.css · not-found.tsx · error.tsx
│  │  ├─ page.tsx                   (redireciona para /dashboard)
│  │  ├─ (auth)/
│  │  │  ├─ layout.tsx
│  │  │  ├─ login/page.tsx
│  │  │  ├─ recuperar-senha/page.tsx
│  │  │  └─ redefinir-senha/page.tsx
│  │  ├─ auth/confirm/route.ts      (verifyOtp: convite, recovery)
│  │  ├─ (app)/
│  │  │  ├─ layout.tsx              (requireUser + Sidebar/BottomNav)
│  │  │  ├─ dashboard/page.tsx · loading.tsx
│  │  │  ├─ trilhas/page.tsx · loading.tsx
│  │  │  ├─ trilhas/[slug]/page.tsx · loading.tsx
│  │  │  ├─ aula/[id]/page.tsx · loading.tsx
│  │  │  ├─ conquistas/page.tsx
│  │  │  └─ perfil/page.tsx
│  │  └─ admin/
│  │     ├─ layout.tsx              (requireAdmin + AdminSidebar)
│  │     ├─ page.tsx
│  │     ├─ usuarios/page.tsx · usuarios/[id]/page.tsx
│  │     ├─ areas/page.tsx
│  │     ├─ trilhas/page.tsx · trilhas/nova/page.tsx · trilhas/[id]/page.tsx (construtor)
│  │     ├─ trilhas/[id]/aulas/[lessonId]/page.tsx (editor de aula + quiz)
│  │     ├─ conteudos/page.tsx
│  │     ├─ relatorios/page.tsx · relatorios/export/route.ts (CSV)
│  │     └─ configuracoes/page.tsx
│  ├─ components/
│  │  ├─ ui/        button, card, input, textarea, select, checkbox, radio-group,
│  │  │             progress-bar, progress-ring, badge, avatar, skeleton, dialog,
│  │  │             confirm-dialog, toast, empty-state, error-state, tabs, table
│  │  ├─ layout/    sidebar, bottom-nav, app-header, admin-sidebar
│  │  ├─ learning/  path-card, module-list, lesson-row, lesson-viewer/*,
│  │  │             continue-card, complete-button, lesson-nav
│  │  ├─ quiz/      quiz-form, quiz-result, question-review
│  │  ├─ gamification/ xp-card, level-badge, achievement-card, reward-toast
│  │  └─ admin/     users-table, user-form, department-form, path-form,
│  │                path-builder, lesson-form, quiz-editor, report-table, filters
│  ├─ features/
│  │  ├─ auth/          actions.ts · schemas.ts
│  │  ├─ profile/       queries.ts · actions.ts · schemas.ts
│  │  ├─ learning/      queries.ts · actions.ts · schemas.ts · progress.ts (tipos/helpers puros)
│  │  ├─ quiz/          queries.ts · actions.ts · schemas.ts
│  │  ├─ gamification/  queries.ts · level.ts (helpers puros)
│  │  └─ admin/
│  │     ├─ users/ · departments/ · paths/ · lessons/ · quizzes/ · reports/ · settings/
│  │        (cada um com queries.ts · actions.ts · schemas.ts)
│  ├─ lib/
│  │  ├─ supabase/ client.ts · server.ts · admin.ts · proxy.ts
│  │  ├─ auth/guards.ts
│  │  ├─ env.ts
│  │  ├─ action-result.ts
│  │  ├─ embed-allowlist.ts
│  │  ├─ dates.ts            (fuso America/Sao_Paulo, formatação pt-BR)
│  │  └─ logger.ts
│  └─ types/database.types.ts   (gerado)
└─ tests/
   ├─ unit/   level.test.ts · progress.test.ts · schemas.test.ts · embed-allowlist.test.ts
   └─ e2e/    auth.spec.ts · member-flow.spec.ts · quiz.spec.ts · admin.spec.ts
              · authorization.spec.ts · mobile.spec.ts
```

---

## 4. Clientes Supabase

| Módulo | Onde roda | Chave | Uso |
|---|---|---|---|
| `lib/supabase/client.ts` | Browser | publishable | Raro: apenas `onAuthStateChange`, upload de avatar |
| `lib/supabase/server.ts` | Server Components, Actions, Route Handlers | publishable + cookies do usuário | **Padrão** para tudo — RLS aplica |
| `lib/supabase/admin.ts` | Somente servidor (`import 'server-only'`) | secret | Somente Auth Admin API: convidar, desativar (ban), reenviar convite, alterar email |
| `lib/supabase/proxy.ts` | proxy/middleware | publishable | Renovar sessão |

Regra: o cliente `admin` **ignora RLS** e só é chamado dentro de actions que começam com `await requireAdmin()`. Nunca usá-lo para leitura de dados de aprendizagem.

---

## 5. Autenticação e autorização

### 5.1 Fluxos

- **Login:** formulário → Server Action `signIn` → `supabase.auth.signInWithPassword` → redirect `/dashboard`.
- **Convite:** admin preenche formulário → action → `admin.auth.admin.inviteUserByEmail(email, { data: { name } , redirectTo })` → trigger `handle_new_user` cria `profiles` → admin action completa área/cargo/role/data de entrada → usuário clica no email → `/auth/confirm?token_hash=…&type=invite` → `verifyOtp` → `/redefinir-senha` para definir senha.
- **Recuperação:** `/recuperar-senha` → `resetPasswordForEmail` → `/auth/confirm?type=recovery` → `/redefinir-senha` → `updateUser({ password })`.
- **Cadastro público desativado:** `enable_signup = false` no Supabase (config.toml e painel). Convites continuam funcionando.
- **Desativar usuário:** `profiles.active = false` **e** `auth.admin.updateUserById(id, { ban_duration: '876000h' })`. Reativar desfaz os dois. As funções `can_access_*` também exigem `active = true`, cobrindo a janela até o token expirar.

### 5.2 Camadas de proteção

| Camada | O que faz | Suficiente sozinha? |
|---|---|---|
| `proxy.ts` | Renova sessão; anônimo em rota protegida → `/login` | Não |
| `(app)/layout.tsx` → `requireUser()` | `supabase.auth.getUser()` (validado no servidor) + profile ativo | Não |
| `admin/layout.tsx` → `requireAdmin()` | Idem + `role = 'admin'`; senão `notFound()` | Não |
| Cada Server Action | Chama `requireUser()`/`requireAdmin()` de novo | Não |
| RLS + funções SQL | Filtra/nega no banco | **Sim** — é a garantia final |

Layouts não protegem Server Actions (actions são endpoints POST independentes), por isso o guard é repetido em cada action.

### 5.3 Guards

```ts
// lib/auth/guards.ts (esboço)
export async function requireUser(): Promise<SessionUser>   // redirect('/login') se não autenticado ou inativo
export async function requireAdmin(): Promise<SessionUser>  // notFound() se não for admin
```

`SessionUser` = `{ id, email, name, role, departmentId, avatarUrl }`, carregado uma vez por request (`React.cache`).

---

## 6. Fluxos de dados principais

### 6.1 Abrir aula

```
/aula/[id] (Server Component)
  ├─ requireUser()
  ├─ rpc('get_lesson_for_member', { p_lesson_id })  → 404 se sem acesso
  │    retorna aula + estado (locked/completed) + prev/next + quiz (sem gabarito)
  ├─ se locked → <LockedLesson/>
  └─ rpc('start_lesson') — idempotente (started_at uma vez, last_accessed_at sempre)
```

`start_lesson` roda no render do servidor; é uma escrita idempotente e barata. Alternativa (se incomodar prefetch do Next): disparar via Server Action no `useEffect` do viewer. Decisão final no implementation plan, fase 9.

### 6.2 Concluir aula

```
<CompleteButton> (client) ─► action completeLesson(lessonId)
   ├─ Zod: uuid
   ├─ requireUser()
   └─ rpc('complete_lesson', { p_lesson_id })  ── transação única no Postgres:
        1. verifica acesso + não bloqueada + aula sem quiz (ou quiz já aprovado)
        2. INSERT lesson_progress … ON CONFLICT → set completed_at se nulo
        3. se já estava concluída → retorna { already_completed: true } sem efeitos
        4. award_xp('lesson_completed', lesson)
        5. se módulo completo → module_completions + award_xp('module_completed')
        6. se trilha completa → user_learning_paths.completed_at + award_xp('path_completed')
        7. evaluate_achievements(user)
        8. retorna { xp_awarded, new_total_xp, level, level_up, achievements[], module_completed, path_completed, next_lesson_id }
   └─ revalidatePath('/dashboard'), ('/trilhas/[slug]'), ('/aula/[id]')
```

### 6.3 Submeter quiz

```
<QuizForm> ─► action submitQuiz(quizId, answers[{questionId, optionId}])
   ├─ Zod
   ├─ requireUser()
   └─ rpc('submit_quiz', { p_quiz_id, p_answers jsonb })
        1. verifica acesso à aula do quiz
        2. valida que cada questão pertence ao quiz e cada opção à questão; todas respondidas
        3. corrige no servidor, grava quiz_attempts + quiz_attempt_answers
        4. se aprovado: award_xp('quiz_passed'); se 100%: award_xp('quiz_perfect')
        5. se aprovado: executa a lógica de conclusão da aula (mesma função interna de complete_lesson)
        6. evaluate_achievements
        7. retorna score, total, percent, passed, passing_score, review[] (correta, escolhida, explicação), recompensas
```

### 6.4 Idempotência

Garantida por constraints únicas (ver `DATABASE.md`):
- `lesson_progress (user_id, lesson_id)`
- `module_completions (user_id, module_id)`
- `user_learning_paths (user_id, learning_path_id)`
- `xp_transactions (user_id, reason, reference_id)`
- `user_achievements (user_id, achievement_id)`

Todas as inserções usam `ON CONFLICT DO NOTHING` e checam `FOUND`/`RETURNING` para saber se o evento é novo. Duas requisições simultâneas: a segunda perde no conflito e não concede nada. No front, o botão fica `disabled` durante a action (`useActionState`), mas isso é só UX.

---

## 7. Padrões de código

### 7.1 Server Actions

```ts
'use server'
export async function completeLesson(input: unknown): Promise<ActionResult<CompletionResult>> {
  const parsed = completeLessonSchema.safeParse(input)
  if (!parsed.success) return fail('Dados inválidos.')
  await requireUser()
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('complete_lesson', { p_lesson_id: parsed.data.lessonId })
  if (error) return failFromDb(error)          // mapeia códigos conhecidos → mensagem pt-BR; loga o resto
  revalidatePath(...)
  return ok(data)
}
```

- `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string,string[]> }`
- Funções SQL levantam erros com `ERRCODE` próprios (`P0001` + mensagem-chave como `LESSON_LOCKED`, `NO_ACCESS`), mapeados em `failFromDb`.

### 7.2 Queries

- Em `features/*/queries.ts`, com `import 'server-only'`.
- Retornam tipos de domínio (não linhas cruas) e usam `React.cache` quando chamadas várias vezes no mesmo request.
- Agregações de progresso vêm de views/funções SQL (`v_user_path_progress`), não de loops em JS.

### 7.3 Componentes

- Server por padrão. Client components ficam nas folhas (`complete-button`, `quiz-form`, `confirm-dialog`, `bottom-nav` com estado ativo).
- Cada rota com dados tem `loading.tsx` (skeleton) e o segmento tem `error.tsx`.
- Estados vazios usam `<EmptyState>` com texto do `DESIGN-SYSTEM.md`.

### 7.4 Tratamento de erros

| Situação | Comportamento |
|---|---|
| Recurso sem acesso / inexistente | `notFound()` → 404 amigável |
| Aula bloqueada por sequência | Tela específica, não erro |
| Erro de validação | Mensagem por campo, `aria-describedby` |
| Erro inesperado em action | Toast “Não foi possível concluir. Tente novamente.” + log servidor |
| Erro inesperado em render | `error.tsx` com botão “Tentar novamente” |

### 7.5 Conteúdo externo

- `embed` e `video`: URL validada contra `lib/embed-allowlist.ts` (YouTube, Vimeo, Google Drive/Docs/Slides, Loom — ajustar em D-06) no **salvamento** (admin) e na **renderização**. Iframe com `sandbox` mínimo e `referrerpolicy="strict-origin-when-cross-origin"`.
- `text`: Markdown renderizado com `rehype-sanitize` (sem HTML cru).
- `pdf`: arquivo em bucket privado; URL assinada de curta duração gerada no servidor após checar acesso.
- CSP em `next.config.ts` com `frame-src` restrito à allowlist.

---

## 8. Variáveis de ambiente

| Variável | Escopo | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | público | Chave publishable (ou anon legada) |
| `SUPABASE_SECRET_KEY` | **servidor** | Chave secret (ou service_role legada) — só `lib/supabase/admin.ts` |
| `NEXT_PUBLIC_SITE_URL` | público | Base para links de convite/recuperação |

`lib/env.ts` valida com Zod no boot; falta de variável derruba o build com mensagem clara.

---

## 9. Ambientes

| Ambiente | Supabase | Vercel |
|---|---|---|
| Local | `supabase start` (Docker) + `seed.sql` | `npm run dev` |
| Preview | Projeto Supabase de staging | Preview deployments por PR |
| Produção | Projeto Supabase de produção (`sa-east-1`) | Branch `main` |

Migrations aplicadas via `supabase db push` no CI (job manual/aprovado para produção). Seed de produção contém apenas dados de referência (áreas, níveis, configurações, conquistas), nunca a trilha demo.

---

## 10. Estratégia de testes

| Nível | Ferramenta | Cobre |
|---|---|---|
| Banco | pgTAP | RLS (anon, member A, member B, admin) em cada tabela; `complete_lesson`, `submit_quiz`, `award_xp`, `evaluate_achievements` incluindo idempotência e sequência |
| Unidade | Vitest | Schemas Zod, helpers de nível/progresso, allowlist, mapeamento de erros |
| E2E | Playwright | Login, fluxo do membro, quiz, admin cria trilha e atribui, tentativa de acesso indevido, viewports mobile/desktop, axe (acessibilidade) |

---

## 11. Preparação para evolução (sem implementar)

- **Gestor de área:** `role` é enum; adicionar `manager` + políticas por `department_id` depois.
- **Certificados:** `user_learning_paths.completed_at` já é a fonte.
- **Notificações:** eventos já centralizados nas RPCs; basta emitir para uma tabela `events`.
- **Ranking:** `xp_transactions` permite agregação; fora do MVP.

---

## 12. Riscos técnicos

| Risco | Mitigação |
|---|---|
| RLS com subconsultas lentas em listagens | Funções `STABLE` + índices em FKs; views agregadas; medir com `explain analyze` na fase 16 |
| Lógica duplicada entre `complete_lesson` e `submit_quiz` | Função interna única `_complete_lesson_internal` |
| Iframes de terceiros (XSS, tracking) | Allowlist + sandbox + CSP |
| Convites caindo em spam / expirando | SMTP próprio (D-03); ação “reenviar convite” |
| Entregadores sem email corporativo | Decisão D-02 |
| Admin edita trilha já iniciada | RN-06 (conclusão congelada); XP nunca retirado |
| Service key vazando | `server-only`, sem prefixo `NEXT_PUBLIC_`, checagem no CI (grep no bundle) |
