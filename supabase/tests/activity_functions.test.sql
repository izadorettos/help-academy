-- Testes pgTAP — Fase 20: novos formatos de atividade
-- Cobre: submit_activity para task/challenge/survey/game,
--        save_lesson_progress só cresce, complete_lesson bloqueia tipos novos,
--        RLS de lesson_answer_keys e activity_submissions, idempotência de survey,
--        conquistas novas.
--
-- IDs reutilizados do seed + IDs novos com prefixo de20:
--   membro-A:   00000000-0000-0000-0000-000000000002
--   admin:      00000000-0000-0000-0000-000000000001
--   Trilha demo (não sequencial): de200000-0000-0000-0002-000000000001
--   Módulo demo:                  de200000-0000-0000-0003-000000000001
--   Aulas demo (uma por tipo)…

begin;
select no_plan();

-- ===========================================================================
-- SETUP — cria uma trilha de teste NÃO sequencial e uma aula por tipo novo.
-- Trilha disponível para a área Geral (mesma do membro-A).
-- ===========================================================================
insert into public.learning_paths (id, title, slug, description, required, sequential, status, position)
values (
  'de200000-0000-0000-0002-000000000001',
  'Atividades — teste', 'atividades-teste',
  'Trilha para testes de submit_activity', false, false, 'published', 900
) on conflict (id) do nothing;

insert into public.learning_path_departments (learning_path_id, department_id)
values ('de200000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001')
on conflict do nothing;

insert into public.modules (id, learning_path_id, title, description, position)
values (
  'de200000-0000-0000-0003-000000000001',
  'de200000-0000-0000-0002-000000000001',
  'Módulo de teste', 'Contém as aulas de teste', 1
) on conflict (id) do nothing;

-- ── task ─────────────────────────────────────────────────────────────────
insert into public.lessons (
  id, module_id, title, content_type, config,
  estimated_minutes, required, published, position
) values (
  'de200000-0000-0000-0004-000000000001',
  'de200000-0000-0000-0003-000000000001',
  'Task de teste', 'task',
  jsonb_build_object(
    'checklist', jsonb_build_array(
      jsonb_build_object('id','a','label','Item 1','required',true),
      jsonb_build_object('id','b','label','Item 2','required',true),
      jsonb_build_object('id','c','label','Item opcional','required',false)
    ),
    'optional_note', true,
    'note_max_chars', 1000,
    'requires_review', false
  ),
  5, false, true, 1
) on conflict (id) do nothing;

-- ── challenge ────────────────────────────────────────────────────────────
insert into public.lessons (
  id, module_id, title, content_type, config,
  estimated_minutes, required, published, position
) values (
  'de200000-0000-0000-0004-000000000002',
  'de200000-0000-0000-0003-000000000001',
  'Challenge de teste', 'challenge',
  jsonb_build_object(
    'scenario', 'Cenário de teste',
    'instructions', jsonb_build_array('Responda com cuidado'),
    'evaluation_criteria', jsonb_build_array(
      jsonb_build_object('id','c1','label','Critério 1'),
      jsonb_build_object('id','c2','label','Critério 2')
    ),
    'blocked_terms', jsonb_build_array('proibido','termo travado'),
    'min_chars', 200,
    'max_chars', 2000
  ),
  10, false, true, 2
) on conflict (id) do nothing;

-- ── survey ───────────────────────────────────────────────────────────────
insert into public.lessons (
  id, module_id, title, content_type, config,
  estimated_minutes, required, published, position
) values (
  'de200000-0000-0000-0004-000000000003',
  'de200000-0000-0000-0003-000000000001',
  'Survey de teste', 'survey',
  jsonb_build_object(
    'questions', jsonb_build_array(
      jsonb_build_object('id','q1','type','scale','required',true,'label','Escala'),
      jsonb_build_object('id','q2','type','short_text','required',false,'label','Texto')
    )
  ),
  4, false, true, 3
) on conflict (id) do nothing;

-- ── game ─────────────────────────────────────────────────────────────────
insert into public.lessons (
  id, module_id, title, content_type, config,
  estimated_minutes, required, published, position
) values (
  'de200000-0000-0000-0004-000000000004',
  'de200000-0000-0000-0003-000000000001',
  'Game de teste', 'game',
  jsonb_build_object(
    'rounds', jsonb_build_array(
      jsonb_build_object('id','r1','type','drag_sort','items',jsonb_build_array(
        jsonb_build_object('id','a','label','A'),
        jsonb_build_object('id','b','label','B'),
        jsonb_build_object('id','c','label','C'),
        jsonb_build_object('id','d','label','D'),
        jsonb_build_object('id','e','label','E'),
        jsonb_build_object('id','f','label','F')
      )),
      jsonb_build_object('id','r2','type','say_dont_say','cards',jsonb_build_array(
        jsonb_build_object('id','x1','label','Diga isto'),
        jsonb_build_object('id','x2','label','Não diga'),
        jsonb_build_object('id','x3','label','Diga isso'),
        jsonb_build_object('id','x4','label','Nem penso'),
        jsonb_build_object('id','x5','label','Diga assim'),
        jsonb_build_object('id','x6','label','Não diga isso'),
        jsonb_build_object('id','x7','label','Certeza'),
        jsonb_build_object('id','x8','label','Não é bem assim')
      ))
    )
  ),
  5, false, true, 4
) on conflict (id) do nothing;

-- Gabarito do game
insert into public.lesson_answer_keys (lesson_id, key) values (
  'de200000-0000-0000-0004-000000000004',
  jsonb_build_object(
    'rounds', jsonb_build_array(
      jsonb_build_object('id','r1','type','drag_sort',
        'order', jsonb_build_array('a','b','c','d','e','f')),
      jsonb_build_object('id','r2','type','say_dont_say',
        'cards', jsonb_build_array(
          jsonb_build_object('id','x1','answer','say'),
          jsonb_build_object('id','x2','answer','dont_say'),
          jsonb_build_object('id','x3','answer','say'),
          jsonb_build_object('id','x4','answer','dont_say'),
          jsonb_build_object('id','x5','answer','say'),
          jsonb_build_object('id','x6','answer','dont_say'),
          jsonb_build_object('id','x7','answer','say'),
          jsonb_build_object('id','x8','answer','dont_say')
        ))
    )
  )
) on conflict (lesson_id) do update set key = excluded.key;

-- Trilha demo é não-sequencial e não tem required — user_learning_paths cria via start_lesson
-- Reseta o progresso do membro-A para essas aulas
delete from public.activity_submissions where user_id = '00000000-0000-0000-0000-000000000002';
delete from public.lesson_progress
  where user_id = '00000000-0000-0000-0000-000000000002'
    and lesson_id in (
      'de200000-0000-0000-0004-000000000001',
      'de200000-0000-0000-0004-000000000002',
      'de200000-0000-0000-0004-000000000003',
      'de200000-0000-0000-0004-000000000004'
    );
delete from public.user_achievements where user_id = '00000000-0000-0000-0000-000000000002'
  and achievement_id in (
    select id from public.achievements where code in ('first_task','first_challenge','game_perfect','first_survey')
  );
delete from public.xp_transactions where user_id = '00000000-0000-0000-0000-000000000002'
  and reason in ('game_perfect');

-- ===========================================================================
-- BLOCO 1 — task
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- 1a. payload sem itens obrigatórios → INVALID_PAYLOAD
select throws_ok(
  $$select public.submit_activity(
      'de200000-0000-0000-0004-000000000001'::uuid,
      jsonb_build_object('checklist', jsonb_build_array(
        jsonb_build_object('id','a','checked',true)
      ))
    )$$,
  null, null,
  'task: falta item obrigatório → exceção'
);

-- 1b. payload válido → completed
select ok(
  (public.submit_activity(
    'de200000-0000-0000-0004-000000000001'::uuid,
    jsonb_build_object('checklist', jsonb_build_array(
      jsonb_build_object('id','a','checked',true),
      jsonb_build_object('id','b','checked',true)
    ), 'note', 'ok')
  )->>'status') = 'completed',
  'task: payload válido → status = completed'
);

reset role;

-- Conquista first_task desbloqueada
select is(
  (select count(*)::integer from public.user_achievements ua
     join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = '00000000-0000-0000-0000-000000000002'
      and a.code = 'first_task'),
  1,
  'task: conquista first_task desbloqueada'
);

-- ===========================================================================
-- BLOCO 2 — challenge
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- 2a. Resposta com termo travado → status submitted, feedback com termos
select is(
  (public.submit_activity(
    'de200000-0000-0000-0004-000000000002'::uuid,
    jsonb_build_object(
      'response', repeat('texto ', 40) || ' proíbido',   -- inclui "proibido" acentuado
      'evaluation', jsonb_build_array(
        jsonb_build_object('id','c1','checked',true),
        jsonb_build_object('id','c2','checked',true)
      )
    )
  )->>'status'),
  'submitted',
  'challenge: palavra travada → status = submitted'
);

-- 2b. Resposta válida → completed
select is(
  (public.submit_activity(
    'de200000-0000-0000-0004-000000000002'::uuid,
    jsonb_build_object(
      'response', repeat('resposta valida e ampla. ', 15),
      'evaluation', jsonb_build_array(
        jsonb_build_object('id','c1','checked',true),
        jsonb_build_object('id','c2','checked',true)
      )
    )
  )->>'status'),
  'completed',
  'challenge: resposta válida → status = completed'
);

reset role;

-- first_challenge desbloqueada
select is(
  (select count(*)::integer from public.user_achievements ua
     join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = '00000000-0000-0000-0000-000000000002'
      and a.code = 'first_challenge'),
  1,
  'challenge: conquista first_challenge desbloqueada'
);

-- ===========================================================================
-- BLOCO 3 — survey
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- 3a. Primeiro envio → completed
select is(
  (public.submit_activity(
    'de200000-0000-0000-0004-000000000003'::uuid,
    jsonb_build_object('answers', jsonb_build_object('q1', 4, 'q2', 'texto opcional'))
  )->>'status'),
  'completed',
  'survey: primeiro envio → status = completed'
);

-- 3b. Segundo envio → devolve o existente, sem duplicar submissão
select is(
  (public.submit_activity(
    'de200000-0000-0000-0004-000000000003'::uuid,
    jsonb_build_object('answers', jsonb_build_object('q1', 5))
  )->>'already_submitted'),
  'true',
  'survey: segunda chamada devolve already_submitted'
);

reset role;

-- Só existe UMA submissão de survey
select is(
  (select count(*)::integer from public.activity_submissions
    where user_id = '00000000-0000-0000-0000-000000000002'
      and lesson_id = 'de200000-0000-0000-0004-000000000003'),
  1,
  'survey: apenas uma linha em activity_submissions'
);

-- first_survey desbloqueada
select is(
  (select count(*)::integer from public.user_achievements ua
     join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = '00000000-0000-0000-0000-000000000002'
      and a.code = 'first_survey'),
  1,
  'survey: conquista first_survey desbloqueada'
);

-- ===========================================================================
-- BLOCO 4 — game
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- 4a. Payload todo errado (score baixo) → status submitted, sem completar
select ok(
  (public.submit_activity(
    'de200000-0000-0000-0004-000000000004'::uuid,
    jsonb_build_object('rounds', jsonb_build_array(
      jsonb_build_object('id','r1','order', jsonb_build_array('f','e','d','c','b','a')),
      jsonb_build_object('id','r2','cards', jsonb_build_array(
        jsonb_build_object('id','x1','answer','dont_say'),
        jsonb_build_object('id','x2','answer','say'),
        jsonb_build_object('id','x3','answer','dont_say'),
        jsonb_build_object('id','x4','answer','say'),
        jsonb_build_object('id','x5','answer','dont_say'),
        jsonb_build_object('id','x6','answer','say'),
        jsonb_build_object('id','x7','answer','dont_say'),
        jsonb_build_object('id','x8','answer','say')
      ))
    ))
  )->>'status') = 'submitted',
  'game: score baixo → status = submitted'
);

-- 4b. Score 100% → completed + XP game_perfect
select is(
  (public.submit_activity(
    'de200000-0000-0000-0004-000000000004'::uuid,
    jsonb_build_object('rounds', jsonb_build_array(
      jsonb_build_object('id','r1','order', jsonb_build_array('a','b','c','d','e','f')),
      jsonb_build_object('id','r2','cards', jsonb_build_array(
        jsonb_build_object('id','x1','answer','say'),
        jsonb_build_object('id','x2','answer','dont_say'),
        jsonb_build_object('id','x3','answer','say'),
        jsonb_build_object('id','x4','answer','dont_say'),
        jsonb_build_object('id','x5','answer','say'),
        jsonb_build_object('id','x6','answer','dont_say'),
        jsonb_build_object('id','x7','answer','say'),
        jsonb_build_object('id','x8','answer','dont_say')
      ))
    ))
  )->>'score')::integer,
  100,
  'game: score 100 para respostas corretas'
);

reset role;

-- XP de game_perfect gravado
select ok(
  exists(select 1 from public.xp_transactions
    where user_id = '00000000-0000-0000-0000-000000000002'
      and reason = 'game_perfect'),
  'game: award_xp game_perfect gravado'
);

-- game_perfect achievement desbloqueada
select is(
  (select count(*)::integer from public.user_achievements ua
     join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = '00000000-0000-0000-0000-000000000002'
      and a.code = 'game_perfect'),
  1,
  'game: conquista game_perfect desbloqueada'
);

-- ===========================================================================
-- BLOCO 5 — save_lesson_progress só aumenta
-- ===========================================================================
-- Cria uma lesson de vídeo para testar
insert into public.lessons (
  id, module_id, title, content_type, config,
  external_url, estimated_minutes, required, published, position
) values (
  'de200000-0000-0000-0004-000000000005',
  'de200000-0000-0000-0003-000000000001',
  'Vídeo de teste', 'video',
  '{}'::jsonb,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  6, false, true, 5
) on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select lives_ok(
  $$select public.save_lesson_progress(
      'de200000-0000-0000-0004-000000000005'::uuid, 40::smallint, 120
    )$$,
  'save_lesson_progress: gravado 40%'
);

-- Chama de novo com 20% (menor) — não deve diminuir
select lives_ok(
  $$select public.save_lesson_progress(
      'de200000-0000-0000-0004-000000000005'::uuid, 20::smallint, 60
    )$$,
  'save_lesson_progress: chamada com valor menor não falha'
);

reset role;

select is(
  (select progress_percent from public.lesson_progress
    where user_id = '00000000-0000-0000-0000-000000000002'
      and lesson_id = 'de200000-0000-0000-0004-000000000005'),
  40::smallint,
  'save_lesson_progress: progress_percent NÃO diminuiu'
);

-- ===========================================================================
-- BLOCO 6 — complete_lesson vídeo < 80% → VIDEO_NOT_WATCHED
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$select public.complete_lesson('de200000-0000-0000-0004-000000000005'::uuid)$$,
  null, null,
  'complete_lesson: video sem 80% → exceção VIDEO_NOT_WATCHED'
);

-- Sobe pra 90% → agora conclui
select lives_ok(
  $$select public.save_lesson_progress(
      'de200000-0000-0000-0004-000000000005'::uuid, 90::smallint, 300
    )$$,
  'save_lesson_progress: sobe para 90%'
);

select lives_ok(
  $$select public.complete_lesson('de200000-0000-0000-0004-000000000005'::uuid)$$,
  'complete_lesson: video >= 80% → conclui sem erro'
);

reset role;

-- ===========================================================================
-- BLOCO 7 — complete_lesson bloqueia task/challenge/survey/game
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$select public.complete_lesson('de200000-0000-0000-0004-000000000001'::uuid)$$,
  null, null,
  'complete_lesson: task → exceção USE_SUBMIT_ACTIVITY'
);

select throws_ok(
  $$select public.complete_lesson('de200000-0000-0000-0004-000000000002'::uuid)$$,
  null, null,
  'complete_lesson: challenge → exceção USE_SUBMIT_ACTIVITY'
);

select throws_ok(
  $$select public.complete_lesson('de200000-0000-0000-0004-000000000003'::uuid)$$,
  null, null,
  'complete_lesson: survey → exceção USE_SUBMIT_ACTIVITY'
);

select throws_ok(
  $$select public.complete_lesson('de200000-0000-0000-0004-000000000004'::uuid)$$,
  null, null,
  'complete_lesson: game → exceção USE_SUBMIT_ACTIVITY'
);

reset role;

-- ===========================================================================
-- BLOCO 8 — RLS: membro NÃO lê lesson_answer_keys
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is(
  (select count(*)::integer from public.lesson_answer_keys
    where lesson_id = 'de200000-0000-0000-0004-000000000004'),
  0,
  'RLS: membro não vê lesson_answer_keys'
);

-- ===========================================================================
-- BLOCO 9 — RLS: membro NÃO insere em activity_submissions diretamente
-- ===========================================================================

select throws_ok(
  $$insert into public.activity_submissions (user_id, lesson_id, kind, payload, status)
    values (
      '00000000-0000-0000-0000-000000000002',
      'de200000-0000-0000-0004-000000000001',
      'task', '{}'::jsonb, 'submitted'
    )$$,
  '42501', null,
  'RLS: membro não insere diretamente em activity_submissions'
);

reset role;

select * from finish();
rollback;
