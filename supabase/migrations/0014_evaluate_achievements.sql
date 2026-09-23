-- Migration 0014: evaluate_achievements + integração nas funções de conclusão
-- Fase 13 — cria evaluate_achievements e recria _complete_lesson_internal e submit_quiz
-- para conceder conquistas automaticamente após eventos de aprendizado.
--
-- evaluate_achievements é idempotente:
--   ON CONFLICT DO NOTHING → nunca insere a mesma conquista duas vezes.
--
-- Segurança: SECURITY DEFINER set search_path = ''. Sem grant público.

-- ===========================================================================
-- evaluate_achievements(p_user_id uuid) returns void
-- Avalia conquistas não obtidas pelo usuário e insere as que foram desbloqueadas.
-- Idempotente: chamada múltiplas vezes não duplica conquistas.
-- Retorna void (conquistas disponíveis são buscadas separadamente via RPC pública).
-- ===========================================================================
create or replace function public.evaluate_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_achievement     record;
  v_unlocked        boolean;
begin
  -- Itera sobre todas as conquistas ativas ainda não obtidas pelo usuário
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

      -- Primeira aula concluída
      when 'first_lesson' then
        select exists(
          select 1
            from public.lesson_progress lp
           where lp.user_id      = p_user_id
             and lp.completed_at is not null
        ) into v_unlocked;

      -- Primeiro módulo concluído
      when 'first_module' then
        select exists(
          select 1
            from public.module_completions mc
           where mc.user_id = p_user_id
        ) into v_unlocked;

      -- Quiz com nota 100%
      when 'perfect_quiz' then
        select exists(
          select 1
            from public.quiz_attempts qa
           where qa.user_id = p_user_id
             and qa.score   = 100
        ) into v_unlocked;

      -- Trilha com progresso >= 50%
      when 'halfway' then
        select exists(
          select 1
            from public.v_user_path_progress vpp
           where vpp.user_id = p_user_id
             and vpp.percent >= 50
        ) into v_unlocked;

      -- Trilha completa (completed_at not null)
      when 'path_completed' then
        select exists(
          select 1
            from public.user_learning_paths ulp
           where ulp.user_id      = p_user_id
             and ulp.completed_at is not null
        ) into v_unlocked;

      else
        -- Código desconhecido: pula silenciosamente
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

-- Sem grant público — interna, chamada por outras funções SECURITY DEFINER
revoke execute on function public.evaluate_achievements(uuid)
  from public, anon, authenticated;


-- ===========================================================================
-- _complete_lesson_internal — recriado para chamar evaluate_achievements
-- Inclui achievements_unlocked no retorno.
-- ===========================================================================
drop function if exists public._complete_lesson_internal(uuid, uuid);

create or replace function public._complete_lesson_internal(
  p_user_id  uuid,
  p_lesson_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module_id              uuid;
  v_path_id                uuid;
  v_lesson_xp_reward       integer;
  v_prev_completed_at      timestamptz;
  v_required_total         integer;
  v_required_done          integer;
  v_path_done              boolean;
  v_module_inserted        boolean := false;
  v_path_updated           boolean := false;
  v_xp_lesson              integer := 0;
  v_xp_module              integer := 0;
  v_xp_path                integer := 0;
  v_xp_total               integer := 0;
  v_achievements_before    uuid[];
  v_new_achievements       jsonb   := '[]'::jsonb;
  v_ach                    record;
begin
  -- Garante que existe linha em lesson_progress
  insert into public.lesson_progress (user_id, lesson_id, started_at, last_accessed_at)
  values (p_user_id, p_lesson_id, now(), now())
  on conflict (user_id, lesson_id) do nothing;

  -- Trava a linha para evitar dupla conclusão concorrente
  select completed_at, l.xp_reward
    into v_prev_completed_at, v_lesson_xp_reward
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
   where lp.user_id   = p_user_id
     and lp.lesson_id = p_lesson_id
  for update of lp;

  -- Se já estava concluída, retorna estado atual sem efeitos colaterais
  if v_prev_completed_at is not null then
    return jsonb_build_object(
      'already_completed', true,
      'xp_awarded', 0,
      'achievements_unlocked', '[]'::jsonb
    );
  end if;

  -- Captura conquistas já obtidas antes da conclusão
  select array_agg(ua.achievement_id)
    into v_achievements_before
    from public.user_achievements ua
   where ua.user_id = p_user_id;

  v_achievements_before := coalesce(v_achievements_before, '{}');

  -- Marca a aula como concluída
  update public.lesson_progress
     set completed_at    = now(),
         last_accessed_at = now()
   where user_id   = p_user_id
     and lesson_id = p_lesson_id;

  -- Obtém módulo e trilha da aula
  select m.id, m.learning_path_id
    into v_module_id, v_path_id
    from public.lessons l
    join public.modules m on m.id = l.module_id
   where l.id = p_lesson_id;

  -- -------------------------------------------------------------------------
  -- XP pela aula
  -- -------------------------------------------------------------------------
  v_xp_lesson := public.award_xp(
    p_user_id,
    'lesson_completed',
    'lesson',
    p_lesson_id,
    coalesce(v_lesson_xp_reward, public.get_setting('xp_lesson_default'))
  );

  -- -------------------------------------------------------------------------
  -- Verifica conclusão do módulo
  -- -------------------------------------------------------------------------
  select
    count(*) filter (where l.required and l.published),
    count(*) filter (
      where l.required and l.published
        and exists (
          select 1 from public.lesson_progress lp2
           where lp2.lesson_id  = l.id
             and lp2.user_id    = p_user_id
             and lp2.completed_at is not null
        )
    )
  into v_required_total, v_required_done
  from public.lessons l
  where l.module_id = v_module_id;

  if v_required_total > 0 and v_required_done = v_required_total then
    insert into public.module_completions (user_id, module_id, completed_at)
    values (p_user_id, v_module_id, now())
    on conflict (user_id, module_id) do nothing;

    get diagnostics v_module_inserted = row_count;
    if v_module_inserted then
      v_xp_module := public.award_xp(
        p_user_id,
        'module_completed',
        'module',
        v_module_id,
        public.get_setting('xp_module_completed')
      );
    end if;
  end if;

  -- -------------------------------------------------------------------------
  -- Verifica conclusão da trilha
  -- -------------------------------------------------------------------------
  select
    count(*) filter (where l.required and l.published),
    count(*) filter (
      where l.required and l.published
        and exists (
          select 1 from public.lesson_progress lp2
           where lp2.lesson_id   = l.id
             and lp2.user_id     = p_user_id
             and lp2.completed_at is not null
        )
    )
  into v_required_total, v_required_done
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.learning_path_id = v_path_id;

  v_path_done := (v_required_total > 0 and v_required_done = v_required_total);

  if v_path_done then
    update public.user_learning_paths
       set completed_at = now()
     where user_id          = p_user_id
       and learning_path_id = v_path_id
       and completed_at     is null;

    get diagnostics v_path_updated = row_count;
    if v_path_updated then
      v_xp_path := public.award_xp(
        p_user_id,
        'path_completed',
        'learning_path',
        v_path_id,
        public.get_setting('xp_path_completed')
      );
    end if;
  end if;

  -- -------------------------------------------------------------------------
  -- Avalia conquistas
  -- -------------------------------------------------------------------------
  perform public.evaluate_achievements(p_user_id);

  -- Coleta conquistas recém-desbloqueadas (não estavam antes)
  for v_ach in
    select a.id, a.code, a.name, a.icon
      from public.user_achievements ua
      join public.achievements a on a.id = ua.achievement_id
     where ua.user_id          = p_user_id
       and ua.achievement_id   <> all(v_achievements_before)
  loop
    v_new_achievements := v_new_achievements || jsonb_build_object(
      'id',   v_ach.id,
      'code', v_ach.code,
      'name', v_ach.name,
      'icon', v_ach.icon
    );
  end loop;

  v_xp_total := v_xp_lesson + v_xp_module + v_xp_path;

  return jsonb_build_object(
    'already_completed',      false,
    'xp_awarded',             v_xp_total,
    'xp_lesson',              v_xp_lesson,
    'xp_module',              v_xp_module,
    'xp_path',                v_xp_path,
    'module_completed',       v_module_inserted,
    'path_completed',         v_path_updated,
    'achievements_unlocked',  v_new_achievements
  );
end;
$$;

-- Sem grant público — interna
revoke execute on function public._complete_lesson_internal(uuid, uuid)
  from public, anon, authenticated;


-- ===========================================================================
-- complete_lesson — recriado para expor achievements_unlocked no retorno
-- ===========================================================================
create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id     uuid;
  v_has_quiz    boolean;
  v_quiz_passed boolean;
  v_result      jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NO_ACCESS' using hint = 'Usuário não autenticado';
  end if;

  if not public.can_access_lesson(p_lesson_id, v_user_id) then
    raise exception 'NO_ACCESS' using hint = 'Sem acesso a esta aula';
  end if;

  if not public.is_lesson_unlocked(p_lesson_id, v_user_id) then
    raise exception 'LESSON_LOCKED' using hint = 'Aula bloqueada: complete as aulas anteriores';
  end if;

  select
    exists(select 1 from public.quizzes q where q.lesson_id = p_lesson_id),
    exists(
      select 1
        from public.quizzes q
        join public.quiz_attempts qa on qa.quiz_id = q.id
       where q.lesson_id = p_lesson_id
         and qa.user_id  = v_user_id
         and qa.passed   = true
    )
  into v_has_quiz, v_quiz_passed;

  if v_has_quiz and not v_quiz_passed then
    raise exception 'QUIZ_REQUIRED' using hint = 'Você precisa passar no quiz para concluir esta aula';
  end if;

  v_result := public._complete_lesson_internal(v_user_id, p_lesson_id);

  return v_result || jsonb_build_object('ok', true);
end;
$$;

-- Apenas usuários autenticados podem chamar complete_lesson
revoke execute on function public.complete_lesson(uuid) from public, anon;
grant  execute on function public.complete_lesson(uuid) to authenticated;


-- ===========================================================================
-- submit_quiz — recriado para incluir achievements_unlocked no retorno
-- ===========================================================================
create or replace function public.submit_quiz(
  p_quiz_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id                uuid;
  v_lesson_id              uuid;
  v_passing_score          integer;
  v_quiz_xp_reward         integer;
  v_total_questions        integer;
  v_correct_count          integer := 0;
  v_score                  integer;
  v_passed                 boolean;
  v_attempt_id             uuid;
  v_answer                 jsonb;
  v_question_id            uuid;
  v_option_id              uuid;
  v_is_correct             boolean;
  v_option_ok              boolean;
  v_question_ids           uuid[];
  v_seen_questions         uuid[] := '{}';
  v_xp_quiz                integer := 0;
  v_xp_perfect             integer := 0;
  v_xp_lesson_flow         integer := 0;
  v_lesson_result          jsonb;
  v_achievements_before    uuid[];
  v_new_achievements       jsonb   := '[]'::jsonb;
  v_ach                    record;
begin
  -- -------------------------------------------------------------------------
  -- 1. Autenticação
  -- -------------------------------------------------------------------------
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'NO_ACCESS' using hint = 'Usuário não autenticado';
  end if;

  -- -------------------------------------------------------------------------
  -- 2. Quiz existe e pertence a uma aula acessível pelo usuário
  -- -------------------------------------------------------------------------
  select q.lesson_id, q.passing_score, q.xp_reward
    into v_lesson_id, v_passing_score, v_quiz_xp_reward
    from public.quizzes q
   where q.id = p_quiz_id;

  if v_lesson_id is null then
    raise exception 'NO_ACCESS' using hint = 'Quiz não encontrado';
  end if;

  if not public.can_access_lesson(v_lesson_id, v_user_id) then
    raise exception 'NO_ACCESS' using hint = 'Sem acesso ao quiz';
  end if;

  -- -------------------------------------------------------------------------
  -- 3. Valida o conjunto de respostas
  -- -------------------------------------------------------------------------
  select count(*)::integer
    into v_total_questions
    from public.quiz_questions qq
   where qq.quiz_id = p_quiz_id;

  if v_total_questions = 0 then
    raise exception 'INVALID_ANSWERS' using hint = 'Quiz sem questões';
  end if;

  if jsonb_array_length(p_answers) <> v_total_questions then
    raise exception 'INVALID_ANSWERS'
      using hint = 'Número de respostas não corresponde ao número de questões';
  end if;

  select array_agg(qq.id)
    into v_question_ids
    from public.quiz_questions qq
   where qq.quiz_id = p_quiz_id;

  for v_answer in select jsonb_array_elements(p_answers)
  loop
    v_question_id := (v_answer->>'question_id')::uuid;
    v_option_id   := (v_answer->>'option_id')::uuid;

    if not (v_question_id = any(v_question_ids)) then
      raise exception 'INVALID_ANSWERS'
        using hint = 'Questão não pertence a este quiz';
    end if;

    if v_question_id = any(v_seen_questions) then
      raise exception 'INVALID_ANSWERS'
        using hint = 'Questão respondida mais de uma vez';
    end if;
    v_seen_questions := v_seen_questions || v_question_id;

    select true
      into v_option_ok
      from public.quiz_options qo
     where qo.id = v_option_id
       and qo.question_id = v_question_id;

    if v_option_ok is null then
      raise exception 'INVALID_ANSWERS'
        using hint = 'Opção não pertence à questão';
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- 4. Calcula resultado
  -- -------------------------------------------------------------------------
  for v_answer in select jsonb_array_elements(p_answers)
  loop
    v_option_id := (v_answer->>'option_id')::uuid;

    select qo.is_correct
      into v_is_correct
      from public.quiz_options qo
     where qo.id = v_option_id;

    if v_is_correct then
      v_correct_count := v_correct_count + 1;
    end if;
  end loop;

  v_score  := floor(v_correct_count::numeric * 100 / v_total_questions)::integer;
  v_passed := v_score >= v_passing_score;

  -- -------------------------------------------------------------------------
  -- 5. Insere quiz_attempts
  -- -------------------------------------------------------------------------
  insert into public.quiz_attempts (
    user_id, quiz_id,
    correct_count, total_questions, score, passed,
    completed_at
  ) values (
    v_user_id, p_quiz_id,
    v_correct_count, v_total_questions, v_score, v_passed,
    now()
  )
  returning id into v_attempt_id;

  -- Insere quiz_attempt_answers
  for v_answer in select jsonb_array_elements(p_answers)
  loop
    v_question_id := (v_answer->>'question_id')::uuid;
    v_option_id   := (v_answer->>'option_id')::uuid;

    select qo.is_correct
      into v_is_correct
      from public.quiz_options qo
     where qo.id = v_option_id;

    insert into public.quiz_attempt_answers (
      attempt_id, question_id, option_id, is_correct
    ) values (
      v_attempt_id, v_question_id, v_option_id, v_is_correct
    );
  end loop;

  -- -------------------------------------------------------------------------
  -- 6. Captura conquistas antes do XP / conclusão
  -- -------------------------------------------------------------------------
  select array_agg(ua.achievement_id)
    into v_achievements_before
    from public.user_achievements ua
   where ua.user_id = v_user_id;

  v_achievements_before := coalesce(v_achievements_before, '{}');

  -- -------------------------------------------------------------------------
  -- 7. Se passou: XP de quiz + conclusão da aula (que já chama evaluate_achievements)
  -- -------------------------------------------------------------------------
  if v_passed then
    -- XP pelo quiz aprovado (idempotente)
    v_xp_quiz := public.award_xp(
      v_user_id,
      'quiz_passed',
      'quiz',
      p_quiz_id,
      coalesce(v_quiz_xp_reward, public.get_setting('xp_quiz_default'))
    );

    -- XP bônus por nota perfeita (idempotente)
    if v_score = 100 then
      v_xp_perfect := public.award_xp(
        v_user_id,
        'quiz_perfect',
        'quiz',
        p_quiz_id,
        public.get_setting('xp_quiz_perfect_bonus')
      );
    end if;

    -- Conclui a aula (inclui XP de aula/módulo/trilha + evaluate_achievements)
    v_lesson_result   := public._complete_lesson_internal(v_user_id, v_lesson_id);
    v_xp_lesson_flow  := coalesce((v_lesson_result->>'xp_awarded')::integer, 0);
  else
    -- Não passou: avalia conquistas mesmo assim (ex: halfway já atingido antes)
    perform public.evaluate_achievements(v_user_id);
  end if;

  -- -------------------------------------------------------------------------
  -- 8. Coleta conquistas recém-desbloqueadas
  -- -------------------------------------------------------------------------
  for v_ach in
    select a.id, a.code, a.name, a.icon
      from public.user_achievements ua
      join public.achievements a on a.id = ua.achievement_id
     where ua.user_id          = v_user_id
       and ua.achievement_id   <> all(v_achievements_before)
  loop
    v_new_achievements := v_new_achievements || jsonb_build_object(
      'id',   v_ach.id,
      'code', v_ach.code,
      'name', v_ach.name,
      'icon', v_ach.icon
    );
  end loop;

  -- -------------------------------------------------------------------------
  -- 9. Retorna resultado
  -- -------------------------------------------------------------------------
  return jsonb_build_object(
    'score',                 v_score,
    'passed',                v_passed,
    'correct_count',         v_correct_count,
    'total_questions',       v_total_questions,
    'passing_score',         v_passing_score,
    'xp_awarded',            v_xp_quiz + v_xp_perfect + v_xp_lesson_flow,
    'achievements_unlocked', v_new_achievements
  );
end;
$$;

-- Apenas usuários autenticados podem chamar submit_quiz
revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
grant  execute on function public.submit_quiz(uuid, jsonb) to authenticated;
