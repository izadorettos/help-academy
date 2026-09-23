-- =============================================================================
-- Seed — Help Academy
-- Executado por `supabase db reset` após as migrations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Áreas (departments)
-- ---------------------------------------------------------------------------
insert into public.departments (id, name, slug, active) values
  ('00000000-0000-0000-0001-000000000001', 'Geral',           'geral',          true),
  ('00000000-0000-0000-0001-000000000002', 'Suporte',         'suporte',        true),
  ('00000000-0000-0000-0001-000000000003', 'TI',              'ti',             true),
  ('00000000-0000-0000-0001-000000000004', 'Comercial',       'comercial',      true),
  ('00000000-0000-0000-0001-000000000005', 'Operacional',     'operacional',    true),
  ('00000000-0000-0000-0001-000000000006', 'Supervisão',      'supervisao',     true),
  ('00000000-0000-0000-0001-000000000007', 'Entregadores',    'entregadores',   true),
  ('00000000-0000-0000-0001-000000000008', 'Estabelecimentos','estabelecimentos',true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Níveis
-- ---------------------------------------------------------------------------
insert into public.levels (level, min_xp, name) values
  (1,    0, 'Iniciante'),
  (2,  100, 'Aprendiz'),
  (3,  250, 'Avançado'),
  (4,  500, 'Especialista'),
  (5, 1000, 'Mestre')
on conflict (level) do nothing;

-- ---------------------------------------------------------------------------
-- Configurações de gamificação
-- ---------------------------------------------------------------------------
insert into public.gamification_settings (key, value, description) values
  ('xp_lesson_default',    10, 'XP padrão por aula concluída'),
  ('xp_quiz_default',      20, 'XP padrão por quiz aprovado'),
  ('xp_quiz_perfect_bonus',30, 'XP bônus por quiz com 100%'),
  ('xp_module_completed',  50, 'XP por módulo concluído'),
  ('xp_path_completed',   100, 'XP por trilha concluída')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Conquistas
-- ---------------------------------------------------------------------------
insert into public.achievements (id, code, name, description, icon, active, position) values
  ('00000000-0000-0000-0005-000000000001',
   'first_lesson',
   'Primeira Aula',
   'Concluiu sua primeira aula.',
   'book-open',
   true, 1),
  ('00000000-0000-0000-0005-000000000002',
   'first_module',
   'Primeiro Módulo',
   'Concluiu seu primeiro módulo.',
   'layers',
   true, 2),
  ('00000000-0000-0000-0005-000000000003',
   'perfect_quiz',
   'Quiz Perfeito',
   'Acertou 100% em um quiz.',
   'target',
   true, 3),
  ('00000000-0000-0000-0005-000000000004',
   'halfway',
   'Meio Caminho',
   'Atingiu 50% de progresso em alguma trilha.',
   'trending-up',
   true, 4),
  ('00000000-0000-0000-0005-000000000005',
   'path_completed',
   'Trilha Completa',
   'Concluiu uma trilha inteira.',
   'award',
   true, 5)
on conflict (id) do nothing;

-- ===========================================================================
-- DADOS LOCAIS / STAGING SOMENTE — não usar em produção
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Usuários de desenvolvimento
-- Inserção direta no auth.users (apenas para ambiente local)
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data,
  -- GoTrue escaneia estes campos como string (não nullable); precisam ser '' e não NULL.
  -- phone tem unique constraint e default NULL — não incluir aqui.
  confirmation_token, recovery_token,
  email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@help.local',
    crypt('Admin@123', gen_salt('bf')),
    now(), now(), now(),
    '{"name": "Admin Help"}'::jsonb,
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'membro@help.local',
    crypt('Membro@123', gen_salt('bf')),
    now(), now(), now(),
    '{"name": "João Membro"}'::jsonb,
    '', '', '', ''
  )
on conflict (id) do nothing;

-- Promover admin (profile criado pelo trigger handle_new_user acima)
update public.profiles
  set role = 'admin', department_id = '00000000-0000-0000-0001-000000000003'
  where id = '00000000-0000-0000-0000-000000000001';

-- Atribuir área ao membro
update public.profiles
  set department_id = '00000000-0000-0000-0001-000000000001'
  where id = '00000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------------
-- Trilha demo: Onboarding Geral — Conheça a Help
-- ---------------------------------------------------------------------------
insert into public.learning_paths (
  id, title, slug, description, owner_department_id,
  required, sequential, status, position, created_by
) values (
  '00000000-0000-0000-0002-000000000001',
  'Onboarding Geral — Conheça a Help',
  'onboarding-geral',
  'Trilha de boas-vindas para todos os colaboradores da Help Entregas.',
  '00000000-0000-0000-0001-000000000001',
  true, true, 'published', 1,
  '00000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

-- Trilha disponível para a área Geral
insert into public.learning_path_departments (learning_path_id, department_id) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001')
on conflict do nothing;

-- Módulo 1
insert into public.modules (id, learning_path_id, title, description, position) values
  (
    '00000000-0000-0000-0003-000000000001',
    '00000000-0000-0000-0002-000000000001',
    'Bem-vindo à Help Entregas',
    'Conheça nossa história, missão e valores.',
    1
  )
on conflict (id) do nothing;

-- Módulo 2
insert into public.modules (id, learning_path_id, title, description, position) values
  (
    '00000000-0000-0000-0003-000000000002',
    '00000000-0000-0000-0002-000000000001',
    'Processos e Ferramentas',
    'Como utilizamos nossas ferramentas no dia a dia.',
    2
  )
on conflict (id) do nothing;

-- Aulas do módulo 1 (um de cada tipo)
insert into public.lessons (
  id, module_id, title, content_type, content, external_url, file_path,
  estimated_minutes, required, published, position
) values
  -- Texto (Markdown)
  (
    '00000000-0000-0000-0004-000000000001',
    '00000000-0000-0000-0003-000000000001',
    'Nossa história',
    'text',
    E'# Bem-vindo!\n\nA **Help Entregas** nasceu com a missão de conectar estabelecimentos e entregadores de forma simples e eficiente.\n\n## Missão\nFacilitar a logística de última milha com tecnologia e cuidado.\n\n## Valores\n- Agilidade\n- Transparência\n- Colaboração',
    null, null,
    5, true, true, 1
  ),
  -- Vídeo externo
  (
    '00000000-0000-0000-0004-000000000002',
    '00000000-0000-0000-0003-000000000001',
    'Apresentação em vídeo',
    'video',
    null,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    null,
    3, true, true, 2
  ),
  -- Link externo
  (
    '00000000-0000-0000-0004-000000000003',
    '00000000-0000-0000-0003-000000000001',
    'Site institucional',
    'link',
    null,
    'https://helpentregas.com.br',
    null,
    2, false, true, 3
  )
on conflict (id) do nothing;

-- Aulas do módulo 2
insert into public.lessons (
  id, module_id, title, content_type, content, external_url, file_path,
  estimated_minutes, required, published, position
) values
  -- Embed (slides)
  (
    '00000000-0000-0000-0004-000000000004',
    '00000000-0000-0000-0003-000000000002',
    'Plataforma de operações — slides',
    'embed',
    null,
    'https://docs.google.com/presentation/d/example/embed',
    null,
    10, true, true, 1
  ),
  -- Aula com quiz
  (
    '00000000-0000-0000-0004-000000000005',
    '00000000-0000-0000-0003-000000000002',
    'Verificação de conhecimento',
    'text',
    E'# Quiz\n\nResponda as perguntas abaixo para concluir este módulo.',
    null, null,
    5, true, true, 2
  )
on conflict (id) do nothing;

-- Quiz para a última aula
insert into public.quizzes (id, lesson_id, title, passing_score) values
  (
    '00000000-0000-0000-0006-000000000001',
    '00000000-0000-0000-0004-000000000005',
    'Verificação de conhecimento',
    70
  )
on conflict (id) do nothing;

-- Questão 1 (múltipla escolha)
insert into public.quiz_questions (id, quiz_id, question, type, explanation, position) values
  (
    '00000000-0000-0000-0007-000000000001',
    '00000000-0000-0000-0006-000000000001',
    'Qual é a missão da Help Entregas?',
    'multiple_choice',
    'A missão da Help Entregas é facilitar a logística de última milha com tecnologia e cuidado.',
    1
  )
on conflict (id) do nothing;

insert into public.quiz_options (id, question_id, text, is_correct, position) values
  ('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0007-000000000001', 'Facilitar a logística de última milha com tecnologia e cuidado', true,  1),
  ('00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0007-000000000001', 'Vender produtos eletrônicos online',                              false, 2),
  ('00000000-0000-0000-0008-000000000003', '00000000-0000-0000-0007-000000000001', 'Contratar entregadores autônomos',                               false, 3),
  ('00000000-0000-0000-0008-000000000004', '00000000-0000-0000-0007-000000000001', 'Criar aplicativo de transporte de pessoas',                      false, 4)
on conflict (id) do nothing;

-- Questão 2 (verdadeiro/falso)
insert into public.quiz_questions (id, quiz_id, question, type, explanation, position) values
  (
    '00000000-0000-0000-0007-000000000002',
    '00000000-0000-0000-0006-000000000001',
    'A Help Entregas valoriza a transparência como um de seus princípios.',
    'true_false',
    'Sim, transparência é um dos valores centrais da Help Entregas.',
    2
  )
on conflict (id) do nothing;

insert into public.quiz_options (id, question_id, text, is_correct, position) values
  ('00000000-0000-0000-0008-000000000005', '00000000-0000-0000-0007-000000000002', 'Verdadeiro', true,  1),
  ('00000000-0000-0000-0008-000000000006', '00000000-0000-0000-0007-000000000002', 'Falso',      false, 2)
on conflict (id) do nothing;
