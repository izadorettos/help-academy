# Banco de dados — Help Academy

Postgres (Supabase). Este documento é a especificação das migrations em `supabase/migrations/`.
**As migrations são a fonte da verdade**; mantenha este arquivo sincronizado.

---

## 1. Diferenças em relação ao schema sugerido na especificação

| Sugestão original | Proposta final | Motivo |
|---|---|---|
| `profiles.id` + `profiles.auth_user_id` | `profiles.id` **é** o `auth.users.id` (PK e FK) | Padrão Supabase; RLS mais simples (`id = auth.uid()`), um identificador só |
| `learning_paths.department_id` (uma área) | `owner_department_id` (área responsável) + tabela `learning_path_departments` (áreas-alvo, N:N) | “Onboarding Geral” precisa ir para todas as áreas; uma trilha pode servir Suporte e Supervisão |
| `learning_paths.published` (bool) + arquivar | `status` enum `draft · published · archived` | Três estados mutuamente exclusivos |
| `user_learning_paths` só para atribuição | Atribuição individual **e** registro de início/conclusão por usuário | Precisa de um lugar para `completed_at` também em trilhas atribuídas por área |
| — | `module_completions` | Conclusão de módulo idempotente e consultável (XP e conquista “Começou com Tudo”) |
| `quiz_attempts.score` | `correct_count`, `total_questions`, `score` (%) + tabela `quiz_attempt_answers` | Mostrar “8/10 · 80%” e revisar respostas |
| — | `lesson_progress.last_accessed_at` | “Continue de onde parou” |
| — | `lessons.file_path` | PDF no Storage privado (não é URL pública) |
| Valores de XP/níveis no código | `gamification_settings` + `levels` | Configurável pelo admin, sem números mágicos |
| `achievements` sem regra | `achievements.code` mapeado para regra SQL em `evaluate_achievements` | Conquistas calculadas no backend |

---

## 2. Diagrama (resumo)

```
auth.users 1─1 profiles ─┬─ n:1 departments
                         │
departments n─n learning_paths (learning_path_departments)
learning_paths 1─n modules 1─n lessons 1─0..1 quizzes 1─n quiz_questions 1─n quiz_options

profiles ─┬─ user_learning_paths ── learning_paths
          ├─ lesson_progress ────── lessons
          ├─ module_completions ─── modules
          ├─ quiz_attempts ──────── quizzes
          │     └─ quiz_attempt_answers ── quiz_questions / quiz_options
          ├─ xp_transactions
          └─ user_achievements ──── achievements

gamification_settings (chave/valor) · levels
```

---

## 3. Tipos

```sql
create extension if not exists citext;

create type public.user_role     as enum ('member', 'admin');
create type public.path_status   as enum ('draft', 'published', 'archived');
create type public.lesson_type   as enum ('text', 'video', 'pdf', 'link', 'embed');
create type public.question_type as enum ('multiple_choice', 'true_false');
create type public.xp_reason     as enum ('lesson_completed', 'quiz_passed', 'quiz_perfect',
                                          'module_completed', 'path_completed');
```

---

## 4. Tabelas

Convenções: PK `uuid default gen_random_uuid()`; `created_at`/`updated_at timestamptz not null default now()`; trigger `set_updated_at` em toda tabela com `updated_at`.

### 4.1 `departments`

```sql
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index departments_name_ci_key on public.departments (lower(name));
```

### 4.2 `profiles`

```sql
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 2 and 120),
  email          citext not null unique,
  avatar_url     text,
  role           public.user_role not null default 'member',
  job_title      text,
  department_id  uuid references public.departments (id) on delete restrict,
  hire_date      date,
  active         boolean not null default true,
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index profiles_department_idx on public.profiles (department_id);
create index profiles_active_idx     on public.profiles (active);
```

- Criado pelo trigger `handle_new_user` (após insert em `auth.users`), com `name` vindo de `raw_user_meta_data->>'name'`.
- `department_id` pode ser nulo apenas transitoriamente (convite recém-criado); a UI do admin exige preencher.
- Trigger `protect_profile_columns`: se quem altera **não** é admin, bloqueia mudança em `role`, `active`, `department_id`, `email`, `job_title`, `hire_date`.

### 4.3 `learning_paths`

```sql
create table public.learning_paths (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null check (char_length(title) between 3 and 120),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description          text,
  cover_url            text,
  owner_department_id  uuid references public.departments (id) on delete set null,
  required             boolean not null default false,
  sequential           boolean not null default false,
  status               public.path_status not null default 'draft',
  position             integer not null default 0,
  published_at         timestamptz,
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index learning_paths_status_position_idx on public.learning_paths (status, position);
```

### 4.4 `learning_path_departments` (áreas-alvo)

```sql
create table public.learning_path_departments (
  learning_path_id  uuid not null references public.learning_paths (id) on delete cascade,
  department_id     uuid not null references public.departments (id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (learning_path_id, department_id)
);
create index lpd_department_idx on public.learning_path_departments (department_id);
```

### 4.5 `modules`

```sql
create table public.modules (
  id                uuid primary key default gen_random_uuid(),
  learning_path_id  uuid not null references public.learning_paths (id) on delete cascade,
  title             text not null check (char_length(title) between 2 and 120),
  description       text,
  position          integer not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (learning_path_id, position) deferrable initially deferred
);
```

`deferrable initially deferred` permite reordenar (trocar posições) em uma transação.

### 4.6 `lessons`

```sql
create table public.lessons (
  id                 uuid primary key default gen_random_uuid(),
  module_id          uuid not null references public.modules (id) on delete cascade,
  title              text not null check (char_length(title) between 2 and 160),
  description        text,
  content_type       public.lesson_type not null,
  content            text,          -- Markdown (text)
  external_url       text,          -- video / link / embed
  file_path          text,          -- pdf: caminho no bucket lesson-files
  estimated_minutes  integer check (estimated_minutes between 0 and 600),
  xp_reward          integer check (xp_reward between 0 and 1000),  -- null = usa gamification_settings.xp_lesson_default
  required           boolean not null default true,
  published          boolean not null default false,
  position           integer not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (module_id, position) deferrable initially deferred,
  constraint lessons_payload_by_type check (
    (content_type = 'text'                      and content is not null)
 or (content_type in ('video','link','embed')   and external_url is not null)
 or (content_type = 'pdf'                       and file_path is not null)
  ),
  constraint lessons_url_https check (external_url is null or external_url ~ '^https://')
);
```

### 4.7 `quizzes`, `quiz_questions`, `quiz_options`

```sql
create table public.quizzes (
  id             uuid primary key default gen_random_uuid(),
  lesson_id      uuid not null unique references public.lessons (id) on delete cascade,
  title          text not null,
  passing_score  integer not null default 70 check (passing_score between 0 and 100),
  xp_reward      integer check (xp_reward between 0 and 1000),   -- null = xp_quiz_default
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.quiz_questions (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes (id) on delete cascade,
  question     text not null check (char_length(question) between 3 and 1000),
  type         public.question_type not null,
  explanation  text,
  position     integer not null,
  unique (quiz_id, position) deferrable initially deferred
);

create table public.quiz_options (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.quiz_questions (id) on delete cascade,
  text         text not null check (char_length(text) between 1 and 500),
  is_correct   boolean not null default false,
  position     integer not null,
  unique (question_id, position) deferrable initially deferred
);
-- no máximo uma correta por pergunta
create unique index quiz_options_one_correct on public.quiz_options (question_id) where is_correct;
```

Regras validadas pela função `validate_quiz(quiz_id)` (chamada ao publicar a aula e no salvamento do editor): ≥ 1 pergunta; toda pergunta com exatamente 1 correta; `multiple_choice` com 2–6 opções; `true_false` com exatamente 2 (“Verdadeiro”, “Falso”).

### 4.8 `user_learning_paths`

```sql
create table public.user_learning_paths (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  learning_path_id       uuid not null references public.learning_paths (id) on delete cascade,
  assigned_individually  boolean not null default false,
  assigned_by            uuid references public.profiles (id) on delete set null,
  assigned_at            timestamptz,
  started_at             timestamptz,
  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  unique (user_id, learning_path_id)
);
create index ulp_path_idx on public.user_learning_paths (learning_path_id);
```

- Linha criada quando: admin atribui individualmente (`assigned_individually = true`) **ou** o usuário inicia a trilha (upsert em `start_lesson`).
- Remover atribuição individual = `assigned_individually = false` (preserva `started_at`/`completed_at`).

### 4.9 `lesson_progress`

```sql
create table public.lesson_progress (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  lesson_id         uuid not null references public.lessons (id) on delete cascade,
  started_at        timestamptz not null default now(),
  last_accessed_at  timestamptz not null default now(),
  completed_at      timestamptz,
  unique (user_id, lesson_id)
);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);
create index lesson_progress_resume_idx on public.lesson_progress (user_id, last_accessed_at desc)
  where completed_at is null;
```

### 4.10 `module_completions`

```sql
create table public.module_completions (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  module_id     uuid not null references public.modules (id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, module_id)
);
```

### 4.11 `quiz_attempts`, `quiz_attempt_answers`

```sql
create table public.quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  quiz_id          uuid not null references public.quizzes (id) on delete cascade,
  correct_count    integer not null check (correct_count >= 0),
  total_questions  integer not null check (total_questions > 0),
  score            integer not null check (score between 0 and 100),
  passed           boolean not null,
  started_at       timestamptz,
  completed_at     timestamptz not null default now(),
  check (correct_count <= total_questions)
);
create index quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_id, completed_at desc);

create table public.quiz_attempt_answers (
  attempt_id   uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id  uuid not null references public.quiz_questions (id) on delete cascade,
  option_id    uuid references public.quiz_options (id) on delete set null,
  is_correct   boolean not null,
  primary key (attempt_id, question_id)
);
```

### 4.12 `gamification_settings`, `levels`

```sql
create table public.gamification_settings (
  key          text primary key,
  value        integer not null check (value >= 0),
  description  text not null,
  updated_at   timestamptz not null default now()
);
-- seed: xp_lesson_default=10, xp_quiz_default=20, xp_quiz_perfect_bonus=30,
--       xp_module_completed=50, xp_path_completed=100

create table public.levels (
  level   integer primary key check (level >= 1),
  min_xp  integer not null unique check (min_xp >= 0),
  name    text
);
-- seed: (1,0) (2,100) (3,250) (4,500) (5,1000). Nível 1 obrigatoriamente min_xp = 0.
```

O teto de cada nível é o `min_xp` do próximo; não há coluna `max_xp` (evita faixas inconsistentes).

### 4.13 `xp_transactions`

```sql
create table public.xp_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  amount          integer not null check (amount > 0),
  reason          public.xp_reason not null,
  reference_type  text not null check (reference_type in ('lesson','quiz','module','learning_path')),
  reference_id    uuid not null,
  created_at      timestamptz not null default now(),
  unique (user_id, reason, reference_id)
);
create index xp_transactions_user_idx on public.xp_transactions (user_id, created_at desc);
```

`reference_id` é polimórfico (sem FK) para que o histórico sobreviva à exclusão de conteúdo (RN-10).

### 4.14 `achievements`, `user_achievements`

```sql
create table public.achievements (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  description  text not null,
  icon         text not null,           -- nome do ícone lucide
  active       boolean not null default true,
  position     integer not null default 0
);

create table public.user_achievements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  achievement_id  uuid not null references public.achievements (id) on delete cascade,
  earned_at       timestamptz not null default now(),
  unique (user_id, achievement_id)
);
```

### 4.15 Total de XP

Sem coluna desnormalizada no MVP: `select coalesce(sum(amount),0) from xp_transactions where user_id = …` (indexado). Se ficar lento, adicionar `profiles.total_xp` mantido por trigger.

---

## 5. Funções auxiliares

Todas `language sql stable security definer set search_path = ''`, nomes qualificados.

| Função | Retorno | Regra |
|---|---|---|
| `is_admin()` | bool | profile de `auth.uid()` com `role = 'admin'` e `active` |
| `is_active_user()` | bool | profile de `auth.uid()` existe e `active` |
| `can_access_path(p_path uuid, p_user uuid default auth.uid())` | bool | usuário ativo **e** trilha `published` **e** (área do usuário ∈ `learning_path_departments` **ou** `user_learning_paths.assigned_individually`) |
| `can_access_lesson(p_lesson uuid, p_user uuid default auth.uid())` | bool | aula `published` e `can_access_path` da trilha do módulo |
| `is_lesson_unlocked(p_lesson uuid, p_user uuid default auth.uid())` | bool | trilha não sequencial → true; senão, todas as aulas **obrigatórias publicadas** anteriores (ordem `modules.position`, `lessons.position`) concluídas |
| `user_total_xp(p_user uuid)` | int | soma de `xp_transactions` (usuário próprio ou admin) |
| `level_for_xp(p_xp int)` | record(level, min_xp, next_min_xp) | maior `levels.min_xp ≤ p_xp` |
| `get_setting(p_key text)` | int | valor em `gamification_settings` (erro se chave não existe) |

`is_admin()` é `security definer` para não recair em recursão de RLS ao ler `profiles`.

---

## 6. RPCs (operações do membro)

Todas `security definer`, `set search_path = ''`, executáveis apenas por `authenticated` (`revoke execute … from public, anon`). Usam `auth.uid()` — **nunca** recebem `user_id` como parâmetro.

### 6.1 `start_lesson(p_lesson_id uuid) returns void`
1. `can_access_lesson` e `is_lesson_unlocked` → senão `raise 'NO_ACCESS' / 'LESSON_LOCKED'`.
2. `insert into lesson_progress … on conflict (user_id, lesson_id) do update set last_accessed_at = now()`.
3. Upsert em `user_learning_paths` com `started_at = coalesce(started_at, now())`.
4. `update profiles set last_seen_at = now()`.

### 6.2 `get_lesson_for_member(p_lesson_id uuid) returns jsonb`
Retorna aula, trilha/módulo (breadcrumb), `locked`, `completed`, `prev_lesson_id`, `next_lesson_id`, `xp`, e, se houver quiz: `{ id, title, passing_score, questions:[{id, question, type, options:[{id, text}]}], last_attempt }` — **sem `is_correct`**. Sem acesso → `null` (a página responde 404).

### 6.3 `complete_lesson(p_lesson_id uuid) returns jsonb`
1. Valida acesso e desbloqueio.
2. Se a aula tem quiz e não há tentativa aprovada → `raise 'QUIZ_REQUIRED'`.
3. Chama `_complete_lesson_internal(uid, lesson)`.

### 6.4 `_complete_lesson_internal(p_user uuid, p_lesson uuid) returns jsonb` (sem `grant`, só chamada por outras funções)

```
insert into lesson_progress (user_id, lesson_id) values (…) on conflict do nothing
select completed_at into v_prev from lesson_progress where … for update   -- trava a linha
if v_prev is not null → return { already_completed: true, …estado atual }
update lesson_progress set completed_at = now(), last_accessed_at = now() where …

award_xp(p_user, 'lesson_completed', 'lesson', lesson, coalesce(lesson.xp_reward, get_setting('xp_lesson_default')))

if todas as aulas obrigatórias publicadas do módulo concluídas (e existe ≥ 1):
    insert module_completions on conflict do nothing
    if inserido → award_xp(…, 'module_completed', 'module', module, get_setting('xp_module_completed'))

if todas as aulas obrigatórias publicadas da trilha concluídas:
    update user_learning_paths set completed_at = now() where … and completed_at is null
    if atualizado → award_xp(…, 'path_completed', 'learning_path', path, get_setting('xp_path_completed'))

achievements := evaluate_achievements(p_user)
return { xp_awarded, total_xp, level, level_up, module_completed, path_completed,
         achievements: [...], next_lesson_id }
```

Concorrência: `select … for update` na linha de `lesson_progress` (criada antes com `on conflict do nothing`) serializa cliques duplos; as constraints únicas são a segunda barreira.

### 6.5 `submit_quiz(p_quiz_id uuid, p_answers jsonb) returns jsonb`
`p_answers = [{ "question_id": uuid, "option_id": uuid }, …]`
1. Acesso à aula do quiz + desbloqueio.
2. Cada `question_id` pertence ao quiz, sem repetição, todas respondidas; cada `option_id` pertence à sua questão → senão `raise 'INVALID_ANSWERS'`.
3. `correct_count`, `total`, `score = floor(correct*100/total)`, `passed = score >= passing_score`.
4. Insere `quiz_attempts` + `quiz_attempt_answers`.
5. Se `passed`: `award_xp('quiz_passed', 'quiz', quiz, coalesce(quiz.xp_reward, get_setting('xp_quiz_default')))`; se `score = 100`: `award_xp('quiz_perfect', …, get_setting('xp_quiz_perfect_bonus'))`; `_complete_lesson_internal`.
6. `evaluate_achievements` (caso ainda não chamado).
7. Retorna resultado + `review[]` (`question_id`, `chosen_option_id`, `correct_option_id`, `explanation`) + recompensas.

### 6.6 `award_xp(p_user, p_reason, p_ref_type, p_ref_id, p_amount) returns integer` (interna)
`insert … on conflict (user_id, reason, reference_id) do nothing returning amount` → retorna XP efetivamente concedido (0 se repetido ou `p_amount = 0`).

### 6.7 `evaluate_achievements(p_user uuid) returns setof achievements` (interna)
Para cada conquista `active` ainda não obtida, avalia a regra pelo `code`:

| code | Regra SQL |
|---|---|
| `first_lesson` | existe `lesson_progress.completed_at` |
| `first_module` | existe `module_completions` |
| `perfect_quiz` | existe `quiz_attempts.score = 100` |
| `halfway` | alguma trilha com progresso ≥ 50% (`v_user_path_progress`) |
| `path_completed` | existe `user_learning_paths.completed_at` |

Insere com `on conflict do nothing` e retorna só as novas. Nova conquista = novo `code` + novo ramo na função (migration).

### 6.8 RPCs de admin
Operações que precisam de transação/lógica: `admin_reorder_modules(path, ids[])`, `admin_reorder_lessons(module, ids[])`, `admin_duplicate_path(path) returns uuid`, `admin_set_path_departments(path, dept_ids[])`, `admin_report(filters jsonb)`. Todas começam com `if not is_admin() then raise 'FORBIDDEN'`.

---

## 7. Views

Criadas com `with (security_invoker = true)` para respeitar RLS de quem consulta.

- **`v_user_path_access`** — (user_id, learning_path_id, via) para todos os pares com acesso (por área ∪ individual). Base das demais.
- **`v_user_path_progress`** — (user_id, learning_path_id, required_total, required_done, percent, status, started_at, completed_at, last_accessed_at). `status`: `not_started` / `in_progress` / `completed`.
- **`v_user_quiz_stats`** — média da **melhor** nota por quiz, por usuário e trilha (para “Quiz médio” do relatório).

---

## 8. RLS

`alter table … enable row level security` em **todas** as tabelas. Nenhuma política para `anon`. Legenda: **P** = próprio (`user_id = auth.uid()`), **A** = `is_admin()`, **L** = conteúdo acessível (`can_access_*`).

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `departments` | autenticado ativo | A | A | — (desativar) |
| `profiles` | P ou A | — (trigger) | P (colunas limitadas por trigger) ou A | — |
| `learning_paths` | L ou A | A | A | A (só `draft` sem progresso) |
| `learning_path_departments` | L ou A | A | A | A |
| `modules` | L (via trilha) ou A | A | A | A |
| `lessons` | L (`published`) ou A | A | A | A |
| `quizzes` | L ou A | A | A | A |
| `quiz_questions` | L ou A | A | A | A |
| `quiz_options` | **somente A** | A | A | A |
| `user_learning_paths` | P ou A | A | A | A |
| `lesson_progress` | P ou A | — (RPC) | — (RPC) | — |
| `module_completions` | P ou A | — | — | — |
| `quiz_attempts` | P ou A | — (RPC) | — | — |
| `quiz_attempt_answers` | P (via attempt) ou A | — | — | — |
| `gamification_settings` | autenticado | — | A | — |
| `levels` | autenticado | A | A | A |
| `xp_transactions` | P ou A | — | — | — |
| `achievements` | autenticado | A | A | — |
| `user_achievements` | P ou A | — | — | — |

Pontos críticos:
- Membro **não** lê `quiz_options` diretamente — recebe opções sem gabarito por `get_lesson_for_member` e a correção por `submit_quiz`. Isso impede ler `is_correct` pela API REST.
- Escrita em progresso, tentativas, XP e conquistas só acontece dentro das RPCs `security definer`.
- Colunas protegidas de `profiles` via trigger (RLS não restringe colunas no UPDATE).
- `grant`/`revoke`: `revoke all on all tables in schema public from anon;` e grants explícitos para `authenticated`.

Storage:
- `lesson-files` (privado): leitura só via URL assinada criada no servidor após `can_access_lesson`; escrita A.
- `avatars` (público para leitura): escrita apenas em `avatars/{auth.uid()}/*`.
- `covers` (público para leitura): escrita A.

---

## 9. Triggers

| Trigger | Tabela | Função |
|---|---|---|
| `set_updated_at` | todas com `updated_at` | `updated_at = now()` |
| `on_auth_user_created` | `auth.users` after insert | `handle_new_user()` cria profile (role member, email, name) |
| `protect_profile_columns` | `profiles` before update | não-admin não altera colunas administrativas |
| `set_published_at` | `learning_paths` before update | grava `published_at` na primeira publicação |
| `validate_publish` | `lessons` before update of `published` | ao publicar aula com quiz, exige `validate_quiz` ok |

---

## 10. Seed (`supabase/seed.sql`)

- **Áreas:** Geral, Suporte, TI, Comercial, Operacional, Supervisão, Entregadores, Estabelecimentos.
- **Níveis:** 1→0, 2→100, 3→250, 4→500, 5→1000.
- **Configurações de XP:** conforme §4.12.
- **Conquistas:** 5 do PRD.
- **Somente local/staging:** usuários `admin@help.local` e `membro@help.local` (senha de desenvolvimento), trilha “Onboarding Geral — Conheça a Help” com 2 módulos, aulas de todos os tipos e 1 quiz, atribuída à área Geral.

---

## 11. Testes pgTAP obrigatórios

- RLS: para cada tabela, anon (nega tudo), membro A (só o próprio / só acessível), membro B (não vê A), admin (vê tudo).
- Membro não consegue `insert` em `xp_transactions`, `user_achievements`, `lesson_progress`, `quiz_attempts`.
- Membro não consegue `select` em `quiz_options`.
- Membro não altera o próprio `role`/`active`/`department_id`.
- `complete_lesson` chamado 2× → XP e conquistas uma vez.
- `complete_lesson` em aula bloqueada / não atribuída / não publicada → erro.
- `complete_lesson` em aula com quiz não aprovado → `QUIZ_REQUIRED`.
- `submit_quiz` com opção de outra questão → `INVALID_ANSWERS`.
- `submit_quiz` 100% → XP aprovado + bônus + conclusão + `perfect_quiz`; repetir → nada novo.
- Última aula obrigatória → módulo e trilha concluídos, XP de módulo/trilha, `path_completed`.
- Usuário desativado → `can_access_path` falso.
