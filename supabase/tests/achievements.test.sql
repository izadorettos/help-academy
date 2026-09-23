-- Testes pgTAP — Fase 13: conquistas (evaluate_achievements)
-- Cobre: first_lesson, first_module, perfect_quiz, halfway, path_completed,
--        idempotência, RLS (membro não insere diretamente).
--
-- IDs reutilizados do seed:
--   membro-A:  00000000-0000-0000-0000-000000000002  (área Geral, acessa Onboarding)
--   admin:     00000000-0000-0000-0000-000000000001
--   Trilha:    00000000-0000-0000-0002-000000000001  (sequential=true)
--   Módulo 1:  00000000-0000-0000-0003-000000000001
--   Módulo 2:  00000000-0000-0000-0003-000000000002
--   aula-1:    00000000-0000-0000-0004-000000000001  (required, módulo 1, pos 1)
--   aula-2:    00000000-0000-0000-0004-000000000002  (required, módulo 1, pos 2)
--   aula-4:    00000000-0000-0000-0004-000000000004  (required, módulo 2, pos 1)
--   aula-5:    00000000-0000-0000-0004-000000000005  (required, módulo 2, pos 2, tem quiz)
--   quiz:      00000000-0000-0000-0006-000000000001  (passing_score=70, 2 questões)
--   Questão 1: 00000000-0000-0000-0007-000000000001
--     opt CERTA:   00000000-0000-0000-0008-000000000001
--   Questão 2: 00000000-0000-0000-0007-000000000002
--     opt CERTA:   00000000-0000-0000-0008-000000000005 (Verdadeiro)
--     opt errada:  00000000-0000-0000-0008-000000000006 (Falso)
--   conquistas (do seed):
--     first_lesson:   00000000-0000-0000-0005-000000000001
--     first_module:   00000000-0000-0000-0005-000000000002
--     perfect_quiz:   00000000-0000-0000-0005-000000000003
--     halfway:        00000000-0000-0000-0005-000000000004
--     path_completed: 00000000-0000-0000-0005-000000000005

begin;
select no_plan();

-- ===========================================================================
-- SETUP: limpa todo o progresso e conquistas do membro-A
-- ===========================================================================
delete from public.user_achievements    where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.xp_transactions      where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.quiz_attempt_answers
  where attempt_id in (
    select id from public.quiz_attempts
     where user_id = '00000000-0000-0000-0000-000000000002'
  );
delete from public.quiz_attempts        where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.lesson_progress      where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.module_completions   where user_id = '00000000-0000-0000-0000-000000000002';
update public.user_learning_paths
   set started_at = null, completed_at = null
 where user_id = '00000000-0000-0000-0000-000000000002';

-- Restaura gamification_settings
update public.gamification_settings set value = 10  where key = 'xp_lesson_default';
update public.gamification_settings set value = 20  where key = 'xp_quiz_default';
update public.gamification_settings set value = 30  where key = 'xp_quiz_perfect_bonus';
update public.gamification_settings set value = 50  where key = 'xp_module_completed';
update public.gamification_settings set value = 100 where key = 'xp_path_completed';

-- ===========================================================================
-- BLOCO 1: first_lesson — desbloqueia após primeira aula concluída
-- ===========================================================================

-- Antes: nenhuma conquista
select is(
  (select count(*)::integer from public.user_achievements
    where user_id = '00000000-0000-0000-0000-000000000002'),
  0,
  'ACH: membro começa sem conquistas'
);

-- Conclui aula-1 via _complete_lesson_internal
insert into public.lesson_progress (user_id, lesson_id, started_at, last_accessed_at)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0004-000000000001', now(), now())
on conflict (user_id, lesson_id) do nothing;

select lives_ok(
  $$select public._complete_lesson_internal(
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0004-000000000001'
    )$$,
  'ACH: _complete_lesson_internal aula-1 não lança erro'
);

-- first_lesson deve estar desbloqueada
select is(
  (select count(*)::integer from public.user_achievements
    where user_id        = '00000000-0000-0000-0000-000000000002'
      and achievement_id = '00000000-0000-0000-0005-000000000001'),
  1,
  'ACH: first_lesson desbloqueada após primeira aula concluída'
);

-- first_module NÃO deve estar desbloqueada ainda
select is(
  (select count(*)::integer from public.user_achievements
    where user_id        = '00000000-0000-0000-0000-000000000002'
      and achievement_id = '00000000-0000-0000-0005-000000000002'),
  0,
  'ACH: first_module não desbloqueada após apenas 1 aula'
);

-- ===========================================================================
-- BLOCO 2: first_lesson idempotente — não duplica
-- ===========================================================================

-- Chama novamente (já concluída → already_completed=true, não reavalia)
select lives_ok(
  $$select public._complete_lesson_internal(
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0004-000000000001'
    )$$,
  'ACH: segunda chamada _complete_lesson_internal não lança erro'
);

select is(
  (select count(*)::integer from public.user_achievements
    where user_id        = '00000000-0000-0000-0000-000000000002'
      and achievement_id = '00000000-0000-0000-0005-000000000001'),
  1,
  'ACH: first_lesson não duplica após segunda chamada'
);

-- Chama evaluate_achievements diretamente também deve ser idempotente
select lives_ok(
  $$select public.evaluate_achievements('00000000-0000-0000-0000-000000000002')$$,
  'ACH: evaluate_achievements direto não lança erro'
);

select is(
  (select count(*)::integer from public.user_achievements
    where user_id        = '00000000-0000-0000-0000-000000000002'
      and achievement_id = '00000000-0000-0000-0005-000000000001'),
  1,
  'ACH: evaluate_achievements idempotente — first_lesson ainda = 1 linha'
);

-- ===========================================================================
-- BLOCO 3: first_module — desbloqueia quando módulo-1 for concluído
-- ===========================================================================

-- Conclui aula-2 (última required do módulo-1)
insert into public.lesson_progress (user_id, lesson_id, started_at, last_accessed_at)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0004-000000000002', now(), now())
on conflict (user_id, lesson_id) do nothing;

select lives_ok(
  $$select public._complete_lesson_internal(
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0004-000000000002'
    )$$,
  'ACH: _complete_lesson_internal aula-2 não lança erro'
);

-- Módulo-1 deve estar em module_completions
select is(
  (select count(*)::integer from public.module_completions
    where user_id  = '00000000-0000-0000-0000-000000000002'
      and module_id = '00000000-0000-0000-0003-000000000001'),
  1,
  'ACH: módulo-1 concluído após aula-2'
);

-- first_module deve estar desbloqueada
select is(
  (select count(*)::integer from public.user_achievements
    where user_id        = '00000000-0000-0000-0000-000000000002'
      and achievement_id = '00000000-0000-0000-0005-000000000002'),
  1,
  'ACH: first_module desbloqueada quando todas as required do módulo-1 concluídas'
);

-- ===========================================================================
-- BLOCO 4: perfect_quiz — desbloqueia quando score = 100
-- ===========================================================================

-- Garante user_learning_paths para path_completed funcionar depois
insert into public.user_learning_paths (user_id, learning_path_id, started_at)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0002-000000000001', now())
on conflict (user_id, learning_path_id) do update
  set started_at = coalesce(public.user_learning_paths.started_at, now());

-- Conclui aula-4 para poder submeter quiz depois
insert into public.lesson_progress (user_id, lesson_id, started_at, last_accessed_at)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0004-000000000004', now(), now())
on conflict (user_id, lesson_id) do nothing;

select lives_ok(
  $$select public._complete_lesson_internal(
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0004-000000000004'
    )$$,
  'ACH: _complete_lesson_internal aula-4 não lança erro'
);

-- Submete quiz com 100% de acerto (como usuário autenticado)
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select lives_ok(
  $$select public.submit_quiz(
      '00000000-0000-0000-0006-000000000001'::uuid,
      '[{"question_id":"00000000-0000-0000-0007-000000000001","option_id":"00000000-0000-0000-0008-000000000001"},
        {"question_id":"00000000-0000-0000-0007-000000000002","option_id":"00000000-0000-0000-0008-000000000005"}]'::jsonb
    )$$,
  'ACH: submit_quiz 100% não lança erro'
);

reset role;

-- perfect_quiz deve estar desbloqueada
select is(
  (select count(*)::integer from public.user_achievements
    where user_id        = '00000000-0000-0000-0000-000000000002'
      and achievement_id = '00000000-0000-0000-0005-000000000003'),
  1,
  'ACH: perfect_quiz desbloqueada após score = 100'
);

-- ===========================================================================
-- BLOCO 5: halfway — já deve ter sido desbloqueada (submit_quiz conclui aula-5
-- que conclui módulo-2 que conclui a trilha → percent = 100 >= 50)
-- ===========================================================================

-- A conclusão via submit_quiz chama _complete_lesson_internal que chama
-- evaluate_achievements. Com aulas 1, 2, 4, 5 concluídas = 100% da trilha
-- → halfway (>= 50%) e path_completed devem estar desbloqueadas
select is(
  (select count(*)::integer from public.user_achievements
    where user_id        = '00000000-0000-0000-0000-000000000002'
      and achievement_id = '00000000-0000-0000-0005-000000000004'),
  1,
  'ACH: halfway desbloqueada quando trilha atingiu >= 50%'
);

-- ===========================================================================
-- BLOCO 6: path_completed — trilha totalmente concluída
-- ===========================================================================

-- user_learning_paths.completed_at deve estar preenchido
select ok(
  (select completed_at is not null from public.user_learning_paths
    where user_id          = '00000000-0000-0000-0000-000000000002'
      and learning_path_id = '00000000-0000-0000-0002-000000000001'),
  'ACH: user_learning_paths.completed_at preenchido após trilha completa'
);

-- path_completed deve estar desbloqueada
select is(
  (select count(*)::integer from public.user_achievements
    where user_id        = '00000000-0000-0000-0000-000000000002'
      and achievement_id = '00000000-0000-0000-0005-000000000005'),
  1,
  'ACH: path_completed desbloqueada após concluir a trilha inteira'
);

-- ===========================================================================
-- BLOCO 7: total de conquistas desbloqueadas = 5
-- ===========================================================================

select is(
  (select count(*)::integer from public.user_achievements
    where user_id = '00000000-0000-0000-0000-000000000002'),
  5,
  'ACH: total de conquistas desbloqueadas = 5'
);

-- ===========================================================================
-- BLOCO 8: RLS — membro não insere diretamente em user_achievements
-- ===========================================================================

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.user_achievements (user_id, achievement_id, earned_at)
    values (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0005-000000000001',
      now()
    )$$,
  '42501',
  'permission denied for table user_achievements',
  'ACH: membro não consegue inserir diretamente em user_achievements (RLS)'
);

reset role;

-- ===========================================================================
-- BLOCO 9: achievements_unlocked retornado no jsonb de _complete_lesson_internal
-- ===========================================================================

-- Prepara: novo membro sem progresso
-- Usa membro-A resetado (limpa e recomeça com apenas aula-1 para first_lesson)
delete from public.user_achievements    where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.xp_transactions      where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.quiz_attempt_answers
  where attempt_id in (
    select id from public.quiz_attempts
     where user_id = '00000000-0000-0000-0000-000000000002'
  );
delete from public.quiz_attempts        where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.lesson_progress      where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.module_completions   where user_id = '00000000-0000-0000-0000-000000000002';
update public.user_learning_paths
   set started_at = null, completed_at = null
 where user_id = '00000000-0000-0000-0000-000000000002';

insert into public.lesson_progress (user_id, lesson_id, started_at, last_accessed_at)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0004-000000000001', now(), now())
on conflict (user_id, lesson_id) do nothing;

-- O retorno deve ter achievements_unlocked como array não-vazio
select ok(
  jsonb_array_length(
    public._complete_lesson_internal(
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0004-000000000001'
    )->'achievements_unlocked'
  ) > 0,
  'ACH: _complete_lesson_internal retorna achievements_unlocked não-vazio na primeira conclusão'
);

-- Segunda chamada (already_completed) → achievements_unlocked = []
select is(
  jsonb_array_length(
    public._complete_lesson_internal(
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0004-000000000001'
    )->'achievements_unlocked'
  ),
  0,
  'ACH: _complete_lesson_internal retorna achievements_unlocked vazio quando already_completed'
);

reset role;

select * from finish();
rollback;
