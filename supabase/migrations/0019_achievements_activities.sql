-- Migration 0019: conquistas dos novos formatos + extensão de evaluate_achievements
-- Dependências: 0014 (evaluate_achievements), 0017 (activity_submissions),
--               0018 (xp_reason game_perfect é usado por award_xp).

-- ===========================================================================
-- Novas conquistas
-- ===========================================================================
insert into public.achievements (code, name, description, icon, active, position)
values
  ('first_task',      'Mão na massa',    'Primeira tarefa concluída.',      'check-square',  true, 6),
  ('first_challenge', 'Desafio aceito',  'Primeiro desafio concluído.',     'zap',           true, 7),
  ('game_perfect',    'Rota certa',      '100% em um game.',                'star',          true, 8),
  ('first_survey',    'Voz ativa',       'Primeiro questionário enviado.',  'message-square',true, 9)
on conflict (code) do nothing;


-- ===========================================================================
-- evaluate_achievements — adiciona os novos condition codes
-- ===========================================================================
create or replace function public.evaluate_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_achievement  record;
  v_unlocked     boolean;
begin
  for v_achievement in
    select a.id, a.code
      from public.achievements a
     where a.active = true
       and not exists (
         select 1
           from public.user_achievements ua
          where ua.user_id        = p_user_id
            and ua.achievement_id = a.id
       )
  loop
    v_unlocked := false;

    case v_achievement.code
      when 'first_lesson' then
        select exists(
          select 1 from public.lesson_progress lp
           where lp.user_id = p_user_id and lp.completed_at is not null
        ) into v_unlocked;

      when 'first_module' then
        select exists(
          select 1 from public.module_completions mc where mc.user_id = p_user_id
        ) into v_unlocked;

      when 'perfect_quiz' then
        select exists(
          select 1 from public.quiz_attempts qa
           where qa.user_id = p_user_id and qa.score = 100
        ) into v_unlocked;

      when 'halfway' then
        select exists(
          select 1 from public.v_user_path_progress vpp
           where vpp.user_id = p_user_id and vpp.percent >= 50
        ) into v_unlocked;

      when 'path_completed' then
        select exists(
          select 1 from public.user_learning_paths ulp
           where ulp.user_id = p_user_id and ulp.completed_at is not null
        ) into v_unlocked;

      when 'first_task' then
        select exists(
          select 1 from public.activity_submissions asu
           where asu.user_id = p_user_id
             and asu.kind = 'task'
             and asu.status = 'completed'
        ) into v_unlocked;

      when 'first_challenge' then
        select exists(
          select 1 from public.activity_submissions asu
           where asu.user_id = p_user_id
             and asu.kind = 'challenge'
             and asu.status = 'completed'
        ) into v_unlocked;

      when 'game_perfect' then
        select exists(
          select 1 from public.xp_transactions xt
           where xt.user_id = p_user_id
             and xt.reason = 'game_perfect'
        ) into v_unlocked;

      when 'first_survey' then
        select exists(
          select 1 from public.activity_submissions asu
           where asu.user_id = p_user_id
             and asu.kind = 'survey'
             and asu.status = 'completed'
        ) into v_unlocked;

      else
        v_unlocked := false;
    end case;

    if v_unlocked then
      insert into public.user_achievements (user_id, achievement_id, earned_at)
      values (p_user_id, v_achievement.id, now())
      on conflict (user_id, achievement_id) do nothing;
    end if;
  end loop;
end;
$$;

revoke execute on function public.evaluate_achievements(uuid) from public, anon, authenticated;
