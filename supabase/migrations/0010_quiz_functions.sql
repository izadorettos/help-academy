-- Migration 0010: Funções de quiz
-- Fase 11 — submit_quiz: valida respostas, registra tentativa, retorna resultado.
-- Segurança: is_correct de quiz_options NUNCA retornado ao cliente antes da submissão.
-- Todas as funções são SECURITY DEFINER com set search_path = ''.

-- ===========================================================================
-- submit_quiz(p_quiz_id uuid, p_answers jsonb) returns jsonb
--
-- p_answers = [{ "question_id": uuid, "option_id": uuid }, …]
--
-- Fluxo:
-- 1. Verifica autenticação.
-- 2. Verifica que o quiz existe e que o usuário pode acessar a aula do quiz.
-- 3. Valida o conjunto de respostas: todas as questões respondidas exatamente uma vez,
--    cada option_id pertence à questão correspondente — senão INVALID_ANSWERS.
-- 4. Calcula correct_count, score = floor(correct*100/total), passed.
-- 5. Insere quiz_attempts + quiz_attempt_answers.
-- 6. Se passou: chama _complete_lesson_internal (automaticamente conclui a aula).
-- 7. Retorna JSON com resultado (sem is_correct).
-- ===========================================================================
create or replace function public.submit_quiz(
  p_quiz_id uuid,
  p_answers jsonb   -- [{ "question_id": uuid, "option_id": uuid }]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id         uuid;
  v_lesson_id       uuid;
  v_passing_score   integer;
  v_total_questions integer;
  v_correct_count   integer := 0;
  v_score           integer;
  v_passed          boolean;
  v_attempt_id      uuid;
  v_answer          jsonb;
  v_question_id     uuid;
  v_option_id       uuid;
  v_is_correct      boolean;
  v_option_ok       boolean;
  v_question_ids    uuid[];
  v_seen_questions  uuid[] := '{}';
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
  select q.lesson_id, q.passing_score
    into v_lesson_id, v_passing_score
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

  -- Total de questões no quiz
  select count(*)::integer
    into v_total_questions
    from public.quiz_questions qq
   where qq.quiz_id = p_quiz_id;

  if v_total_questions = 0 then
    raise exception 'INVALID_ANSWERS' using hint = 'Quiz sem questões';
  end if;

  -- Número de respostas deve ser igual ao número de questões
  if jsonb_array_length(p_answers) <> v_total_questions then
    raise exception 'INVALID_ANSWERS'
      using hint = 'Número de respostas não corresponde ao número de questões';
  end if;

  -- Coleta todos os question_ids válidos para este quiz
  select array_agg(qq.id)
    into v_question_ids
    from public.quiz_questions qq
   where qq.quiz_id = p_quiz_id;

  -- Valida cada resposta
  for v_answer in select jsonb_array_elements(p_answers)
  loop
    v_question_id := (v_answer->>'question_id')::uuid;
    v_option_id   := (v_answer->>'option_id')::uuid;

    -- question_id deve pertencer ao quiz
    if not (v_question_id = any(v_question_ids)) then
      raise exception 'INVALID_ANSWERS'
        using hint = 'Questão não pertence a este quiz';
    end if;

    -- Sem questão duplicada
    if v_question_id = any(v_seen_questions) then
      raise exception 'INVALID_ANSWERS'
        using hint = 'Questão respondida mais de uma vez';
    end if;
    v_seen_questions := v_seen_questions || v_question_id;

    -- option_id deve pertencer à questão
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
  -- 4. Calcula resultado (is_correct consultado server-side apenas)
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
  -- 6. Se passou, conclui a aula automaticamente
  -- -------------------------------------------------------------------------
  if v_passed then
    perform public._complete_lesson_internal(v_user_id, v_lesson_id);
  end if;

  -- -------------------------------------------------------------------------
  -- 7. Retorna resultado (sem is_correct)
  -- -------------------------------------------------------------------------
  return jsonb_build_object(
    'score',           v_score,
    'passed',          v_passed,
    'correct_count',   v_correct_count,
    'total_questions', v_total_questions,
    'passing_score',   v_passing_score
  );
end;
$$;

-- Apenas usuários autenticados podem chamar submit_quiz
revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
grant  execute on function public.submit_quiz(uuid, jsonb) to authenticated;
