-- Migration 0012: Views analíticas
-- Dependências: 0002 (profiles), 0003 (learning_paths, learning_path_departments, modules, lessons),
--               0004 (user_learning_paths, lesson_progress)
--
-- Views com security_invoker = true: a RLS das tabelas subjacentes é avaliada
-- com as permissões do usuário chamador, não do dono da view.

-- ===========================================================================
-- v_user_path_access
-- Retorna todos os pares (user_id, learning_path_id) com acesso ativo,
-- indicando a origem do acesso: 'department' (via área) ou 'individual'.
-- ===========================================================================
create or replace view public.v_user_path_access
with (security_invoker = true) as
select
  p.id          as user_id,
  lp.id         as learning_path_id,
  'department'  as via
from public.profiles p
join public.learning_path_departments lpd on lpd.department_id = p.department_id
join public.learning_paths lp on lp.id = lpd.learning_path_id
where p.active = true
  and lp.status = 'published'

union

select
  ulp.user_id,
  ulp.learning_path_id,
  'individual' as via
from public.user_learning_paths ulp
join public.profiles p on p.id = ulp.user_id
join public.learning_paths lp on lp.id = ulp.learning_path_id
where p.active = true
  and lp.status = 'published'
  and ulp.assigned_individually = true;

-- ===========================================================================
-- v_user_path_progress
-- Progresso consolidado por (usuário, trilha).
-- Colunas:
--   user_id             uuid
--   learning_path_id    uuid
--   required_total      int   — total de aulas required=true AND published=true na trilha
--   required_done       int   — quantas dessas aulas o usuário concluiu
--   percent             int   — 0–100 (floor)
--   status              text  — 'not_started' | 'in_progress' | 'completed'
--   started_at          timestamptz
--   completed_at        timestamptz
--   last_accessed_at    timestamptz — último acesso a qualquer aula do usuário
-- ===========================================================================
create or replace view public.v_user_path_progress
with (security_invoker = true) as
select
  va.user_id,
  va.learning_path_id,
  count(l.id) filter (where l.required = true and l.published = true)::integer      as required_total,
  count(lp.completed_at) filter (where l.required = true and l.published = true)::integer as required_done,
  case
    when count(l.id) filter (where l.required = true and l.published = true) = 0 then 0
    else floor(
      count(lp.completed_at) filter (where l.required = true and l.published = true) * 100.0
      / count(l.id) filter (where l.required = true and l.published = true)
    )::integer
  end                                                                                 as percent,
  case
    when ulp.completed_at is not null then 'completed'
    when ulp.started_at   is not null then 'in_progress'
    else 'not_started'
  end                                                                                 as status,
  ulp.started_at,
  ulp.completed_at,
  max(lp_all.last_accessed_at)                                                       as last_accessed_at
from public.v_user_path_access va
left join public.modules m
  on m.learning_path_id = va.learning_path_id
left join public.lessons l
  on l.module_id = m.id
left join public.lesson_progress lp
  on lp.lesson_id = l.id and lp.user_id = va.user_id
left join public.lesson_progress lp_all
  on lp_all.user_id = va.user_id
left join public.user_learning_paths ulp
  on ulp.user_id = va.user_id and ulp.learning_path_id = va.learning_path_id
group by
  va.user_id,
  va.learning_path_id,
  ulp.completed_at,
  ulp.started_at;

-- ===========================================================================
-- Grants para as views
-- ===========================================================================
grant select on public.v_user_path_access   to authenticated;
grant select on public.v_user_path_progress to authenticated;
