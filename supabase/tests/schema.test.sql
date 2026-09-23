-- Testes pgTAP — Fase 3: Schema
-- Verifica existência de tabelas, colunas, constraints e que o seed aplicou corretamente.

begin;

select no_plan();

-- ===========================================================================
-- Tabelas existem
-- ===========================================================================
select has_table('public', 'departments',              'departments existe');
select has_table('public', 'profiles',                 'profiles existe');
select has_table('public', 'learning_paths',           'learning_paths existe');
select has_table('public', 'learning_path_departments','learning_path_departments existe');
select has_table('public', 'modules',                  'modules existe');
select has_table('public', 'lessons',                  'lessons existe');
select has_table('public', 'quizzes',                  'quizzes existe');
select has_table('public', 'quiz_questions',           'quiz_questions existe');
select has_table('public', 'quiz_options',             'quiz_options existe');
select has_table('public', 'user_learning_paths',      'user_learning_paths existe');
select has_table('public', 'lesson_progress',          'lesson_progress existe');
select has_table('public', 'module_completions',       'module_completions existe');
select has_table('public', 'quiz_attempts',            'quiz_attempts existe');
select has_table('public', 'quiz_attempt_answers',     'quiz_attempt_answers existe');
select has_table('public', 'gamification_settings',    'gamification_settings existe');
select has_table('public', 'levels',                   'levels existe');
select has_table('public', 'xp_transactions',          'xp_transactions existe');
select has_table('public', 'achievements',             'achievements existe');
select has_table('public', 'user_achievements',        'user_achievements existe');

-- ===========================================================================
-- RLS habilitado
-- ===========================================================================
select ok(
  (select relrowsecurity from pg_class where relname = 'profiles' and relnamespace = 'public'::regnamespace),
  'RLS habilitado em profiles'
);
select ok(
  (select relrowsecurity from pg_class where relname = 'lessons' and relnamespace = 'public'::regnamespace),
  'RLS habilitado em lessons'
);
select ok(
  (select relrowsecurity from pg_class where relname = 'quiz_options' and relnamespace = 'public'::regnamespace),
  'RLS habilitado em quiz_options'
);
select ok(
  (select relrowsecurity from pg_class where relname = 'xp_transactions' and relnamespace = 'public'::regnamespace),
  'RLS habilitado em xp_transactions'
);

-- ===========================================================================
-- Triggers existem
-- ===========================================================================
select has_trigger('public', 'departments',    'set_updated_at', 'trigger set_updated_at em departments');
select has_trigger('public', 'profiles',       'set_updated_at', 'trigger set_updated_at em profiles');
select has_trigger('public', 'learning_paths', 'set_updated_at', 'trigger set_updated_at em learning_paths');
select has_trigger('public', 'profiles',       'protect_profile_columns', 'trigger protect_profile_columns em profiles');
select has_trigger('public', 'learning_paths', 'set_published_at',        'trigger set_published_at em learning_paths');

-- ===========================================================================
-- Seed: dados de referência
-- ===========================================================================
select is(
  (select count(*)::integer from public.departments),
  8,
  'seed: 8 áreas inseridas'
);

select is(
  (select count(*)::integer from public.levels),
  5,
  'seed: 5 níveis inseridos'
);

select is(
  (select count(*)::integer from public.gamification_settings),
  5,
  'seed: 5 configurações de gamificação'
);

select is(
  (select count(*)::integer from public.achievements),
  5,
  'seed: 5 conquistas inseridas'
);

-- ===========================================================================
-- Trigger handle_new_user: usuário Auth cria profile
-- ===========================================================================
select ok(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000001') > 0,
  'handle_new_user: profile do admin criado pelo trigger'
);

select ok(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000002') > 0,
  'handle_new_user: profile do membro criado pelo trigger'
);

-- Admin promovido corretamente
select is(
  (select role from public.profiles where id = '00000000-0000-0000-0000-000000000001'),
  'admin'::public.user_role,
  'seed: admin tem role = admin'
);

-- ===========================================================================
-- Constraint única de opção correta (no máximo uma por questão)
-- ===========================================================================
select throws_ok(
  $$
    insert into public.quiz_options (question_id, text, is_correct, position)
    values (
      '00000000-0000-0000-0007-000000000001',
      'Segunda opção correta',
      true,
      99
    )
  $$,
  '23505',
  null,
  'Constraint quiz_options_one_correct impede segunda opção correta'
);

select * from finish();
rollback;
