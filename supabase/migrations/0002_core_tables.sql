-- Migration 0002: Tabelas principais — departments e profiles
-- Dependências: 0001 (tipos)

-- ---------------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------------
create table public.departments (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 2 and 60),
  slug        text        not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Índice case-insensitive para unicidade do nome
create unique index departments_name_ci_key on public.departments (lower(name));

alter table public.departments enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid               primary key references auth.users (id) on delete cascade,
  name           text               not null check (char_length(name) between 2 and 120),
  email          extensions.citext  not null unique,
  avatar_url     text,
  role           public.user_role   not null default 'member',
  job_title      text,
  department_id  uuid               references public.departments (id) on delete restrict,
  hire_date      date,
  active         boolean            not null default true,
  last_seen_at   timestamptz,
  created_at     timestamptz        not null default now(),
  updated_at     timestamptz        not null default now()
);

create index profiles_department_idx on public.profiles (department_id);
create index profiles_active_idx     on public.profiles (active);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Grants básicos (policies ficam na migration 0007)
-- ---------------------------------------------------------------------------
revoke all on public.departments from anon, public;
grant select, insert, update, delete on public.departments to authenticated;

revoke all on public.profiles from anon, public;
grant select, insert, update, delete on public.profiles to authenticated;
