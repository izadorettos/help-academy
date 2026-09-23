-- Testes pgTAP — Fase 11: submit_quiz
-- Cobre: autenticação, respostas corretas/erradas/mistas, nota de corte,
--        duplicatas, quiz inválido, is_correct ausente no retorno,
--        complete_lesson após submit_quiz aprovado.
--
-- IDs reutilizados do seed:
--   membro-A:  00000000-0000-0000-0000-000000000002  (área Geral, acessa Onboarding)
--   quiz:      00000000-0000-0000-0006-000000000001  (passing_score = 70, 2 questões)
--   aula-5:    00000000-0000-0000-0004-000000000005  (tem o quiz, módulo 2, pos 2)
--   aula-4:    00000000-0000-0000-0004-000000000004  (módulo 2, pos 1, sem quiz)
--   aula-1:    00000000-0000-0000-0004-000000000001
--   aula-2:    00000000-0000-0000-0004-000000000002
--
--   Questão 1 (multiple_choice):
--     q1:       00000000-0000-0000-0007-000000000001
--     opt CERTA: 00000000-0000-0000-0008-000000000001
--     opt errada:00000000-0000-0000-0008-000000000002
--   Questão 2 (true_false):
--     q2:       00000000-0000-0000-0007-000000000002
--     opt CERTA: 00000000-0000-0000-0008-000000000005 (Verdadeiro)
--     opt errada:00000000-0000-0000-0008-000000000006 (Falso)

begin;
select no_plan();

-- ===========================================================================
-- SETUP: limpa qualquer progresso/tentativa do membro-A
-- ===========================================================================
delete from public.quiz_attempt_answers
  where attempt_id in (
    select id from public.quiz_attempts
    where user_id = '00000000-0000-0000-0000-000000000002'
  );
delete from public.quiz_attempts      where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.lesson_progress    where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.module_completions where user_id = '00000000-0000-0000-0000-000000000002';
update public.user_learning_paths
   set started_at = null, completed_at = null
 where user_id = '00000000-0000-0000-0000-000000000002';

-- ===========================================================================
-- BLOCO 1: Usuário não autenticado — deve lançar exceção
-- ===========================================================================

select throws_ok(
  $$select public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000005"}]'::jsonb
    )$$,
  null, null,
  'submit_quiz: lança exceção sem autenticação'
);

-- ===========================================================================
-- A partir daqui, autenticado como membro-A
-- ===========================================================================

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- Prepara progresso para aulas anteriores (aula-1, aula-2, aula-4) como superuser
reset role;

insert into public.lesson_progress (user_id, lesson_id, started_at, last_accessed_at, completed_at)
values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0004-000000000001', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0004-000000000002', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0004-000000000004', now(), now(), now())
on conflict (user_id, lesson_id) do update set completed_at = now();

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- ===========================================================================
-- BLOCO 2: Respostas 100% corretas → passed=true, score=100
-- ===========================================================================

select lives_ok(
  $$select public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000005"}]'::jsonb
    )$$,
  'submit_quiz: 100% corretas não lança erro'
);

-- Verifica resultado
select is(
  (select (public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000005"}]'::jsonb
    ))->>'passed')::boolean,
  true,
  'submit_quiz: 100% corretas → passed=true'
);

select is(
  (select (public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000005"}]'::jsonb
    ))->>'score')::integer,
  100,
  'submit_quiz: 100% corretas → score=100'
);

-- is_correct NÃO deve estar presente no JSON retornado
select ok(
  not ((public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000005"}]'::jsonb
    )) ? 'is_correct'),
  'submit_quiz: is_correct não está no JSON retornado'
);

-- ===========================================================================
-- BLOCO 3: Respostas 0% corretas → passed=false, score=0
-- ===========================================================================

-- Limpa tentativas anteriores para teste limpo
reset role;
delete from public.quiz_attempt_answers
  where attempt_id in (
    select id from public.quiz_attempts
    where user_id = '00000000-0000-0000-0000-000000000002'
  );
delete from public.quiz_attempts      where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.lesson_progress    where user_id = '00000000-0000-0000-0000-000000000002'
                                              and lesson_id = '00000000-0000-0000-0004-000000000005';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is(
  (select (public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000002"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000006"}]'::jsonb
    ))->>'passed')::boolean,
  false,
  'submit_quiz: 0% corretas → passed=false'
);

select is(
  (select (public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000002"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000006"}]'::jsonb
    ))->>'score')::integer,
  0,
  'submit_quiz: 0% corretas → score=0'
);

-- ===========================================================================
-- BLOCO 4: Respostas mistas (1/2 correta = 50%) → abaixo de 70% → passed=false
-- ===========================================================================

select is(
  (select (public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000006"}]'::jsonb
    ))->>'score')::integer,
  50,
  'submit_quiz: 1/2 corretas → score=50'
);

select is(
  (select (public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000006"}]'::jsonb
    ))->>'passed')::boolean,
  false,
  'submit_quiz: nota de corte 70%, 50% → passed=false'
);

-- ===========================================================================
-- BLOCO 5: Respostas duplicadas → INVALID_ANSWERS
-- ===========================================================================

select throws_ok(
  $$select public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000002"}]'::jsonb
    )$$,
  null, null,
  'submit_quiz: questão duplicada → lança INVALID_ANSWERS'
);

-- ===========================================================================
-- BLOCO 6: quiz_id inexistente → NO_ACCESS/erro
-- ===========================================================================

select throws_ok(
  $$select public.submit_quiz(
      'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000005"}]'::jsonb
    )$$,
  null, null,
  'submit_quiz: quiz_id inexistente → lança exceção'
);

-- ===========================================================================
-- BLOCO 7: Número de respostas errado → INVALID_ANSWERS
-- ===========================================================================

select throws_ok(
  $$select public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"}]'::jsonb
    )$$,
  null, null,
  'submit_quiz: resposta faltando → lança INVALID_ANSWERS'
);

-- ===========================================================================
-- BLOCO 8: Após submit_quiz aprovado, complete_lesson deve funcionar
-- ===========================================================================

-- Limpa tentativas e progresso de aula-5
reset role;
delete from public.quiz_attempt_answers
  where attempt_id in (
    select id from public.quiz_attempts
    where user_id = '00000000-0000-0000-0000-000000000002'
  );
delete from public.quiz_attempts   where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.lesson_progress where user_id = '00000000-0000-0000-0000-000000000002'
                                          and lesson_id = '00000000-0000-0000-0004-000000000005';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- Submete quiz com 100% corretas → passa e deve concluir a aula internamente
select lives_ok(
  $$select public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000005"}]'::jsonb
    )$$,
  'submit_quiz: aprovado → concluí aula-5 automaticamente sem erro'
);

-- Tentativa aprovada deve existir
select is(
  (select count(*)::integer from public.quiz_attempts
    where user_id = '00000000-0000-0000-0000-000000000002'
      and quiz_id = '00000000-0000-0000-0006-000000000001'
      and passed  = true),
  1,
  'submit_quiz: tentativa aprovada inserida em quiz_attempts'
);

-- Aula-5 deve estar concluída em lesson_progress (via _complete_lesson_internal)
select ok(
  (select completed_at is not null from public.lesson_progress
    where user_id  = '00000000-0000-0000-0000-000000000002'
      and lesson_id = '00000000-0000-0000-0004-000000000005'),
  'submit_quiz: aula-5 marcada como concluída após passar no quiz'
);

-- complete_lesson também deve funcionar sem QUIZ_REQUIRED agora (idempotente)
select lives_ok(
  $$select public.complete_lesson('00000000-0000-0000-0004-000000000005')$$,
  'complete_lesson: sem QUIZ_REQUIRED após submit_quiz aprovado (idempotente)'
);

-- ===========================================================================
-- BLOCO 9: Verifica que quiz_attempt_answers foram inseridas
-- ===========================================================================

select ok(
  (select count(*)::integer from public.quiz_attempt_answers qaa
    join public.quiz_attempts qa on qa.id = qaa.attempt_id
   where qa.user_id = '00000000-0000-0000-0000-000000000002'
     and qa.quiz_id = '00000000-0000-0000-0006-000000000001') >= 2,
  'submit_quiz: quiz_attempt_answers inseridas'
);

reset role;

select * from finish();
rollback;
