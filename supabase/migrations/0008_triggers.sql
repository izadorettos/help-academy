-- Migration 0008: Triggers e funções de trigger
-- Dependências: 0002 (departments, profiles), 0003 (learning_paths, modules, lessons, quizzes, quiz_questions, quiz_options), 0005 (gamification_settings)
--
-- ATENÇÃO: Este arquivo referencia funções criadas em outras migrations:
--   - is_admin()       → criada na migration 0006 (Fase 4 — funções auxiliares e RLS)
--   - validate_quiz()  → criada na migration 0010 (Fase 11 — editor de quiz)
-- Os triggers que dependem dessas funções funcionarão corretamente após as respectivas
-- migrations serem aplicadas. O Postgres resolve a referência em tempo de execução (não compilação).

-- ===========================================================================
-- Função e trigger: set_updated_at
-- Atualiza automaticamente a coluna updated_at antes de cada UPDATE
-- ===========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Aplicar o trigger em todas as tabelas com coluna updated_at

create trigger set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.learning_paths
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.modules
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.quizzes
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.quiz_questions
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.quiz_options
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.gamification_settings
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Função e trigger: handle_new_user
-- Cria automaticamente um profile quando um novo usuário é registrado no Auth
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, role, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'member',
    true
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Stub: is_admin() — implementação completa na migration 0006 (Fase 4).
-- Este stub é necessário para que os triggers desta migration compilem
-- antes da 0006 existir. A 0006 usa CREATE OR REPLACE para substituí-lo.
-- ===========================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  );
$$;

-- ===========================================================================
-- Função e trigger: protect_profile_columns
-- Impede que membros (não-admins) alterem colunas administrativas do próprio perfil.
-- auth.uid() IS NULL = operação interna (seed, migrations, service_role) → permitida.
-- ===========================================================================
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Operações sem sessão de usuário autenticado (seed, migrations, server) são permitidas.
  if auth.uid() is null then
    return new;
  end if;

  -- Somente admin pode alterar estas colunas:
  if not public.is_admin() then
    if (new.role          is distinct from old.role
     or new.active        is distinct from old.active
     or new.department_id is distinct from old.department_id
     or new.email         is distinct from old.email
     or new.job_title     is distinct from old.job_title
     or new.hire_date     is distinct from old.hire_date)
    then
      raise exception 'FORBIDDEN: cannot change protected profile columns';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ===========================================================================
-- Função e trigger: set_published_at
-- Registra o timestamp da primeira publicação de uma trilha
-- ===========================================================================
create or replace function public.set_published_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and old.status <> 'published' then
    new.published_at := coalesce(old.published_at, now());
  end if;
  return new;
end;
$$;

create trigger set_published_at
  before update on public.learning_paths
  for each row execute function public.set_published_at();

-- ===========================================================================
-- Função e trigger: validate_lesson_publish
-- Ao publicar uma aula com quiz, valida que o quiz está em conformidade
-- Nota: validate_quiz() é criada na migration 0010 (Fase 11 — editor de quiz)
-- ===========================================================================
create or replace function public.validate_lesson_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz_id uuid;
begin
  if new.published = true and old.published = false then
    select id into v_quiz_id
    from public.quizzes
    where lesson_id = new.id;

    if v_quiz_id is not null then
      perform public.validate_quiz(v_quiz_id);
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_publish
  before update of published on public.lessons
  for each row execute function public.validate_lesson_publish();
