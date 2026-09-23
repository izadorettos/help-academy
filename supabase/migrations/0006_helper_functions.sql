-- Migration 0006: Funções auxiliares
-- Dependências: 0002 (profiles), 0003 (learning_paths, learning_path_departments, modules, lessons),
--               0004 (user_learning_paths, lesson_progress), 0005 (gamification_settings, levels, xp_transactions)
--               0008 (stub is_admin — substituído aqui com CREATE OR REPLACE)
--
-- Todas as funções são language sql stable security definer set search_path = ''.
-- A função is_admin() usa CREATE OR REPLACE para substituir o stub criado em 0008.

-- ===========================================================================
-- is_admin()
-- Verifica se auth.uid() tem role='admin' e active=true em profiles.
-- SECURITY DEFINER necessário para evitar recursão de RLS ao ler profiles.
-- ===========================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  );
$$;

-- ===========================================================================
-- is_active_user()
-- Verifica se auth.uid() tem um profile com active=true.
-- ===========================================================================
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
  );
$$;

-- ===========================================================================
-- can_access_path(p_path uuid, p_user uuid)
-- Retorna true quando:
--   - usuário está ativo
--   - trilha está published
--   - acesso via área do usuário em learning_path_departments
--     OU atribuição individual (user_learning_paths.assigned_individually = true)
-- ===========================================================================
create or replace function public.can_access_path(
  p_path uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles pr
    join public.learning_paths lp on lp.id = p_path
    where pr.id = p_user
      and pr.active = true
      and lp.status = 'published'
      and (
        exists (
          select 1
          from public.learning_path_departments lpd
          where lpd.learning_path_id = p_path
            and lpd.department_id = pr.department_id
        )
        or exists (
          select 1
          from public.user_learning_paths ulp
          where ulp.user_id = p_user
            and ulp.learning_path_id = p_path
            and ulp.assigned_individually = true
        )
      )
  );
$$;

-- ===========================================================================
-- can_access_lesson(p_lesson uuid, p_user uuid)
-- Retorna true quando a lição está published E o usuário pode acessar
-- a trilha a que o módulo da lição pertence.
-- ===========================================================================
create or replace function public.can_access_lesson(
  p_lesson uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    where l.id = p_lesson
      and l.published = true
      and public.can_access_path(m.learning_path_id, p_user)
  );
$$;

-- ===========================================================================
-- is_lesson_unlocked(p_lesson uuid, p_user uuid)
-- Regras de desbloqueio para trilhas sequenciais:
--   1. Se a trilha NÃO é sequential → true
--   2. Senão: todas as aulas required=true AND published=true ANTERIORES
--      (por modules.position e lessons.position) devem estar em lesson_progress
--      com completed_at IS NOT NULL.
--   "Anterior" = módulo.position < módulo desta lição
--              OU (módulo.position = módulo desta lição
--                  E lição.position < esta lição.position)
-- ===========================================================================
create or replace function public.is_lesson_unlocked(
  p_lesson uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      -- Trilha não sequencial: sempre desbloqueado
      when not lp_path.sequential then true

      -- Trilha sequencial: todas as aulas obrigatórias anteriores concluídas?
      else not exists (
        select 1
        from public.lessons l_prev
        join public.modules m_prev on m_prev.id = l_prev.module_id
        where m_prev.learning_path_id = m_target.learning_path_id
          and l_prev.required = true
          and l_prev.published = true
          and (
            m_prev.position < m_target.position
            or (
              m_prev.position = m_target.position
              and l_prev.position < l_target.position
            )
          )
          and not exists (
            select 1
            from public.lesson_progress lpr
            where lpr.lesson_id = l_prev.id
              and lpr.user_id = p_user
              and lpr.completed_at is not null
          )
      )
    end
  from public.lessons l_target
  join public.modules m_target on m_target.id = l_target.module_id
  join public.learning_paths lp_path on lp_path.id = m_target.learning_path_id
  where l_target.id = p_lesson;
$$;

-- ===========================================================================
-- user_total_xp(p_user uuid)
-- Retorna a soma de xp_transactions.amount para o usuário.
-- Retorna null se o chamador não for o próprio usuário nem admin.
-- ===========================================================================
create or replace function public.user_total_xp(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user = auth.uid() or public.is_admin()
    then coalesce(
      (select sum(amount)::integer from public.xp_transactions where user_id = p_user),
      0
    )
    else null
  end;
$$;

-- ===========================================================================
-- level_for_xp(p_xp int)
-- Retorna o nível correspondente ao total de XP fornecido.
-- Colunas: level int, min_xp int, next_min_xp int (null para o nível máximo).
-- ===========================================================================
create or replace function public.level_for_xp(p_xp integer)
returns table(level integer, min_xp integer, next_min_xp integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    lv.level,
    lv.min_xp,
    lead(lv.min_xp) over (order by lv.min_xp) as next_min_xp
  from public.levels lv
  where lv.min_xp <= p_xp
  order by lv.min_xp desc
  limit 1;
$$;

-- ===========================================================================
-- get_setting(p_key text)
-- Retorna o valor inteiro de gamification_settings para a chave informada.
-- Lança exceção 'INVALID_SETTING: <key>' se a chave não existir.
-- ===========================================================================
create or replace function public.get_setting(p_key text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_value integer;
begin
  select value into v_value
  from public.gamification_settings
  where key = p_key;

  if not found then
    raise exception 'INVALID_SETTING: %', p_key;
  end if;

  return v_value;
end;
$$;
