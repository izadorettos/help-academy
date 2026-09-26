-- Testes pgTAP — Fase 23: RLS de tutorials
-- IDs usados (do seed):
--   admin:   00000000-0000-0000-0000-000000000001
--   membro:  00000000-0000-0000-0000-000000000002
-- Depende do seed básico (profiles, auth.users já criados).

begin;
select no_plan();

-- ============================================================================
-- Setup: criar dados de teste para tutorials
-- ============================================================================

-- Categoria de teste
insert into public.help_categories (id, slug, name, icon, sort_order)
values ('00000000-0000-0000-0010-000000000001', 'teste-cat', 'Categoria Teste', 'BookOpen', 99)
on conflict (slug) do nothing;

-- Público de teste
insert into public.help_audiences (id, slug, name, sort_order)
values ('00000000-0000-0000-0010-000000000002', 'teste-pub', 'Público Teste', 99)
on conflict (slug) do nothing;

-- Série de teste
insert into public.help_series (id, slug, name)
values ('00000000-0000-0000-0010-000000000003', 'teste-serie', 'Série Teste')
on conflict (slug) do nothing;

-- Tutorial publicado (visibility = authenticated)
insert into public.tutorials (
  id, slug, title, description, category_id, content_type,
  file_url, is_published, visibility, last_content_update, freshness
) values (
  '00000000-0000-0000-0010-000000000004',
  'tutorial-publicado',
  'Tutorial Publicado',
  'Descrição do tutorial publicado para testes.',
  '00000000-0000-0000-0010-000000000001',
  'pdf',
  'storage:tutorials/tutorial-publicado/file.pdf',
  true,
  'authenticated',
  '2026-09-01',
  'current'
) on conflict (slug) do nothing;

-- Tutorial publicado com visibility = 'public'
insert into public.tutorials (
  id, slug, title, description, category_id, content_type,
  file_url, is_published, visibility, last_content_update, freshness
) values (
  '00000000-0000-0000-0010-000000000005',
  'tutorial-publico',
  'Tutorial Público',
  'Descrição do tutorial público para testes.',
  '00000000-0000-0000-0010-000000000001',
  'image',
  'storage:tutorials/tutorial-publico/cover.jpg',
  true,
  'public',
  '2026-09-01',
  'current'
) on conflict (slug) do nothing;

-- Tutorial não publicado
insert into public.tutorials (
  id, slug, title, description, category_id, content_type,
  file_url, is_published, visibility, last_content_update, freshness
) values (
  '00000000-0000-0000-0010-000000000006',
  'tutorial-rascunho',
  'Tutorial Rascunho',
  'Descrição do tutorial em rascunho para testes.',
  '00000000-0000-0000-0010-000000000001',
  'pdf',
  'storage:tutorials/tutorial-rascunho/file.pdf',
  false,
  'authenticated',
  '2026-09-01',
  'current'
) on conflict (slug) do nothing;

-- Tutorial com série e posição duplicada (para constraint test)
insert into public.tutorials (
  id, slug, title, description, category_id, content_type,
  file_url, is_published, visibility, last_content_update, freshness,
  series_id, series_position
) values (
  '00000000-0000-0000-0010-000000000007',
  'tutorial-serie-1',
  'Tutorial Série Posição 1',
  'Tutorial na posição 1 da série teste.',
  '00000000-0000-0000-0010-000000000001',
  'pdf',
  'storage:tutorials/tutorial-serie-1/file.pdf',
  true,
  'authenticated',
  '2026-09-01',
  'current',
  '00000000-0000-0000-0010-000000000003',
  1
) on conflict (slug) do nothing;

-- Associação de públicos
insert into public.tutorial_audiences (tutorial_id, audience_id)
values
  ('00000000-0000-0000-0010-000000000004', '00000000-0000-0000-0010-000000000002'),
  ('00000000-0000-0000-0010-000000000005', '00000000-0000-0000-0010-000000000002')
on conflict do nothing;

-- ============================================================================
-- BLOCO 1: ANON
-- ============================================================================

set local role anon;

select ok(
  (select count(*) from public.tutorials
   where is_published = true and visibility = 'public') > 0,
  'anon: vê tutoriais públicos publicados'
);

select ok(
  (select count(*) from public.tutorials
   where is_published = true and visibility = 'authenticated') = 0,
  'anon: não vê tutoriais autenticados'
);

select ok(
  (select count(*) from public.tutorials where is_published = false) = 0,
  'anon: não vê tutoriais não publicados'
);

select throws_ok(
  $$insert into public.tutorials (
      slug, title, description, category_id, content_type,
      file_url, is_published, visibility, last_content_update, freshness
    ) values (
      'anon-insert', 'Test', 'Desc test anon insert',
      '00000000-0000-0000-0010-000000000001', 'pdf',
      'storage:tutorials/test/f.pdf', false, 'authenticated', '2026-01-01', 'current'
    )$$,
  null, null,
  'anon: não pode inserir tutorials'
);

-- help_audiences — anon pode ler
select ok(
  (select count(*) from public.help_audiences) > 0,
  'anon: pode ler help_audiences'
);

-- help_categories — anon pode ler
select ok(
  (select count(*) from public.help_categories) > 0,
  'anon: pode ler help_categories'
);

reset role;

-- ============================================================================
-- BLOCO 2: MEMBRO autenticado ativo
-- ============================================================================

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select ok(
  (select count(*) from public.tutorials where slug = 'tutorial-publicado') = 1,
  'membro: vê tutorial publicado authenticated'
);

select ok(
  (select count(*) from public.tutorials where slug = 'tutorial-publico') = 1,
  'membro: vê tutorial publicado public'
);

select ok(
  (select count(*) from public.tutorials where is_published = false) = 0,
  'membro: não vê tutoriais não publicados'
);

select throws_ok(
  $$insert into public.tutorials (
      slug, title, description, category_id, content_type,
      file_url, is_published, visibility, last_content_update, freshness
    ) values (
      'membro-insert', 'Test', 'Desc test membro insert',
      '00000000-0000-0000-0010-000000000001', 'pdf',
      'storage:tutorials/membro-insert/f.pdf', false, 'authenticated', '2026-01-01', 'current'
    )$$,
  null, null,
  'membro: não pode inserir tutorial'
);

select throws_ok(
  $$update public.tutorials set title = 'Hacked' where id = '00000000-0000-0000-0010-000000000004'$$,
  null, null,
  'membro: não pode atualizar tutorial'
);

select throws_ok(
  $$delete from public.tutorials where id = '00000000-0000-0000-0010-000000000004'$$,
  null, null,
  'membro: não pode excluir tutorial'
);

reset role;

-- ============================================================================
-- BLOCO 3: ADMIN
-- ============================================================================

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Admin vê todos
select ok(
  (select count(*) from public.tutorials where slug = 'tutorial-rascunho') = 1,
  'admin: vê tutorial não publicado'
);

-- Admin pode inserir
select lives_ok(
  $$insert into public.tutorials (
      slug, title, description, category_id, content_type,
      file_url, is_published, visibility, last_content_update, freshness
    ) values (
      'admin-insert-test', 'Admin Test', 'Admin insert test desc ok.',
      '00000000-0000-0000-0010-000000000001', 'pdf',
      'storage:tutorials/admin-insert-test/f.pdf',
      false, 'authenticated', '2026-01-01', 'current'
    )$$,
  'admin: pode inserir tutorial'
);

-- Admin pode atualizar
select lives_ok(
  $$update public.tutorials set title = 'Admin Updated' where slug = 'admin-insert-test'$$,
  'admin: pode atualizar tutorial'
);

-- Admin pode deletar
select lives_ok(
  $$delete from public.tutorials where slug = 'admin-insert-test'$$,
  'admin: pode excluir tutorial'
);

reset role;

-- ============================================================================
-- BLOCO 4: Constraints
-- ============================================================================

-- Slug uniqueness
select throws_ok(
  $$insert into public.tutorials (
      slug, title, description, category_id, content_type,
      file_url, is_published, visibility, last_content_update, freshness
    ) values (
      'tutorial-publicado', 'Duplicado', 'Descrição duplicada para teste de constraint.',
      '00000000-0000-0000-0010-000000000001', 'pdf',
      'storage:tutorials/dup/f.pdf', false, 'authenticated', '2026-01-01', 'current'
    )$$,
  '23505', null,
  'constraint: slug único'
);

-- Series position uniqueness
select throws_ok(
  $$insert into public.tutorials (
      slug, title, description, category_id, content_type,
      file_url, is_published, visibility, last_content_update, freshness,
      series_id, series_position
    ) values (
      'tutorial-serie-1-dup', 'Série Dup', 'Descrição série duplicada para teste de constraint.',
      '00000000-0000-0000-0010-000000000001', 'pdf',
      'storage:tutorials/dup-s/f.pdf', false, 'authenticated', '2026-01-01', 'current',
      '00000000-0000-0000-0010-000000000003', 1
    )$$,
  '23505', null,
  'constraint: posição na série única'
);

-- Check: video sem video_url deve falhar
select throws_ok(
  $$insert into public.tutorials (
      slug, title, description, category_id, content_type,
      is_published, visibility, last_content_update, freshness
    ) values (
      'video-sem-url', 'Vídeo sem URL', 'Descrição vídeo sem url para teste.',
      '00000000-0000-0000-0010-000000000001', 'video',
      false, 'authenticated', '2026-01-01', 'current'
    )$$,
  '23514', null,
  'constraint: video sem video_url falha'
);

select * from finish();
rollback;
