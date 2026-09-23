-- Testes pgTAP — Fase 4: Políticas RLS
-- Cobre quatro perfis: anon, membro-A (tem acesso à trilha), membro-B (sem acesso), admin.
--
-- Pattern: SET LOCAL ROLE + set_config(request.jwt.claims) para simular auth.uid().
-- Após cada bloco: RESET ROLE para voltar ao superuser e poder chamar pgTAP helpers.
--
-- IDs usados:
--   admin:    00000000-0000-0000-0000-000000000001
--   membro-A: 00000000-0000-0000-0000-000000000002  (área Geral, acessa Onboarding)
--   membro-B: 00000000-0000-0000-0000-000000000099  (área TI, sem acesso à trilha demo)
-- Trilha:     00000000-0000-0000-0002-000000000001
-- Aulas:      0004/..001 (mod1 pos1), 0004/..002 (mod1 pos2, sequential bloqueada)

begin;
select no_plan();

-- Cria membro-B na área TI
insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'membro_b@help.local',
  crypt('Membro@123', gen_salt('bf')),
  now(), now(), now(),
  '{"name": "Maria Membro B"}'::jsonb
) on conflict (id) do nothing;

update public.profiles
  set department_id = '00000000-0000-0000-0001-000000000003'
  where id = '00000000-0000-0000-0000-000000000099';

-- ===========================================================================
-- BLOCO 1: ANON
-- Anon tem revoke all — cada query lança "permission denied" (42501).
-- ===========================================================================

set local role anon;

select throws_ok(
  $$select * from public.profiles limit 1$$,
  '42501', null,
  'anon: permission denied em profiles'
);
select throws_ok(
  $$select * from public.departments limit 1$$,
  '42501', null,
  'anon: permission denied em departments'
);
select throws_ok(
  $$select * from public.learning_paths limit 1$$,
  '42501', null,
  'anon: permission denied em learning_paths'
);
select throws_ok(
  $$select * from public.levels limit 1$$,
  '42501', null,
  'anon: permission denied em levels'
);
select throws_ok(
  $$select * from public.achievements limit 1$$,
  '42501', null,
  'anon: permission denied em achievements'
);

reset role;

-- ===========================================================================
-- BLOCO 2: MEMBRO-A — área Geral, acessa Onboarding
-- ===========================================================================

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- Lê próprio perfil
select ok(
  (select count(*)::integer from public.profiles
   where id = '00000000-0000-0000-0000-000000000002') = 1,
  'membro-A: lê próprio perfil'
);
-- Não vê perfil de outro usuário
select is(
  (select count(*)::integer from public.profiles
   where id = '00000000-0000-0000-0000-000000000001'),
  0,
  'membro-A: não lê perfil do admin'
);
-- Lê departments
select ok(
  (select count(*)::integer from public.departments) > 0,
  'membro-A: lê departments'
);
-- Lê levels
select ok(
  (select count(*)::integer from public.levels) > 0,
  'membro-A: lê levels'
);
-- Lê achievements
select ok(
  (select count(*)::integer from public.achievements) > 0,
  'membro-A: lê achievements'
);
-- Lê trilha da sua área
select ok(
  (select count(*)::integer from public.learning_paths
   where id = '00000000-0000-0000-0002-000000000001') = 1,
  'membro-A: lê trilha publicada da sua área'
);
-- Lê módulos da trilha
select ok(
  (select count(*)::integer from public.modules
   where learning_path_id = '00000000-0000-0000-0002-000000000001') > 0,
  'membro-A: lê módulos da trilha'
);
-- Lê aulas publicadas da trilha
select ok(
  (select count(*)::integer from public.lessons
   where id = '00000000-0000-0000-0004-000000000001') = 1,
  'membro-A: lê aula publicada'
);
-- NÃO lê quiz_options (is_correct nunca exposto ao membro)
select is(
  (select count(*)::integer from public.quiz_options),
  0,
  'membro-A: não lê quiz_options'
);
-- NÃO insere lesson_progress diretamente
select throws_ok(
  $$insert into public.lesson_progress (user_id, lesson_id)
    values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0004-000000000001')$$,
  null, null,
  'membro-A: não insere lesson_progress diretamente'
);
-- NÃO insere xp_transactions diretamente
select throws_ok(
  $$insert into public.xp_transactions (user_id, amount, reason)
    values ('00000000-0000-0000-0000-000000000002', 500, 'lesson_completed')$$,
  null, null,
  'membro-A: não insere xp_transactions diretamente'
);
-- NÃO altera role do próprio perfil (trigger protege)
select throws_ok(
  $$update public.profiles set role = 'admin'
    where id = '00000000-0000-0000-0000-000000000002'$$,
  null, null,
  'membro-A: não altera próprio role'
);
-- NÃO insere learning_path
select throws_ok(
  $$insert into public.learning_paths (title, slug, owner_department_id, created_by)
    values ('Pirata','pirata','00000000-0000-0000-0001-000000000001',
            '00000000-0000-0000-0000-000000000002')$$,
  null, null,
  'membro-A: não insere learning_path'
);

reset role;

-- ===========================================================================
-- BLOCO 3: MEMBRO-B — área TI, sem acesso à trilha demo
-- ===========================================================================

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated"}', true);

select ok(
  (select count(*)::integer from public.profiles
   where id = '00000000-0000-0000-0000-000000000099') = 1,
  'membro-B: lê próprio perfil'
);
select is(
  (select count(*)::integer from public.learning_paths
   where id = '00000000-0000-0000-0002-000000000001'),
  0,
  'membro-B: não lê trilha de outra área'
);
select is(
  (select count(*)::integer from public.modules
   where learning_path_id = '00000000-0000-0000-0002-000000000001'),
  0,
  'membro-B: não lê módulos de trilha sem acesso'
);
select is(
  (select count(*)::integer from public.lessons
   where id = '00000000-0000-0000-0004-000000000001'),
  0,
  'membro-B: não lê aulas de trilha sem acesso'
);

reset role;

-- ===========================================================================
-- BLOCO 4: ADMIN
-- ===========================================================================

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select ok(
  (select count(*)::integer from public.profiles) >= 3,
  'admin: lê todos os profiles'
);
select ok(
  (select count(*)::integer from public.learning_paths) > 0,
  'admin: lê todas as trilhas'
);
select ok(
  (select count(*)::integer from public.quiz_options) > 0,
  'admin: lê quiz_options'
);
select lives_ok(
  $$insert into public.departments (name, slug, active)
    values ('Teste RLS', 'teste-rls', false)$$,
  'admin: insere department'
);
select lives_ok(
  $$update public.departments set active = false where slug = 'teste-rls'$$,
  'admin: atualiza department'
);
select lives_ok(
  $$update public.profiles set role = 'member'
    where id = '00000000-0000-0000-0000-000000000002'$$,
  'admin: atualiza role de outro perfil'
);
select lives_ok(
  $$insert into public.learning_paths (title, slug, owner_department_id, created_by, status)
    values ('Trilha Teste Admin','trilha-teste-admin',
            '00000000-0000-0000-0001-000000000001',
            '00000000-0000-0000-0000-000000000001','draft')$$,
  'admin: insere learning_path draft'
);
select lives_ok(
  $$delete from public.learning_paths where slug = 'trilha-teste-admin'$$,
  'admin: deleta learning_path draft sem progresso'
);
select lives_ok(
  $$select count(*) from public.lesson_progress$$,
  'admin: lê lesson_progress'
);
select lives_ok(
  $$select count(*) from public.xp_transactions$$,
  'admin: lê xp_transactions'
);

reset role;

-- ===========================================================================
-- BLOCO 5: Funções auxiliares
-- ===========================================================================

-- can_access_path e can_access_lesson são SECURITY DEFINER — chamáveis sem role especial
select ok(
  public.can_access_path('00000000-0000-0000-0002-000000000001',
                          '00000000-0000-0000-0000-000000000002'),
  'can_access_path: membro-A tem acesso à trilha da sua área'
);
select ok(
  not public.can_access_path('00000000-0000-0000-0002-000000000001',
                              '00000000-0000-0000-0000-000000000099'),
  'can_access_path: membro-B não tem acesso à trilha de outra área'
);
select ok(
  public.can_access_lesson('00000000-0000-0000-0004-000000000001',
                            '00000000-0000-0000-0000-000000000002'),
  'can_access_lesson: membro-A acessa aula da sua trilha'
);
select ok(
  not public.can_access_lesson('00000000-0000-0000-0004-000000000001',
                                '00000000-0000-0000-0000-000000000099'),
  'can_access_lesson: membro-B não acessa aula de trilha sem acesso'
);

-- is_lesson_unlocked
select ok(
  public.is_lesson_unlocked('00000000-0000-0000-0004-000000000001',
                             '00000000-0000-0000-0000-000000000002'),
  'is_lesson_unlocked: primeira aula desbloqueada (sem pré-requisitos pendentes)'
);
select ok(
  not public.is_lesson_unlocked('00000000-0000-0000-0004-000000000002',
                                 '00000000-0000-0000-0000-000000000002'),
  'is_lesson_unlocked: segunda aula bloqueada sem completar a primeira'
);

-- get_setting
select is(public.get_setting('xp_lesson_default'), 10, 'get_setting: xp_lesson_default = 10');
select is(public.get_setting('xp_quiz_default'),    20, 'get_setting: xp_quiz_default = 20');
select throws_ok(
  $$select public.get_setting('chave_inexistente')$$,
  null, null,
  'get_setting: lança exceção para chave inexistente'
);

-- level_for_xp
select is((select level from public.level_for_xp(0)),    1, 'level_for_xp: 0 XP = nível 1');
select is((select level from public.level_for_xp(100)),  2, 'level_for_xp: 100 XP = nível 2');
select is((select level from public.level_for_xp(1000)), 5, 'level_for_xp: 1000 XP = nível 5');

select * from finish();
rollback;
