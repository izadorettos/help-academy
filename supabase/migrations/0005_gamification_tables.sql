-- Migration 0005: Tabelas de gamificação
-- Dependências: 0001 (xp_reason enum), 0002 (profiles)

-- ---------------------------------------------------------------------------
-- gamification_settings (chave/valor configurável pelo admin)
-- ---------------------------------------------------------------------------
create table public.gamification_settings (
  key          text        primary key,
  value        integer     not null check (value >= 0),
  description  text        not null,
  updated_at   timestamptz not null default now()
);

-- Valores padrão inseridos no seed:
--   xp_lesson_default     = 10
--   xp_quiz_default       = 20
--   xp_quiz_perfect_bonus = 30
--   xp_module_completed   = 50
--   xp_path_completed     = 100

alter table public.gamification_settings enable row level security;

-- ---------------------------------------------------------------------------
-- levels
-- ---------------------------------------------------------------------------
create table public.levels (
  level   integer primary key check (level >= 1),
  min_xp  integer not null unique check (min_xp >= 0),
  name    text
);

-- O teto de cada nível é o min_xp do próximo; não há coluna max_xp.
-- Nível 1 obrigatoriamente min_xp = 0.
-- Seed: (1,0), (2,100), (3,250), (4,500), (5,1000)

alter table public.levels enable row level security;

-- ---------------------------------------------------------------------------
-- xp_transactions
-- ---------------------------------------------------------------------------
create table public.xp_transactions (
  id              uuid           primary key default gen_random_uuid(),
  user_id         uuid           not null references public.profiles (id) on delete cascade,
  amount          integer        not null check (amount > 0),
  reason          public.xp_reason not null,
  reference_type  text           not null check (reference_type in ('lesson', 'quiz', 'module', 'learning_path')),
  -- reference_id é polimórfico (sem FK) para que o histórico sobreviva à exclusão de conteúdo (RN-10)
  reference_id    uuid           not null,
  created_at      timestamptz    not null default now(),
  -- idempotência: um usuário recebe XP por motivo + referência apenas uma vez
  unique (user_id, reason, reference_id)
);

create index xp_transactions_user_idx on public.xp_transactions (user_id, created_at desc);

alter table public.xp_transactions enable row level security;

-- ---------------------------------------------------------------------------
-- achievements
-- ---------------------------------------------------------------------------
create table public.achievements (
  id           uuid    primary key default gen_random_uuid(),
  code         text    not null unique,
  name         text    not null,
  description  text    not null,
  icon         text    not null,  -- nome do ícone lucide
  active       boolean not null default true,
  position     integer not null default 0
);

alter table public.achievements enable row level security;

-- ---------------------------------------------------------------------------
-- user_achievements
-- ---------------------------------------------------------------------------
create table public.user_achievements (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  achievement_id  uuid        not null references public.achievements (id) on delete cascade,
  earned_at       timestamptz not null default now(),
  unique (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

-- ---------------------------------------------------------------------------
-- Grants básicos (policies ficam na migration 0007)
-- ---------------------------------------------------------------------------
revoke all on public.gamification_settings from anon, public;
grant select, insert, update, delete on public.gamification_settings to authenticated;

revoke all on public.levels from anon, public;
grant select, insert, update, delete on public.levels to authenticated;

revoke all on public.xp_transactions from anon, public;
grant select, insert, update, delete on public.xp_transactions to authenticated;

revoke all on public.achievements from anon, public;
grant select, insert, update, delete on public.achievements to authenticated;

revoke all on public.user_achievements from anon, public;
grant select, insert, update, delete on public.user_achievements to authenticated;
