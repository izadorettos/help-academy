-- Migration 0003: Tabelas de aprendizado
-- Dependências: 0001 (tipos), 0002 (departments, profiles)

-- ---------------------------------------------------------------------------
-- learning_paths
-- ---------------------------------------------------------------------------
create table public.learning_paths (
  id                   uuid              primary key default gen_random_uuid(),
  title                text              not null check (char_length(title) between 3 and 120),
  slug                 text              not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description          text,
  cover_url            text,
  owner_department_id  uuid              references public.departments (id) on delete set null,
  required             boolean           not null default false,
  sequential           boolean           not null default false,
  status               public.path_status not null default 'draft',
  position             integer           not null default 0,
  published_at         timestamptz,
  created_by           uuid              references public.profiles (id) on delete set null,
  created_at           timestamptz       not null default now(),
  updated_at           timestamptz       not null default now()
);

create index learning_paths_status_position_idx on public.learning_paths (status, position);

alter table public.learning_paths enable row level security;

-- ---------------------------------------------------------------------------
-- learning_path_departments (áreas-alvo N:N)
-- ---------------------------------------------------------------------------
create table public.learning_path_departments (
  learning_path_id  uuid        not null references public.learning_paths (id) on delete cascade,
  department_id     uuid        not null references public.departments (id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (learning_path_id, department_id)
);

create index lpd_department_idx on public.learning_path_departments (department_id);

alter table public.learning_path_departments enable row level security;

-- ---------------------------------------------------------------------------
-- modules
-- ---------------------------------------------------------------------------
create table public.modules (
  id                uuid        primary key default gen_random_uuid(),
  learning_path_id  uuid        not null references public.learning_paths (id) on delete cascade,
  title             text        not null check (char_length(title) between 2 and 120),
  description       text,
  position          integer     not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- deferrable permite reordenar módulos em uma única transação
  unique (learning_path_id, position) deferrable initially deferred
);

alter table public.modules enable row level security;

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table public.lessons (
  id                 uuid               primary key default gen_random_uuid(),
  module_id          uuid               not null references public.modules (id) on delete cascade,
  title              text               not null check (char_length(title) between 2 and 160),
  description        text,
  content_type       public.lesson_type not null,
  content            text,              -- Markdown (text)
  external_url       text,              -- video / link / embed
  file_path          text,              -- pdf: caminho no bucket lesson-files
  estimated_minutes  integer            check (estimated_minutes between 0 and 600),
  xp_reward          integer            check (xp_reward between 0 and 1000),  -- null = usa gamification_settings.xp_lesson_default
  required           boolean            not null default true,
  published          boolean            not null default false,
  position           integer            not null,
  created_at         timestamptz        not null default now(),
  updated_at         timestamptz        not null default now(),
  -- deferrable permite reordenar aulas em uma única transação
  unique (module_id, position) deferrable initially deferred,
  -- garante que cada tipo de conteúdo tenha o campo correto preenchido
  constraint lessons_payload_by_type check (
    (content_type = 'text'                    and content is not null)
 or (content_type in ('video', 'link', 'embed') and external_url is not null)
 or (content_type = 'pdf'                     and file_path is not null)
  ),
  -- URLs externas devem usar HTTPS
  constraint lessons_url_https check (external_url is null or external_url ~ '^https://')
);

alter table public.lessons enable row level security;

-- ---------------------------------------------------------------------------
-- quizzes
-- ---------------------------------------------------------------------------
create table public.quizzes (
  id             uuid        primary key default gen_random_uuid(),
  lesson_id      uuid        not null unique references public.lessons (id) on delete cascade,
  title          text        not null,
  passing_score  integer     not null default 70 check (passing_score between 0 and 100),
  xp_reward      integer     check (xp_reward between 0 and 1000),  -- null = xp_quiz_default
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.quizzes enable row level security;

-- ---------------------------------------------------------------------------
-- quiz_questions
-- ---------------------------------------------------------------------------
create table public.quiz_questions (
  id           uuid                 primary key default gen_random_uuid(),
  quiz_id      uuid                 not null references public.quizzes (id) on delete cascade,
  question     text                 not null check (char_length(question) between 3 and 1000),
  type         public.question_type not null,
  explanation  text,
  position     integer              not null,
  -- deferrable permite reordenar questões em uma única transação
  unique (quiz_id, position) deferrable initially deferred
);

alter table public.quiz_questions enable row level security;

-- ---------------------------------------------------------------------------
-- quiz_options
-- ---------------------------------------------------------------------------
create table public.quiz_options (
  id           uuid        primary key default gen_random_uuid(),
  question_id  uuid        not null references public.quiz_questions (id) on delete cascade,
  text         text        not null check (char_length(text) between 1 and 500),
  is_correct   boolean     not null default false,
  position     integer     not null,
  -- deferrable permite reordenar opções em uma única transação
  unique (question_id, position) deferrable initially deferred
);

-- Garante no máximo uma opção correta por pergunta
create unique index quiz_options_one_correct on public.quiz_options (question_id) where is_correct;

alter table public.quiz_options enable row level security;

-- ---------------------------------------------------------------------------
-- Grants básicos (policies ficam na migration 0007)
-- ---------------------------------------------------------------------------
revoke all on public.learning_paths from anon, public;
grant select, insert, update, delete on public.learning_paths to authenticated;

revoke all on public.learning_path_departments from anon, public;
grant select, insert, update, delete on public.learning_path_departments to authenticated;

revoke all on public.modules from anon, public;
grant select, insert, update, delete on public.modules to authenticated;

revoke all on public.lessons from anon, public;
grant select, insert, update, delete on public.lessons to authenticated;

revoke all on public.quizzes from anon, public;
grant select, insert, update, delete on public.quizzes to authenticated;

revoke all on public.quiz_questions from anon, public;
grant select, insert, update, delete on public.quiz_questions to authenticated;

revoke all on public.quiz_options from anon, public;
grant select, insert, update, delete on public.quiz_options to authenticated;
