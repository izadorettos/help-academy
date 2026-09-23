-- Migration 0004: Tabelas de progresso do usuário
-- Dependências: 0002 (profiles), 0003 (learning_paths, modules, lessons, quizzes, quiz_questions, quiz_options)

-- ---------------------------------------------------------------------------
-- user_learning_paths
-- ---------------------------------------------------------------------------
create table public.user_learning_paths (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        not null references public.profiles (id) on delete cascade,
  learning_path_id       uuid        not null references public.learning_paths (id) on delete cascade,
  assigned_individually  boolean     not null default false,
  assigned_by            uuid        references public.profiles (id) on delete set null,
  assigned_at            timestamptz,
  started_at             timestamptz,
  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  unique (user_id, learning_path_id)
);

create index ulp_path_idx on public.user_learning_paths (learning_path_id);

alter table public.user_learning_paths enable row level security;

-- ---------------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------------
create table public.lesson_progress (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles (id) on delete cascade,
  lesson_id         uuid        not null references public.lessons (id) on delete cascade,
  started_at        timestamptz not null default now(),
  last_accessed_at  timestamptz not null default now(),
  completed_at      timestamptz,
  unique (user_id, lesson_id)
);

create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

-- Índice parcial para "continue de onde parou": aulas em progresso, ordenadas por último acesso
create index lesson_progress_resume_idx on public.lesson_progress (user_id, last_accessed_at desc)
  where completed_at is null;

alter table public.lesson_progress enable row level security;

-- ---------------------------------------------------------------------------
-- module_completions
-- ---------------------------------------------------------------------------
create table public.module_completions (
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  module_id     uuid        not null references public.modules (id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, module_id)
);

alter table public.module_completions enable row level security;

-- ---------------------------------------------------------------------------
-- quiz_attempts
-- ---------------------------------------------------------------------------
create table public.quiz_attempts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles (id) on delete cascade,
  quiz_id          uuid        not null references public.quizzes (id) on delete cascade,
  correct_count    integer     not null check (correct_count >= 0),
  total_questions  integer     not null check (total_questions > 0),
  score            integer     not null check (score between 0 and 100),
  passed           boolean     not null,
  started_at       timestamptz,
  completed_at     timestamptz not null default now(),
  check (correct_count <= total_questions)
);

create index quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_id, completed_at desc);

alter table public.quiz_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- quiz_attempt_answers
-- ---------------------------------------------------------------------------
create table public.quiz_attempt_answers (
  attempt_id   uuid    not null references public.quiz_attempts (id) on delete cascade,
  question_id  uuid    not null references public.quiz_questions (id) on delete cascade,
  option_id    uuid    references public.quiz_options (id) on delete set null,
  is_correct   boolean not null,
  primary key (attempt_id, question_id)
);

alter table public.quiz_attempt_answers enable row level security;

-- ---------------------------------------------------------------------------
-- Grants básicos (policies ficam na migration 0007)
-- ---------------------------------------------------------------------------
revoke all on public.user_learning_paths from anon, public;
grant select, insert, update, delete on public.user_learning_paths to authenticated;

revoke all on public.lesson_progress from anon, public;
grant select, insert, update, delete on public.lesson_progress to authenticated;

revoke all on public.module_completions from anon, public;
grant select, insert, update, delete on public.module_completions to authenticated;

revoke all on public.quiz_attempts from anon, public;
grant select, insert, update, delete on public.quiz_attempts to authenticated;

revoke all on public.quiz_attempt_answers from anon, public;
grant select, insert, update, delete on public.quiz_attempt_answers to authenticated;
