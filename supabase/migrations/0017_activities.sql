-- Migration 0017: tabelas de atividade, novas colunas, flags is_demo e settings.
-- Dependências: 0016 (novos valores de enum), 0003 (lessons), 0004 (lesson_progress),
--               0005 (gamification_settings), 0002 (departments, profiles).

-- ===========================================================================
-- submission_status enum
-- ===========================================================================
create type public.submission_status as enum (
  'submitted',
  'completed',
  'needs_review',
  'changes_requested'
);

-- ===========================================================================
-- lessons.config — configuração pública da atividade
--   task/challenge/survey/game exigem config <> '{}'.
--   video também aceita config->>'provider' = 'placeholder' (sem external_url).
-- ===========================================================================
alter table public.lessons
  add column if not exists config jsonb not null default '{}';

alter table public.lessons
  drop constraint if exists lessons_payload_by_type;

alter table public.lessons
  add constraint lessons_payload_by_type check (
    (content_type = 'text'
      and content is not null
      and content <> '')
 or (content_type = 'video'
      and (external_url is not null
        or (config->>'provider') = 'placeholder'))
 or (content_type = 'pdf'
      and file_path is not null)
 or (content_type = 'link'
      and external_url is not null
      and external_url <> '')
 or (content_type = 'embed'
      and external_url is not null
      and external_url <> '')
 or (content_type = 'task'
      and config <> '{}'::jsonb)
 or (content_type = 'challenge'
      and config <> '{}'::jsonb)
 or (content_type = 'survey'
      and config <> '{}'::jsonb)
 or (content_type = 'game'
      and config <> '{}'::jsonb)
  );

-- ===========================================================================
-- lesson_answer_keys — gabarito privado do game.
-- Somente admin lê/escreve; RPCs SECURITY DEFINER acessam via search_path.
-- ===========================================================================
create table if not exists public.lesson_answer_keys (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  key       jsonb not null
);

alter table public.lesson_answer_keys enable row level security;

revoke all on public.lesson_answer_keys from anon, public;
grant  select, insert, update, delete on public.lesson_answer_keys to authenticated;

create policy "lesson_answer_keys_admin_all"
  on public.lesson_answer_keys
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- activity_submissions — histórico de envios do aluno para tarefas/desafios/
-- questionários/games. Inserção/atualização somente via RPC (sem grants).
-- ===========================================================================
create table if not exists public.activity_submissions (
  id         uuid                       primary key default gen_random_uuid(),
  user_id    uuid                       not null references public.profiles (id) on delete cascade,
  lesson_id  uuid                       not null references public.lessons  (id) on delete cascade,
  kind       public.lesson_type         not null,
  payload    jsonb                      not null,
  score      integer                    check (score is null or (score >= 0 and score <= 100)),
  status     public.submission_status   not null,
  feedback   jsonb,
  created_at timestamptz                not null default now()
);

create index if not exists activity_submissions_user_lesson_created_idx
  on public.activity_submissions (user_id, lesson_id, created_at desc);

alter table public.activity_submissions enable row level security;

revoke all on public.activity_submissions from anon, public;
-- Só SELECT direto; INSERT/UPDATE/DELETE apenas via SECURITY DEFINER
grant select on public.activity_submissions to authenticated;

create policy "activity_submissions_select_member_or_admin"
  on public.activity_submissions
  for select
  to authenticated
  using (
    (public.is_active_user() and user_id = auth.uid())
    or public.is_admin()
  );

-- ===========================================================================
-- lesson_progress: novas colunas de progresso parcial e posição do vídeo.
-- ===========================================================================
alter table public.lesson_progress
  add column if not exists progress_percent smallint not null default 0
    check (progress_percent >= 0 and progress_percent <= 100);

alter table public.lesson_progress
  add column if not exists position_seconds integer;

-- ===========================================================================
-- Flags is_demo — relatórios do admin filtram por padrão.
-- ===========================================================================
alter table public.learning_paths add column if not exists is_demo boolean not null default false;
alter table public.departments    add column if not exists is_demo boolean not null default false;
alter table public.profiles       add column if not exists is_demo boolean not null default false;

-- ===========================================================================
-- Novos settings de gamificação
-- ===========================================================================
insert into public.gamification_settings (key, value, description)
values ('xp_game_perfect_bonus', 30, 'XP bônus por 100% em um game')
on conflict (key) do nothing;
