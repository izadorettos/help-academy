-- ============================================================================
-- Demo — Conhecendo a HELP
-- Fase 21. Dados isolados (is_demo = true, prefixo UUID de000000-).
-- Removíveis via supabase/demo/remove.sql.
-- Todo conteúdo com palavras intencionalmente travadas (aula de voz e tom,
-- game de "diga ou não diga", desafio) fica dentro de blocos
-- /* vocab-allow */ ... /* /vocab-allow */ para o teste de vocabulário
-- ignorar (esse conteúdo ensina a evitar essas palavras).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Área "Demonstração" (is_demo)
-- ---------------------------------------------------------------------------
insert into public.departments (id, name, slug, active, is_demo) values
  ('de000000-0000-0000-0001-000000000001', 'Demonstração', 'demonstracao', true, true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Trilha "Conhecendo a HELP"
-- ---------------------------------------------------------------------------
insert into public.learning_paths (
  id, title, slug, description, owner_department_id,
  required, sequential, status, position, is_demo, created_by
) values (
  'de000000-0000-0000-0002-000000000001',
  'Conhecendo a HELP',
  'conhecendo-a-help',
  'Sete atividades para entender como a Help funciona, como a gente fala e como a operação acontece na rua. Leva cerca de 45 minutos.',
  'de000000-0000-0000-0001-000000000001',
  true, true, 'published', 900, true,
  null
) on conflict (id) do nothing;

-- Trilha disponível para a área Demonstração
insert into public.learning_path_departments (learning_path_id, department_id) values
  ('de000000-0000-0000-0002-000000000001', 'de000000-0000-0000-0001-000000000001')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Módulos
-- ---------------------------------------------------------------------------
insert into public.modules (id, learning_path_id, title, description, position) values
  ('de000000-0000-0000-0003-000000000001',
   'de000000-0000-0000-0002-000000000001',
   'A Help por dentro',
   'História, propósito e valores.', 1),
  ('de000000-0000-0000-0003-000000000002',
   'de000000-0000-0000-0002-000000000001',
   'Operação na prática',
   'Como a jornada do pedido acontece na rua.', 2),
  ('de000000-0000-0000-0003-000000000003',
   'de000000-0000-0000-0002-000000000001',
   'Mão na massa',
   'Tarefa, desafio e questionário.', 3)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Aula 1 — vídeo "Se é para ajudar, ajudamos com gosto"
-- ---------------------------------------------------------------------------
insert into public.lessons (
  id, module_id, title, description, content_type, content, external_url, file_path,
  estimated_minutes, xp_reward, required, published, position, config
) values (
  'de000000-0000-0000-0004-000000000001',
  'de000000-0000-0000-0003-000000000001',
  'Se é para ajudar, ajudamos com gosto',
  'Seis minutos com a história da Help, o que ela promete e como a operação funciona no dia a dia.',
  'video',
  null, null, null,
  6, 10, true, true, 1,
  jsonb_build_object(
    'provider', 'placeholder',
    'duration_seconds', 360,
    'chapters', jsonb_build_array(
      jsonb_build_object('label', 'Quem somos', 'seconds', 0),
      jsonb_build_object('label', 'Propósito, visão e promessa', 'seconds', 80),
      jsonb_build_object('label', 'Quatro valores', 'seconds', 170),
      jsonb_build_object('label', 'Como a operação funciona', 'seconds', 250),
      jsonb_build_object('label', 'Seu papel aqui', 'seconds', 320)
    ),
    'transcript', E'00:00 · Quem somos — A Help nasceu em 2017, em Campo Grande, Mato Grosso do Sul. Nasceu da operação: primeiro a gente entregou, depois organizou o que funcionava. Hoje são 58 cidades em 15 estados.\n\n01:20 · Propósito, visão e promessa — Nosso propósito é tirar a entrega do caminho de quem vende. A visão é ser a operação de last mile mais auditável do Brasil: não a maior de discurso, a que consegue provar cada entrega. E a promessa cabe numa frase: você pilota, a gente cuida do resto.\n\n02:50 · Quatro valores — Prova antes de adjetivo. De igual para igual, com a rede e com o lojista. O ativo é gente: parceiro com rosto, nome e cidade. E suporte humano 24/7, com nome de gente do outro lado.\n\n04:10 · Como a operação funciona — Uma rede de mais de 80 mil entregadores cadastrados, SLA por modalidade e QR de entrega com foto e geotag em cada pedido. O prazo Help medido porta a porta nos últimos 15 dias foi de 45 minutos.\n\n05:20 · Seu papel aqui — Tudo o que você aprender nesta trilha serve para uma coisa: ajudar com gosto, mostrando o número.'
  )
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Aula 2 — texto "Como a gente fala: voz, tom e vocabulário"
-- Contém intencionalmente palavras travadas (bloco marcado para o teste).
-- ---------------------------------------------------------------------------
/* vocab-allow */
insert into public.lessons (
  id, module_id, title, description, content_type, content, external_url, file_path,
  estimated_minutes, xp_reward, required, published, position, config
) values (
  'de000000-0000-0000-0004-000000000002',
  'de000000-0000-0000-0003-000000000001',
  'Como a gente fala: voz, tom e vocabulário',
  'Um tom para cada público, a régua dos números e a lista de palavras que ficam de fora.',
  'text',
  E'## O eixo não muda\n\nA Help fala do mesmo jeito em qualquer canal: **direta, calorosa sem ser íntima, específica e adulta.** Frase curta, ponto final. O que muda de um público para outro é o volume de prova — nunca a personalidade.\n\n> [!NOTE]\n> Arquétipo da marca: **prestativo + realista**. A gente ajuda com gosto, mas mostra o número. O calor nunca substitui a prova; a prova nunca esfria a frase.\n\n## Um tom para cada público\n\n| Público | Como soa | Exemplo |\n|---|---|---|\n| Rede | Mais prova, menos calor | "Contrato único, 58 cidades, SLA por modalidade e QR auditável em cada entrega." |\n| Lojista | Mais calor, segunda pessoa | "Você pilota, a gente cuida do resto." |\n| Entregador | Autonomia sempre | "Rode na sua região, no seu tempo." |\n| Institucional | Primeira pessoa do plural, sem superlativo | "Feita por gente, pra gente. Desde 2017." |\n\n## Prova antes de adjetivo\n\nNenhum número aparece sozinho. Todo número tem **régua** (o que foi medido) e **janela** (quando).\n\n- Certo: "45 minutos de prazo Help, medido porta a porta nos últimos 15 dias."\n- Errado: "Entregas super-rápidas."\n\n> [!TIP]\n> Antes de enviar uma mensagem com número, pergunte: medido como? em qual período?\n\n## Palavras que a gente não usa\n\n<!-- vocab-allow -->\nAlgumas palavras sugerem uma relação de subordinação com a rede de parceiros. Elas não entram em nenhum material, para nenhum público.\n\n> [!WARNING]\n> Nunca use: colaborador, funcionário, entregador dedicado, frota própria, nossos motoboys, equipe fixa, escala.\n> No lugar: entregador parceiro, rede de autônomos, entregadores cadastrados, capacidade elástica com SLA.\n<!-- /vocab-allow -->\n\nAdjetivos como "líder", "inovador" ou "melhor do mercado" só aparecem com a prova ao lado. Na dúvida, troque o adjetivo pelo número.\n\n## Formato brasileiro, sempre\n\n- Moeda: R$ 1.549,70\n- Distância: 45,8 km\n- Hora: 15:00 (sem misturar com 13h20 na mesma peça)\n\n> [!IMPORTANT]\n> Resumo para levar: fale de igual para igual, mostre o número com régua e janela, e deixe de fora as palavras da lista.',
  null, null,
  8, 10, true, true, 2,
  '{}'::jsonb
) on conflict (id) do nothing;
/* /vocab-allow */

-- ---------------------------------------------------------------------------
-- Aula 3 — texto + quiz "Quiz: a jornada do pedido"
-- ---------------------------------------------------------------------------
insert into public.lessons (
  id, module_id, title, description, content_type, content, external_url, file_path,
  estimated_minutes, xp_reward, required, published, position, config
) values (
  'de000000-0000-0000-0004-000000000003',
  'de000000-0000-0000-0003-000000000002',
  'Quiz: a jornada do pedido',
  'Cinco perguntas sobre o que você viu até aqui. Nota mínima: 70%.',
  'text',
  E'# Como funciona\n\nCinco perguntas sobre o que você viu até aqui. Nota mínima: **70%**. Pode tentar de novo quantas vezes precisar.\n\nCada resposta traz uma explicação curta ao final.',
  null, null,
  5, 10, true, true, 1,
  '{}'::jsonb
) on conflict (id) do nothing;

-- Quiz da aula 3
insert into public.quizzes (id, lesson_id, title, passing_score) values
  ('de000000-0000-0000-0006-000000000001',
   'de000000-0000-0000-0004-000000000003',
   'Quiz: a jornada do pedido',
   70)
on conflict (id) do nothing;

-- Questões (5)
insert into public.quiz_questions (id, quiz_id, question, type, explanation, position) values
  ('de000000-0000-0000-0006-000000000101',
   'de000000-0000-0000-0006-000000000001',
   'O que a promessa "Você pilota, a gente cuida do resto" diz ao lojista?',
   'multiple_choice',
   'O lojista pilota o negócio. A Help cuida do último quilômetro — com rede, método e auditoria.',
   1),
  ('de000000-0000-0000-0006-000000000102',
   'de000000-0000-0000-0006-000000000001',
   'Um pedido aguardando liberação na loja fica em qual status?',
   'multiple_choice',
   'Enquanto o pedido não sai, ele está em espera. Em rota é quando o parceiro já está com ele.',
   2),
  ('de000000-0000-0000-0006-000000000103',
   'de000000-0000-0000-0006-000000000001',
   'Como a entrega é comprovada?',
   'multiple_choice',
   'O QR registra foto e localização no ato — e funciona mesmo quando a rede do celular cai.',
   3),
  ('de000000-0000-0000-0006-000000000104',
   'de000000-0000-0000-0006-000000000001',
   'O suporte humano da Help funciona apenas em horário comercial.',
   'true_false',
   'Suporte humano 24/7, com nome de gente do outro lado. Não é diferencial, é o padrão.',
   4),
  ('de000000-0000-0000-0006-000000000105',
   'de000000-0000-0000-0006-000000000001',
   'Qual frase segue a regra "prova antes de adjetivo"?',
   'multiple_choice',
   'Número com régua (porta a porta) e janela (últimos 15 dias). Os outros são adjetivo sem prova.',
   5)
on conflict (id) do nothing;

-- Opções (4 por múltipla escolha, 2 por V/F). Uma correta por questão.
insert into public.quiz_options (id, question_id, text, is_correct, position) values
  -- Q1
  ('de000000-0000-0000-0007-000000000101',
   'de000000-0000-0000-0006-000000000101',
   'Que a Help assume a gestão da loja', false, 1),
  ('de000000-0000-0000-0007-000000000102',
   'de000000-0000-0000-0006-000000000101',
   'Que o lojista cuida do negócio e a Help cuida do último quilômetro', true, 2),
  ('de000000-0000-0000-0007-000000000103',
   'de000000-0000-0000-0006-000000000101',
   'Que o lojista precisa acompanhar cada rota', false, 3),
  ('de000000-0000-0000-0007-000000000104',
   'de000000-0000-0000-0006-000000000101',
   'Que a entrega é gratuita', false, 4),
  -- Q2
  ('de000000-0000-0000-0007-000000000201',
   'de000000-0000-0000-0006-000000000102',
   'Coleta / em rota', false, 1),
  ('de000000-0000-0000-0007-000000000202',
   'de000000-0000-0000-0006-000000000102',
   'Espera / parada', true, 2),
  ('de000000-0000-0000-0007-000000000203',
   'de000000-0000-0000-0006-000000000102',
   'Destino / concluído', false, 3),
  ('de000000-0000-0000-0007-000000000204',
   'de000000-0000-0000-0006-000000000102',
   'Recusado / perdido', false, 4),
  -- Q3
  ('de000000-0000-0000-0007-000000000301',
   'de000000-0000-0000-0006-000000000103',
   'Assinatura em papel', false, 1),
  ('de000000-0000-0000-0007-000000000302',
   'de000000-0000-0000-0006-000000000103',
   'Ligação para o cliente', false, 2),
  ('de000000-0000-0000-0007-000000000303',
   'de000000-0000-0000-0006-000000000103',
   'QR de entrega com foto e geotag', true, 3),
  ('de000000-0000-0000-0007-000000000304',
   'de000000-0000-0000-0006-000000000103',
   'Print da conversa', false, 4),
  -- Q4 (V/F)
  ('de000000-0000-0000-0007-000000000401',
   'de000000-0000-0000-0006-000000000104',
   'Verdadeiro', false, 1),
  ('de000000-0000-0000-0007-000000000402',
   'de000000-0000-0000-0006-000000000104',
   'Falso', true, 2),
  -- Q5
  ('de000000-0000-0000-0007-000000000501',
   'de000000-0000-0000-0006-000000000105',
   'Somos a entrega mais rápida do Brasil.', false, 1),
  ('de000000-0000-0000-0007-000000000502',
   'de000000-0000-0000-0006-000000000105',
   '45 minutos de prazo Help, medido porta a porta nos últimos 15 dias.', true, 2),
  ('de000000-0000-0000-0007-000000000503',
   'de000000-0000-0000-0006-000000000105',
   'Entregas super-rápidas e confiáveis.', false, 3),
  ('de000000-0000-0000-0007-000000000504',
   'de000000-0000-0000-0006-000000000105',
   'Tecnologia de ponta em cada pedido.', false, 4)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Aula 4 — game "Rota certa" (rodada única: diga ou não diga)
-- Nota: o componente atual GameActivity suporta uma rodada única por lesson,
-- então usamos say_dont_say como game principal ("diga ou não diga") — que é
-- o que tem contraste didático mais forte no material.
-- Cartões e explicações intencionalmente incluem palavras travadas.
-- ---------------------------------------------------------------------------
/* vocab-allow */
insert into public.lessons (
  id, module_id, title, description, content_type, content, external_url, file_path,
  estimated_minutes, xp_reward, required, published, position, config
) values (
  'de000000-0000-0000-0004-000000000004',
  'de000000-0000-0000-0003-000000000002',
  'Rota certa — diga ou não diga',
  'Oito frases. Classifique cada uma como "Diga" ou "Não diga" na voz da Help.',
  'game',
  null, null, null,
  5, 20, true, true, 2,
  jsonb_build_object(
    'kind', 'say_dont_say',
    'intro', 'Oito frases. Classifique cada uma como "Diga" ou "Não diga". Precisa acertar ao menos 70% para concluir; 100% dá bônus.',
    'cta_label', 'Enviar respostas',
    'cards', jsonb_build_array(
      jsonb_build_object('id', 'c1', 'label', 'entregador parceiro'),
      jsonb_build_object('id', 'c2', 'label', 'nossos motoboys'),
      jsonb_build_object('id', 'c3', 'label', 'QR de entrega com foto e geotag'),
      jsonb_build_object('id', 'c4', 'label', 'tecnologia de ponta'),
      jsonb_build_object('id', 'c5', 'label', 'suporte humano 24/7'),
      jsonb_build_object('id', 'c6', 'label', 'frota própria'),
      jsonb_build_object('id', 'c7', 'label', 'prazo Help de 45 min, porta a porta, últimos 15 dias'),
      jsonb_build_object('id', 'c8', 'label', 'melhor do mercado')
    )
  )
) on conflict (id) do nothing;

-- Gabarito do game (admin-only via RLS). O RPC submit_activity espera
-- estrutura {rounds: [{id, type, cards: [{id, answer}]}]}. A UI envia o
-- payload wrap-ado com um único round id 'r1'.
insert into public.lesson_answer_keys (lesson_id, key) values (
  'de000000-0000-0000-0004-000000000004',
  jsonb_build_object(
    'rounds', jsonb_build_array(
      jsonb_build_object(
        'id', 'r1',
        'type', 'say_dont_say',
        'cards', jsonb_build_array(
          jsonb_build_object('id', 'c1', 'answer', 'say'),
          jsonb_build_object('id', 'c2', 'answer', 'dont_say'),
          jsonb_build_object('id', 'c3', 'answer', 'say'),
          jsonb_build_object('id', 'c4', 'answer', 'dont_say'),
          jsonb_build_object('id', 'c5', 'answer', 'say'),
          jsonb_build_object('id', 'c6', 'answer', 'dont_say'),
          jsonb_build_object('id', 'c7', 'answer', 'say'),
          jsonb_build_object('id', 'c8', 'answer', 'dont_say')
        )
      )
    ),
    'explanations', jsonb_build_object(
      'c1', 'Autonomia é o eixo da relação com a rede',
      'c2', 'Sugere subordinação; use "rede de parceiros"',
      'c3', 'É a prova concreta da entrega',
      'c4', 'Adjetivo sem prova; diga o que a tecnologia faz',
      'c5', 'Específico e verdadeiro',
      'c6', 'Palavra da lista travada',
      'c7', 'Número com régua e janela',
      'c8', 'Superlativo sem prova'
    )
  )
) on conflict (lesson_id) do update set key = excluded.key;
/* /vocab-allow */

-- ---------------------------------------------------------------------------
-- Aula 5 — task "Tarefa: prepare seu primeiro dia"
-- ---------------------------------------------------------------------------
insert into public.lessons (
  id, module_id, title, description, content_type, content, external_url, file_path,
  estimated_minutes, xp_reward, required, published, position, config
) values (
  'de000000-0000-0000-0004-000000000005',
  'de000000-0000-0000-0003-000000000003',
  'Tarefa: prepare seu primeiro dia',
  'Três coisas que deixam seu primeiro dia mais leve. Faça cada uma, marque aqui e envie.',
  'task',
  null, null, null,
  10, 20, true, true, 1,
  jsonb_build_object(
    'intro', 'Três coisas que deixam seu primeiro dia mais leve. Faça cada uma, marque aqui e envie.',
    'items', jsonb_build_array(
      jsonb_build_object('id', 'item_1',
        'label', 'Coloquei minha foto e confirmei meu nome no perfil do Help Academy.',
        'required', true),
      jsonb_build_object('id', 'item_2',
        'label', 'Salvei o contato do suporte interno e sei em que canal pedir ajuda.',
        'required', true),
      jsonb_build_object('id', 'item_3',
        'label', 'Li o resumo da aula de voz e tom e anotei uma frase que vou usar.',
        'required', true)
    ),
    'checklist', jsonb_build_array(
      jsonb_build_object('id', 'item_1',
        'label', 'Coloquei minha foto e confirmei meu nome no perfil do Help Academy.',
        'required', true),
      jsonb_build_object('id', 'item_2',
        'label', 'Salvei o contato do suporte interno e sei em que canal pedir ajuda.',
        'required', true),
      jsonb_build_object('id', 'item_3',
        'label', 'Li o resumo da aula de voz e tom e anotei uma frase que vou usar.',
        'required', true)
    ),
    'note_optional', true,
    'note_max_length', 1000,
    'optional_note', true,
    'note_max_chars', 1000,
    'note_placeholder', 'Quer deixar um recado para quem vai te acompanhar na primeira semana?',
    'requires_review', false,
    'cta_label', 'Enviar tarefa'
  )
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Aula 6 — challenge "Desafio: responda um lojista"
-- ---------------------------------------------------------------------------
/* vocab-allow */
insert into public.lessons (
  id, module_id, title, description, content_type, content, external_url, file_path,
  estimated_minutes, xp_reward, required, published, position, config
) values (
  'de000000-0000-0000-0004-000000000006',
  'de000000-0000-0000-0003-000000000003',
  'Desafio: responda um lojista',
  'Escreva uma resposta real, na voz da Help, para um lojista preocupado com o pedido.',
  'challenge',
  null, null, null,
  10, 60, true, true, 2,
  jsonb_build_object(
    'scenario', E'EM ROTA · #4821 — Farmácia Central → Rua Bahia, 1120 · Centro · 6,4 km · SLA 45 min.\n\nMensagem do lojista: "Boa tarde. O pedido #4821 saiu às 14:31 e o cliente já ligou duas vezes. Vai chegar hoje?"\n\nLinha do tempo:\n· Coleta confirmada · 14:22\n· Saiu para entrega · 14:31\n· (pendente) QR de entrega',
    'instructions', E'1) Diga o status atual com o horário.\n2) Dê a previsão com número e janela ("até 15:18").\n3) Diga como ele vai saber que chegou (QR com foto e geotag).\n4) Tom direto e caloroso, sem exclamação e sem palavras da lista.',
    'min_length', 200,
    'max_length', 2000,
    'min_chars', 200,
    'max_chars', 2000,
    'evaluation_criteria', jsonb_build_array(
      jsonb_build_object('id', 'crit_1', 'label', 'Informei o status com horário.'),
      jsonb_build_object('id', 'crit_2', 'label', 'Dei uma previsão com número.'),
      jsonb_build_object('id', 'crit_3', 'label', 'Expliquei como a entrega será comprovada.'),
      jsonb_build_object('id', 'crit_4', 'label', 'Não usei palavras da lista nem exclamação.')
    ),
    'blocked_terms', jsonb_build_array(
      'colaborador',
      'funcionário',
      'nossos motoboys',
      'frota própria',
      'equipe fixa'
    ),
    'reference_answer', E'Boa tarde. O #4821 está em rota desde 14:31, com o parceiro a 2 km da Rua Bahia. A previsão é até 15:18, dentro do SLA de 45 minutos. Quando ele entregar, o QR registra foto e geotag e o comprovante aparece no seu painel. Se o cliente ligar de novo, pode passar esse horário — e sigo acompanhando por aqui.',
    'cta_label', 'Enviar resposta'
  )
) on conflict (id) do nothing;
/* /vocab-allow */

-- ---------------------------------------------------------------------------
-- Aula 7 — survey "Questionário: como foi sua chegada"
-- ---------------------------------------------------------------------------
insert into public.lessons (
  id, module_id, title, description, content_type, content, external_url, file_path,
  estimated_minutes, xp_reward, required, published, position, config
) values (
  'de000000-0000-0000-0004-000000000007',
  'de000000-0000-0000-0003-000000000003',
  'Questionário: como foi sua chegada',
  'Rápido: sete perguntas para nos ajudar a melhorar a chegada de quem vem depois de você.',
  'survey',
  null, null, null,
  4, 15, true, true, 3,
  jsonb_build_object(
    'intro', 'Sete perguntas rápidas. Suas respostas ajudam a melhorar a chegada de quem vem depois de você.',
    'cta_label', 'Enviar respostas',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1',
        'type', 'scale',
        'required', true,
        'label', 'Quão preparado(a) você se sente para o seu primeiro dia?',
        'question', 'Quão preparado(a) você se sente para o seu primeiro dia?',
        'min', 1, 'max', 5,
        'min_label', 'Nada', 'max_label', 'Totalmente'
      ),
      jsonb_build_object(
        'id', 'q2',
        'type', 'single_choice',
        'required', true,
        'label', 'Qual atividade desta trilha foi mais útil?',
        'question', 'Qual atividade desta trilha foi mais útil?',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'opt_1', 'label', 'A história da Help'),
          jsonb_build_object('id', 'opt_2', 'label', 'Voz e tom'),
          jsonb_build_object('id', 'opt_3', 'label', 'Quiz da jornada do pedido'),
          jsonb_build_object('id', 'opt_4', 'label', 'Rota certa (game)'),
          jsonb_build_object('id', 'opt_5', 'label', 'Prepare seu primeiro dia'),
          jsonb_build_object('id', 'opt_6', 'label', 'Desafio do lojista')
        ),
        'choices', jsonb_build_array(
          jsonb_build_object('id', 'opt_1', 'label', 'A história da Help'),
          jsonb_build_object('id', 'opt_2', 'label', 'Voz e tom'),
          jsonb_build_object('id', 'opt_3', 'label', 'Quiz da jornada do pedido'),
          jsonb_build_object('id', 'opt_4', 'label', 'Rota certa (game)'),
          jsonb_build_object('id', 'opt_5', 'label', 'Prepare seu primeiro dia'),
          jsonb_build_object('id', 'opt_6', 'label', 'Desafio do lojista')
        )
      ),
      jsonb_build_object(
        'id', 'q3',
        'type', 'multiple_choice',
        'required', false,
        'max', 3,
        'label', 'Sobre quais temas você quer aprender mais?',
        'question', 'Sobre quais temas você quer aprender mais?',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'th_1', 'label', 'Voz e tom'),
          jsonb_build_object('id', 'th_2', 'label', 'Jornada do pedido'),
          jsonb_build_object('id', 'th_3', 'label', 'Status e prazos'),
          jsonb_build_object('id', 'th_4', 'label', 'Atendimento ao lojista'),
          jsonb_build_object('id', 'th_5', 'label', 'Rede de parceiros'),
          jsonb_build_object('id', 'th_6', 'label', 'Ferramentas internas')
        ),
        'choices', jsonb_build_array(
          jsonb_build_object('id', 'th_1', 'label', 'Voz e tom'),
          jsonb_build_object('id', 'th_2', 'label', 'Jornada do pedido'),
          jsonb_build_object('id', 'th_3', 'label', 'Status e prazos'),
          jsonb_build_object('id', 'th_4', 'label', 'Atendimento ao lojista'),
          jsonb_build_object('id', 'th_5', 'label', 'Rede de parceiros'),
          jsonb_build_object('id', 'th_6', 'label', 'Ferramentas internas')
        )
      ),
      jsonb_build_object(
        'id', 'q4',
        'type', 'yes_no',
        'required', true,
        'label', 'Você já sabe a quem pedir ajuda na primeira semana?',
        'question', 'Você já sabe a quem pedir ajuda na primeira semana?'
      ),
      jsonb_build_object(
        'id', 'q5',
        'type', 'nps',
        'required', true,
        'label', 'De 0 a 10, quanto você recomendaria esta trilha para quem está chegando?',
        'question', 'De 0 a 10, quanto você recomendaria esta trilha para quem está chegando?'
      ),
      jsonb_build_object(
        'id', 'q6',
        'type', 'short_text',
        'required', true,
        'max_chars', 120,
        'max_length', 120,
        'label', 'Em uma frase: o que a Help promete para o lojista?',
        'question', 'Em uma frase: o que a Help promete para o lojista?'
      ),
      jsonb_build_object(
        'id', 'q7',
        'type', 'long_text',
        'required', false,
        'max_chars', 1000,
        'max_length', 1000,
        'label', 'O que poderia melhorar nesta trilha?',
        'question', 'O que poderia melhorar nesta trilha?'
      )
    )
  )
) on conflict (id) do nothing;
