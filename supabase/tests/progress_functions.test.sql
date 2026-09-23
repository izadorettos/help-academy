-- Testes pgTAP — Fase 10: Funções de progresso
-- Cobre: start_lesson, complete_lesson, _complete_lesson_internal,
--        conclusão de módulo, conclusão de trilha, lição bloqueada, não autenticado.
--
-- IDs reutilizados do seed:
--   membro-A: 00000000-0000-0000-0000-000000000002  (área Geral, acessa Onboarding)
--   admin:    00000000-0000-0000-0000-000000000001
--   Trilha:   00000000-0000-0000-0002-000000000001  (sequential = true)
--   Módulo 1: 00000000-0000-0000-0003-000000000001
--   Módulo 2: 00000000-0000-0000-0003-000000000002
--   Aulas módulo 1 (required):
--     aula-1: 00000000-0000-0000-0004-000000000001  (pos 1, required)
--     aula-2: 00000000-0000-0000-0004-000000000002  (pos 2, required)
--   Aula módulo 1 (optional):
--     aula-3: 00000000-0000-0000-0004-000000000003  (pos 3, required=false)
--   Aulas módulo 2 (required):
--     aula-4: 00000000-0000-0000-0004-000000000004  (pos 1, required)
--     aula-5: 00000000-0000-0000-0004-000000000005  (pos 2, required, tem quiz)
--   Quiz: 00000000-0000-0000-0006-000000000001

begin;
select no_plan();

-- ===========================================================================
-- SETUP: limpa qualquer progresso que possa existir do membro-A
-- ===========================================================================
delete from public.lesson_progress    where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.module_completions where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.quiz_attempts      where user_id = '00000000-0000-0000-0000-000000000002';
update public.user_learning_paths
   set started_at = null, completed_at = null
 where user_id = '00000000-0000-0000-0000-000000000002';

-- ===========================================================================
-- BLOCO 1: Usuário não autenticado
-- start_lesson e complete_lesson devem lançar exceção sem auth.uid()
-- ===========================================================================

select throws_ok(
  $$select public.start_lesson('00000000-0000-0000-0004-000000000001')$$,
  null, null,
  'start_lesson: lança exceção sem autenticação'
);

select throws_ok(
  $$select public.complete_lesson('00000000-0000-0000-0004-000000000001')$$,
  null, null,
  'complete_lesson: lança exceção sem autenticação'
);

-- ===========================================================================
-- BLOCO 2: start_lesson — como membro-A
-- ===========================================================================

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- start_lesson cria lesson_progress
select lives_ok(
  $$select public.start_lesson('00000000-0000-0000-0004-000000000001')$$,
  'start_lesson: membro-A inicia aula-1 sem erro'
);

select is(
  (select count(*)::integer from public.lesson_progress
    where user_id  = '00000000-0000-0000-0000-000000000002'
      and lesson_id = '00000000-0000-0000-0004-000000000001'),
  1,
  'start_lesson: cria linha em lesson_progress'
);

-- Deve ser idempotente (segunda chamada não cria nova linha, só atualiza)
select lives_ok(
  $$select public.start_lesson('00000000-0000-0000-0004-000000000001')$$,
  'start_lesson: segunda chamada não lança erro (idempotente)'
);

select is(
  (select count(*)::integer from public.lesson_progress
    where user_id  = '00000000-0000-0000-0000-000000000002'
      and lesson_id = '00000000-0000-0000-0004-000000000001'),
  1,
  'start_lesson: segunda chamada não cria linha duplicada'
);

-- Verifica que started_at foi gravado
select ok(
  (select started_at is not null from public.lesson_progress
    where user_id  = '00000000-0000-0000-0000-000000000002'
      and lesson_id = '00000000-0000-0000-0004-000000000001'),
  'start_lesson: started_at preenchido'
);

-- user_learning_paths deve ter started_at
select ok(
  (select started_at is not null from public.user_learning_paths
    where user_id          = '00000000-0000-0000-0000-000000000002'
      and learning_path_id = '00000000-0000-0000-0002-000000000001'),
  'start_lesson: upsert em user_learning_paths com started_at'
);

-- ===========================================================================
-- BLOCO 3: Aula bloqueada (trilha sequential, aula-2 sem completar aula-1)
-- ===========================================================================

reset role;

-- Limpa o progresso criado pelo start_lesson para aula-1
delete from public.lesson_progress
 where user_id  = '00000000-0000-0000-0000-000000000002'
   and lesson_id = '00000000-0000-0000-0004-000000000001';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- Aula-2 está bloqueada pois aula-1 (required) não foi concluída
select throws_ok(
  $$select public.start_lesson('00000000-0000-0000-0004-000000000002')$$,
  null, null,
  'start_lesson: lança LESSON_LOCKED para aula bloqueada'
);

select throws_ok(
  $$select public.complete_lesson('00000000-0000-0000-0004-000000000002')$$,
  null, null,
  'complete_lesson: lança LESSON_LOCKED para aula bloqueada'
);

reset role;

-- ===========================================================================
-- BLOCO 4: complete_lesson — marca aula como concluída (membro-A)
-- ===========================================================================

-- Prepara: insere lesson_progress para aula-1 via superuser (para simular start)
insert into public.lesson_progress (user_id, lesson_id, started_at, last_accessed_at)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0004-000000000001', now(), now())
on conflict (user_id, lesson_id) do nothing;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select lives_ok(
  $$select public.complete_lesson('00000000-0000-0000-0004-000000000001')$$,
  'complete_lesson: conclui aula-1 sem erro'
);

select ok(
  (select completed_at is not null from public.lesson_progress
    where user_id  = '00000000-0000-0000-0000-000000000002'
      and lesson_id = '00000000-0000-0000-0004-000000000001'),
  'complete_lesson: completed_at preenchido após conclusão'
);

-- Idempotente: segunda chamada não deve lançar erro
select lives_ok(
  $$select public.complete_lesson('00000000-0000-0000-0004-000000000001')$$,
  'complete_lesson: segunda chamada idempotente (sem erro)'
);

-- Deve ter apenas UMA linha de progresso (não duplicou)
select is(
  (select count(*)::integer from public.lesson_progress
    where user_id  = '00000000-0000-0000-0000-000000000002'
      and lesson_id = '00000000-0000-0000-0004-000000000001'),
  1,
  'complete_lesson: idempotente — sem linha duplicada em lesson_progress'
);

-- ===========================================================================
-- BLOCO 5: Módulo concluído quando todas as aulas required estão concluídas
-- ===========================================================================

-- Aula-2 deve estar desbloqueada agora (aula-1 concluída)
-- Inicia aula-2 via RPC (deve funcionar pois aula-1 foi concluída)
select lives_ok(
  $$select public.start_lesson('00000000-0000-0000-0004-000000000002')$$,
  'start_lesson: aula-2 desbloqueada após aula-1 concluída'
);

-- Conclui aula-2 (required)
select lives_ok(
  $$select public.complete_lesson('00000000-0000-0000-0004-000000000002')$$,
  'complete_lesson: conclui aula-2 sem erro'
);

-- Aula-3 é optional (required=false), não bloqueia módulo.
-- Com aula-1 e aula-2 (ambas required) concluídas, módulo-1 deve estar concluído.
select is(
  (select count(*)::integer from public.module_completions
    where user_id  = '00000000-0000-0000-0000-000000000002'
      and module_id = '00000000-0000-0000-0003-000000000001'),
  1,
  'complete_lesson: módulo-1 concluído após todas as aulas required serem concluídas'
);

-- Trilha ainda NÃO deve estar concluída (módulo-2 ainda tem aulas pendentes)
select is(
  (select completed_at from public.user_learning_paths
    where user_id          = '00000000-0000-0000-0000-000000000002'
      and learning_path_id = '00000000-0000-0000-0002-000000000001'),
  null::timestamptz,
  'complete_lesson: trilha ainda não concluída antes de finalizar módulo-2'
);

-- ===========================================================================
-- BLOCO 6: Quiz obrigatório — complete_lesson sem tentativa aprovada
-- ===========================================================================

-- Inicia aula-4 (required, módulo 2, sem quiz)
select lives_ok(
  $$select public.start_lesson('00000000-0000-0000-0004-000000000004')$$,
  'start_lesson: inicia aula-4 (módulo 2)'
);

-- Conclui aula-4
select lives_ok(
  $$select public.complete_lesson('00000000-0000-0000-0004-000000000004')$$,
  'complete_lesson: conclui aula-4 sem erro'
);

-- Aula-5 tem quiz — sem tentativa aprovada, deve falhar
select throws_ok(
  $$select public.complete_lesson('00000000-0000-0000-0004-000000000005')$$,
  null, null,
  'complete_lesson: lança QUIZ_REQUIRED para aula com quiz sem tentativa aprovada'
);

-- ===========================================================================
-- BLOCO 7: Trilha concluída após aprovar no quiz e concluir última aula
-- ===========================================================================

reset role;

-- Insere tentativa aprovada no quiz diretamente como superuser (simula submit_quiz)
insert into public.quiz_attempts (
  id, user_id, quiz_id,
  correct_count, total_questions, score, passed,
  completed_at
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0006-000000000001',
  2, 2, 100, true,
  now()
) on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- Inicia aula-5
select lives_ok(
  $$select public.start_lesson('00000000-0000-0000-0004-000000000005')$$,
  'start_lesson: inicia aula-5 (tem quiz)'
);

-- Agora complete_lesson deve funcionar (tem tentativa aprovada)
select lives_ok(
  $$select public.complete_lesson('00000000-0000-0000-0004-000000000005')$$,
  'complete_lesson: conclui aula-5 com quiz aprovado'
);

-- Módulo-2 deve estar concluído (aula-4 e aula-5 required, ambas concluídas)
select is(
  (select count(*)::integer from public.module_completions
    where user_id  = '00000000-0000-0000-0000-000000000002'
      and module_id = '00000000-0000-0000-0003-000000000002'),
  1,
  'complete_lesson: módulo-2 concluído após todas as aulas required serem concluídas'
);

-- Trilha deve estar concluída (todos os módulos, todas as aulas required)
select ok(
  (select completed_at is not null from public.user_learning_paths
    where user_id          = '00000000-0000-0000-0000-000000000002'
      and learning_path_id = '00000000-0000-0000-0002-000000000001'),
  'complete_lesson: trilha concluída após completar todas as aulas required'
);

-- ===========================================================================
-- BLOCO 8: _complete_lesson_internal não é executável por authenticated
-- ===========================================================================

select throws_ok(
  $$select public._complete_lesson_internal(
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0004-000000000001'
    )$$,
  '42501', null,
  '_complete_lesson_internal: não acessível por authenticated (permission denied)'
);

reset role;

select * from finish();
rollback;
