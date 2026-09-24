-- Migration 0016: novos valores de enum para atividades
-- Migration ISOLADA: valores novos de enum não podem ser usados na mesma
-- transação em que são criados. As tabelas/funções que dependem deles ficam
-- na 0017 e 0018.

alter type public.lesson_type add value if not exists 'task';
alter type public.lesson_type add value if not exists 'challenge';
alter type public.lesson_type add value if not exists 'survey';
alter type public.lesson_type add value if not exists 'game';

alter type public.xp_reason   add value if not exists 'game_perfect';
