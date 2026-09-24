-- Testes pgTAP — Fase 21: remoção da demonstração
--
-- Este teste roda contra o banco SEM a demonstração carregada.
-- Se você acabou de rodar `npm run demo:seed`, rode `npm run demo:remove` antes.
-- O CI usa `npx supabase db reset` (não carrega a demo), então passa por padrão.

begin;
select plan(7);

-- 1. Sem áreas com is_demo = true.
select ok(
  not exists(select 1 from public.departments where is_demo = true),
  'sem áreas de demonstração após remoção'
);

-- 2. Sem trilhas com is_demo = true.
select ok(
  not exists(select 1 from public.learning_paths where is_demo = true),
  'sem trilhas de demonstração após remoção'
);

-- 3. Sem profiles com is_demo = true.
select ok(
  not exists(select 1 from public.profiles where is_demo = true),
  'sem profiles de demonstração após remoção'
);

-- 4. Sem aulas em trilhas demo.
select ok(
  not exists(
    select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.learning_paths p on p.id = m.learning_path_id
     where p.is_demo = true
  ),
  'sem aulas em trilhas demo após remoção'
);

-- 5. Sem usuário demo no auth.
select ok(
  not exists(select 1 from auth.users where email = 'demo@help.local'),
  'sem usuário demo em auth após remoção'
);

-- 6. Sem submissões do usuário demo (UUID fixo).
select ok(
  not exists(
    select 1 from public.activity_submissions
     where user_id = 'de000000-0000-0000-0000-000000000001'::uuid
  ),
  'sem submissões do usuário demo após remoção'
);

-- 7. Sem lesson_answer_keys ligadas a aulas do prefixo demo.
select ok(
  not exists(
    select 1 from public.lesson_answer_keys
     where lesson_id::text like 'de000000-%'
  ),
  'sem gabaritos demo após remoção'
);

select * from finish();
rollback;
