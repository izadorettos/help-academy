-- Migration 0018: RPCs de atividade
--
-- Cria:
--   save_lesson_progress  — vídeo (registra progresso parcial)
--   submit_activity       — despacha task/challenge/survey/game
--   check_quiz_answer     — feedback por pergunta (sem gravar)
--
-- Recria complete_lesson: bloqueia tipos novos + exige 80% de vídeo assistido.
--
-- Todas SECURITY DEFINER com set search_path = ''.

-- ===========================================================================
-- save_lesson_progress(p_lesson_id uuid, p_percent smallint, p_position int)
-- Regras:
--   - Acesso + desbloqueio (mesmo padrão de start_lesson)
--   - progress_percent nunca diminui
--   - Upsert em lesson_progress + last_accessed_at
-- ===========================================================================
create or replace function public.save_lesson_progress(
  p_lesson_id uuid,
  p_percent   smallint,
  p_position  integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_percent smallint;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NO_ACCESS' using hint = 'Usuário não autenticado';
  end if;

  if not public.can_access_lesson(p_lesson_id, v_user_id) then
    raise exception 'NO_ACCESS' using hint = 'Sem acesso a esta aula';
  end if;

  if not public.is_lesson_unlocked(p_lesson_id, v_user_id) then
    raise exception 'LESSON_LOCKED' using hint = 'Aula bloqueada';
  end if;

  v_percent := greatest(0::smallint, least(100::smallint, coalesce(p_percent, 0::smallint)));

  insert into public.lesson_progress (
    user_id, lesson_id, started_at, last_accessed_at,
    progress_percent, position_seconds
  )
  values (
    v_user_id, p_lesson_id, now(), now(),
    v_percent, p_position
  )
  on conflict (user_id, lesson_id) do update
    set last_accessed_at = now(),
        progress_percent = greatest(public.lesson_progress.progress_percent, excluded.progress_percent),
        position_seconds = coalesce(excluded.position_seconds, public.lesson_progress.position_seconds);
end;
$$;

revoke execute on function public.save_lesson_progress(uuid, smallint, integer) from public, anon;
grant  execute on function public.save_lesson_progress(uuid, smallint, integer) to authenticated;


-- ===========================================================================
-- check_quiz_answer(p_lesson_id, p_question_id, p_option_id)
-- Retorna { correct, explanation } para UMA questão. Não grava nada.
-- SECURITY DEFINER porque membros não têm SELECT em quiz_options.
-- ===========================================================================
create or replace function public.check_quiz_answer(
  p_lesson_id   uuid,
  p_question_id uuid,
  p_option_id   uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id     uuid;
  v_quiz_id     uuid;
  v_correct     boolean;
  v_explanation text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'NO_ACCESS' using hint = 'Usuário não autenticado';
  end if;

  if not public.can_access_lesson(p_lesson_id, v_user_id) then
    raise exception 'NO_ACCESS' using hint = 'Sem acesso a esta aula';
  end if;

  select q.id
    into v_quiz_id
    from public.quizzes q
   where q.lesson_id = p_lesson_id;

  if v_quiz_id is null then
    raise exception 'NO_ACCESS' using hint = 'Quiz não encontrado';
  end if;

  select qo.is_correct, qq.explanation
    into v_correct, v_explanation
    from public.quiz_options qo
    join public.quiz_questions qq on qq.id = qo.question_id
   where qo.id = p_option_id
     and qo.question_id = p_question_id
     and qq.quiz_id = v_quiz_id;

  if v_correct is null then
    raise exception 'INVALID_ANSWERS' using hint = 'Opção inválida para esta pergunta';
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'explanation', coalesce(v_explanation, '')
  );
end;
$$;

revoke execute on function public.check_quiz_answer(uuid, uuid, uuid) from public, anon;
grant  execute on function public.check_quiz_answer(uuid, uuid, uuid) to authenticated;


-- ===========================================================================
-- Helpers internos para normalizar strings do desafio
-- (para conferência case/accent insensitive no servidor)
-- ===========================================================================
create or replace function public._unaccent_lower(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(translate(
    coalesce(p_text, ''),
    'ÁÀÂÃÄÅÆáàâãäåæÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖØóòôõöøÚÙÛÜúùûüÇçÑñ',
    'AAAAAAAaaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuCcNn'
  ));
$$;


-- ===========================================================================
-- submit_activity(p_lesson_id, p_payload jsonb) returns jsonb
--   Despacha por content_type. Valida no servidor, grava activity_submissions,
--   chama _complete_lesson_internal quando o critério é atingido.
--
--   Retorna:
--     {
--       status, score, feedback,
--       xp_awarded, achievements_unlocked, next_lesson_id, submission_id
--     }
-- ===========================================================================
create or replace function public.submit_activity(
  p_lesson_id uuid,
  p_payload   jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id             uuid;
  v_kind                public.lesson_type;
  v_config              jsonb;
  v_submission_id       uuid;
  v_status              public.submission_status;
  v_score               integer;
  v_feedback            jsonb := null;
  v_lesson_result       jsonb := '{}'::jsonb;
  v_xp_awarded          integer := 0;
  v_achievements        jsonb := '[]'::jsonb;
  v_ach_before          uuid[];
  v_ach                 record;
  v_next_lesson_id      uuid;
  v_existing            public.activity_submissions;
  v_answer_key          jsonb;
  v_total_items         integer;
  v_correct_items       integer;
  v_completed           boolean;
  -- task
  v_checklist_payload   jsonb;
  v_note                text;
  v_requires_review     boolean;
  v_missing_required    boolean;
  v_item                jsonb;
  v_checked_ids         text[];
  -- challenge
  v_response            text;
  v_blocked_terms       jsonb;
  v_blocked_found       text[];
  v_criteria            jsonb;
  v_eval_payload        jsonb;
  v_all_criteria_ok     boolean;
  v_term                text;
  -- survey
  v_questions           jsonb;
  v_answers_payload     jsonb;
  v_answer              jsonb;
  v_q                   jsonb;
  v_q_id                text;
  v_q_type              text;
  v_q_required          boolean;
  v_ans_value           jsonb;
  -- game
  v_perfect             boolean;
  v_xp_perfect          integer := 0;
  -- module / path
  v_module_id           uuid;
  v_path_id             uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'NO_ACCESS' using hint = 'Usuário não autenticado';
  end if;

  if not public.can_access_lesson(p_lesson_id, v_user_id) then
    raise exception 'NO_ACCESS' using hint = 'Sem acesso a esta aula';
  end if;

  if not public.is_lesson_unlocked(p_lesson_id, v_user_id) then
    raise exception 'LESSON_LOCKED' using hint = 'Aula bloqueada';
  end if;

  select l.content_type, l.config, m.id, m.learning_path_id
    into v_kind, v_config, v_module_id, v_path_id
    from public.lessons l
    join public.modules m on m.id = l.module_id
   where l.id = p_lesson_id;

  if v_kind not in ('task', 'challenge', 'survey', 'game') then
    raise exception 'INVALID_ACTIVITY_TYPE'
      using hint = 'Este tipo de aula não usa submit_activity';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'INVALID_PAYLOAD' using hint = 'Payload inválido';
  end if;

  -- Guarda conquistas anteriores para computar diff no final
  select array_agg(ua.achievement_id)
    into v_ach_before
    from public.user_achievements ua
   where ua.user_id = v_user_id;
  v_ach_before := coalesce(v_ach_before, '{}');

  -- Placeholder default
  v_status := 'submitted';
  v_score  := null;
  v_completed := false;

  -- ─── TASK ───────────────────────────────────────────────────────────────
  if v_kind = 'task' then
    v_requires_review := coalesce((v_config->>'requires_review')::boolean, false);
    v_checklist_payload := coalesce(p_payload->'checklist', '[]'::jsonb);
    v_note := coalesce(p_payload->>'note', '');

    if char_length(v_note) > 1000 then
      raise exception 'INVALID_PAYLOAD' using hint = 'Nota excede 1000 caracteres';
    end if;

    -- IDs marcados no payload
    select array_agg(elem->>'id')
      into v_checked_ids
      from jsonb_array_elements(v_checklist_payload) elem
     where coalesce((elem->>'checked')::boolean, false);
    v_checked_ids := coalesce(v_checked_ids, '{}');

    v_missing_required := false;
    for v_item in
      select value from jsonb_array_elements(coalesce(v_config->'checklist', '[]'::jsonb))
    loop
      if coalesce((v_item->>'required')::boolean, false) then
        if not ((v_item->>'id') = any(v_checked_ids)) then
          v_missing_required := true;
          exit;
        end if;
      end if;
    end loop;

    if v_missing_required then
      raise exception 'INVALID_PAYLOAD'
        using hint = 'Marque todos os itens obrigatórios do checklist';
    end if;

    if v_requires_review then
      v_status := 'needs_review';
    else
      v_status := 'completed';
      v_completed := true;
    end if;

  -- ─── CHALLENGE ──────────────────────────────────────────────────────────
  elsif v_kind = 'challenge' then
    v_response := coalesce(p_payload->>'response', '');
    if char_length(v_response) < 200 or char_length(v_response) > 2000 then
      raise exception 'INVALID_PAYLOAD'
        using hint = 'Resposta deve ter entre 200 e 2000 caracteres';
    end if;

    v_blocked_terms := coalesce(v_config->'blocked_terms', '[]'::jsonb);
    v_blocked_found := '{}';

    for v_term in select value from jsonb_array_elements_text(v_blocked_terms)
    loop
      if public._unaccent_lower(v_response) like '%' || public._unaccent_lower(v_term) || '%' then
        v_blocked_found := v_blocked_found || v_term;
      end if;
    end loop;

    v_criteria := coalesce(v_config->'evaluation_criteria', '[]'::jsonb);
    v_eval_payload := coalesce(p_payload->'evaluation', '[]'::jsonb);

    select array_agg(elem->>'id')
      into v_checked_ids
      from jsonb_array_elements(v_eval_payload) elem
     where coalesce((elem->>'checked')::boolean, false);
    v_checked_ids := coalesce(v_checked_ids, '{}');

    v_all_criteria_ok := true;
    for v_item in
      select value from jsonb_array_elements(v_criteria)
    loop
      if not ((v_item->>'id') = any(v_checked_ids)) then
        v_all_criteria_ok := false;
        exit;
      end if;
    end loop;

    if array_length(v_blocked_found, 1) is not null then
      v_status := 'submitted';
      v_score := 0;
      v_feedback := jsonb_build_object(
        'blocked_terms_found', to_jsonb(v_blocked_found)
      );
      v_completed := false;
    elsif not v_all_criteria_ok then
      v_status := 'submitted';
      v_feedback := jsonb_build_object(
        'missing_criteria', true
      );
      v_completed := false;
    else
      v_status := 'completed';
      v_completed := true;
    end if;

  -- ─── SURVEY ─────────────────────────────────────────────────────────────
  elsif v_kind = 'survey' then
    -- Uma submissão por pessoa: se já existe completed, devolve
    select *
      into v_existing
      from public.activity_submissions
     where user_id = v_user_id
       and lesson_id = p_lesson_id
       and kind = 'survey'
       and status = 'completed'
     order by created_at desc
     limit 1;

    if v_existing.id is not null then
      return jsonb_build_object(
        'status', v_existing.status,
        'score', v_existing.score,
        'feedback', coalesce(v_existing.feedback, '{}'::jsonb),
        'xp_awarded', 0,
        'achievements_unlocked', '[]'::jsonb,
        'submission_id', v_existing.id,
        'next_lesson_id', null,
        'already_submitted', true
      );
    end if;

    v_questions := coalesce(v_config->'questions', '[]'::jsonb);
    v_answers_payload := coalesce(p_payload->'answers', '{}'::jsonb);

    for v_q in select value from jsonb_array_elements(v_questions)
    loop
      v_q_id := v_q->>'id';
      v_q_type := coalesce(v_q->>'type', 'short_text');
      v_q_required := coalesce((v_q->>'required')::boolean, false);
      v_ans_value := v_answers_payload->v_q_id;

      if v_q_required and (v_ans_value is null or v_ans_value = 'null'::jsonb
        or (jsonb_typeof(v_ans_value) = 'string' and (v_ans_value#>>'{}') = '')) then
        raise exception 'INVALID_PAYLOAD'
          using hint = 'Responda todas as perguntas obrigatórias';
      end if;

      if v_ans_value is not null and v_ans_value <> 'null'::jsonb then
        if v_q_type = 'scale' then
          if not (jsonb_typeof(v_ans_value) = 'number'
                  and (v_ans_value::text)::numeric between 1 and 5) then
            raise exception 'INVALID_PAYLOAD' using hint = 'Escala fora do intervalo 1..5';
          end if;
        elsif v_q_type = 'nps' then
          if not (jsonb_typeof(v_ans_value) = 'number'
                  and (v_ans_value::text)::numeric between 0 and 10) then
            raise exception 'INVALID_PAYLOAD' using hint = 'NPS fora do intervalo 0..10';
          end if;
        elsif v_q_type = 'yes_no' then
          if not (jsonb_typeof(v_ans_value) = 'boolean') then
            raise exception 'INVALID_PAYLOAD' using hint = 'yes_no requer boolean';
          end if;
        elsif v_q_type = 'short_text' then
          if jsonb_typeof(v_ans_value) <> 'string' or char_length(v_ans_value#>>'{}') > 120 then
            raise exception 'INVALID_PAYLOAD' using hint = 'Texto curto até 120 caracteres';
          end if;
        elsif v_q_type = 'long_text' then
          if jsonb_typeof(v_ans_value) <> 'string' or char_length(v_ans_value#>>'{}') > 1000 then
            raise exception 'INVALID_PAYLOAD' using hint = 'Texto longo até 1000 caracteres';
          end if;
        elsif v_q_type = 'single_choice' then
          if jsonb_typeof(v_ans_value) <> 'string' then
            raise exception 'INVALID_PAYLOAD' using hint = 'single_choice requer string com id da opção';
          end if;
          if not exists (
            select 1
              from jsonb_array_elements(coalesce(v_q->'options', '[]'::jsonb)) opt
             where (opt->>'id') = (v_ans_value#>>'{}')
          ) then
            raise exception 'INVALID_PAYLOAD' using hint = 'Opção inválida';
          end if;
        elsif v_q_type = 'multiple_choice' then
          if jsonb_typeof(v_ans_value) <> 'array' then
            raise exception 'INVALID_PAYLOAD' using hint = 'multiple_choice requer array';
          end if;
          if jsonb_array_length(v_ans_value) > coalesce((v_q->>'max')::integer, jsonb_array_length(v_ans_value)) then
            raise exception 'INVALID_PAYLOAD' using hint = 'Excedeu o número máximo de escolhas';
          end if;
        end if;
      end if;
    end loop;

    v_status := 'completed';
    v_completed := true;

  -- ─── GAME ───────────────────────────────────────────────────────────────
  elsif v_kind = 'game' then
    select k.key
      into v_answer_key
      from public.lesson_answer_keys k
     where k.lesson_id = p_lesson_id;

    if v_answer_key is null then
      raise exception 'INVALID_ACTIVITY_TYPE'
        using hint = 'Game sem gabarito configurado';
    end if;

    -- Pontuação: percentual de acertos em todos os itens de todas as rodadas do gabarito
    v_total_items := 0;
    v_correct_items := 0;

    declare
      v_round_key      jsonb;
      v_round_ans      jsonb;
      v_round_type     text;
      v_round_id       text;
      v_ans_rounds     jsonb;
      v_expected_order jsonb;
      v_given_order    jsonb;
      v_expected_cards jsonb;
      v_given_cards    jsonb;
      v_card           jsonb;
      v_g_card         jsonb;
      v_ans_map        jsonb;
    begin
      v_ans_rounds := coalesce(p_payload->'rounds', '[]'::jsonb);

      for v_round_key in select value from jsonb_array_elements(v_answer_key->'rounds')
      loop
        v_round_type := v_round_key->>'type';
        v_round_id := v_round_key->>'id';

        select value
          into v_round_ans
          from jsonb_array_elements(v_ans_rounds) rj
         where (rj.value->>'id') = v_round_id
         limit 1;

        if v_round_type = 'drag_sort' then
          v_expected_order := coalesce(v_round_key->'order', '[]'::jsonb);
          v_given_order   := coalesce(v_round_ans->'order', '[]'::jsonb);

          declare
            v_i integer := 0;
            v_len integer;
          begin
            v_len := jsonb_array_length(v_expected_order);
            v_total_items := v_total_items + v_len;
            while v_i < v_len loop
              if v_given_order->v_i = v_expected_order->v_i then
                v_correct_items := v_correct_items + 1;
              end if;
              v_i := v_i + 1;
            end loop;
          end;

        elsif v_round_type = 'say_dont_say' then
          v_expected_cards := coalesce(v_round_key->'cards', '[]'::jsonb);
          v_given_cards := coalesce(v_round_ans->'cards', '[]'::jsonb);
          v_total_items := v_total_items + jsonb_array_length(v_expected_cards);

          for v_card in select value from jsonb_array_elements(v_expected_cards)
          loop
            select value
              into v_g_card
              from jsonb_array_elements(v_given_cards) gj
             where (gj.value->>'id') = (v_card->>'id')
             limit 1;

            if v_g_card is not null and (v_g_card->>'answer') = (v_card->>'answer') then
              v_correct_items := v_correct_items + 1;
            end if;
          end loop;
        end if;
      end loop;
    end;

    if v_total_items = 0 then
      v_score := 0;
    else
      v_score := floor((v_correct_items::numeric * 100) / v_total_items)::integer;
    end if;

    v_perfect := (v_score = 100);

    if v_score >= 70 then
      v_status := 'completed';
      v_completed := true;
    else
      v_status := 'submitted';
      v_completed := false;
    end if;

    v_feedback := jsonb_build_object(
      'correct_items', v_correct_items,
      'total_items', v_total_items
    );
  end if;

  -- ─── INSERT SUBMISSION ────────────────────────────────────────────────
  insert into public.activity_submissions (
    user_id, lesson_id, kind, payload, score, status, feedback
  )
  values (
    v_user_id, p_lesson_id, v_kind, p_payload, v_score, v_status, v_feedback
  )
  returning id into v_submission_id;

  -- ─── COMPLETE + XP + ACHIEVEMENTS ─────────────────────────────────────
  if v_completed then
    v_lesson_result := public._complete_lesson_internal(v_user_id, p_lesson_id);
    v_xp_awarded := coalesce((v_lesson_result->>'xp_awarded')::integer, 0);

    -- Bônus específico do game
    if v_kind = 'game' and v_perfect then
      v_xp_perfect := public.award_xp(
        v_user_id,
        'game_perfect',
        'lesson',
        p_lesson_id,
        public.get_setting('xp_game_perfect_bonus')
      );
      -- Reavalia conquistas para pegar game_perfect logo depois do XP
      perform public.evaluate_achievements(v_user_id);
    end if;

    v_xp_awarded := v_xp_awarded + v_xp_perfect;
  end if;

  -- Sempre reavalia (survey/task/challenge disparam first_*)
  perform public.evaluate_achievements(v_user_id);

  -- Coleta conquistas novas
  for v_ach in
    select a.id, a.code, a.name, a.icon
      from public.user_achievements ua
      join public.achievements a on a.id = ua.achievement_id
     where ua.user_id = v_user_id
       and ua.achievement_id <> all(v_ach_before)
  loop
    v_achievements := v_achievements || jsonb_build_object(
      'id',   v_ach.id,
      'code', v_ach.code,
      'name', v_ach.name,
      'icon', v_ach.icon
    );
  end loop;

  -- ─── NEXT LESSON ──────────────────────────────────────────────────────
  select l.id
    into v_next_lesson_id
    from public.lessons l
    join public.modules m on m.id = l.module_id
   where m.learning_path_id = v_path_id
     and l.published = true
     and (
       m.position > (select position from public.modules where id = v_module_id)
       or (
         m.position = (select position from public.modules where id = v_module_id)
         and l.position > (select position from public.lessons where id = p_lesson_id)
       )
     )
   order by m.position asc, l.position asc
   limit 1;

  return jsonb_build_object(
    'status',                v_status,
    'score',                 v_score,
    'feedback',              coalesce(v_feedback, '{}'::jsonb),
    'xp_awarded',            v_xp_awarded,
    'achievements_unlocked', v_achievements,
    'next_lesson_id',        v_next_lesson_id,
    'submission_id',         v_submission_id
  );
end;
$$;

revoke execute on function public.submit_activity(uuid, jsonb) from public, anon;
grant  execute on function public.submit_activity(uuid, jsonb) to authenticated;


-- ===========================================================================
-- complete_lesson (RECRIADO)
--   - Bloqueia tipos que devem usar submit_activity
--   - Vídeo exige progress_percent >= 80
-- ===========================================================================
create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id       uuid;
  v_has_quiz      boolean;
  v_quiz_passed   boolean;
  v_content_type  public.lesson_type;
  v_progress_pct  smallint;
  v_result        jsonb;
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

  select l.content_type
    into v_content_type
    from public.lessons l
   where l.id = p_lesson_id;

  if v_content_type in ('task', 'challenge', 'survey', 'game') then
    raise exception 'USE_SUBMIT_ACTIVITY'
      using hint = 'Use submit_activity para este tipo de aula';
  end if;

  if v_content_type = 'video' then
    select coalesce(lp.progress_percent, 0::smallint)
      into v_progress_pct
      from public.lesson_progress lp
     where lp.user_id = v_user_id
       and lp.lesson_id = p_lesson_id;

    if coalesce(v_progress_pct, 0::smallint) < 80 then
      raise exception 'VIDEO_NOT_WATCHED'
        using hint = 'Assista pelo menos 80% do vídeo para concluir';
    end if;
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

revoke execute on function public.complete_lesson(uuid) from public, anon;
grant  execute on function public.complete_lesson(uuid) to authenticated;
