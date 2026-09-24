-- ============================================================================
-- Remove all demo data (cascades through foreign keys)
-- Ordem: usuário (cascata em progresso/XP/conquistas) → trilha (cascata em
-- módulos/aulas/quiz/gabaritos/submissões) → área.
-- ============================================================================

-- 1. Remove usuário demo do auth (cascata em profiles + tudo que referencia).
delete from auth.users where id = 'de000000-0000-0000-0000-000000000001';

-- 2. Belt-and-suspenders: se por algum motivo o profile sobreviver, apaga.
delete from public.profiles where is_demo = true;

-- 3. Remove trilhas de demonstração (cascata em módulos/aulas/quizzes/gabaritos/submissões).
delete from public.learning_paths where is_demo = true;

-- 4. Remove área de demonstração.
delete from public.departments where is_demo = true;

-- Notas:
--   * lesson_answer_keys → cascade em lessons
--   * activity_submissions → cascade em lessons e profiles
--   * lesson_progress, xp_transactions, user_achievements → cascade em profiles
--   * quiz_options → cascade em quiz_questions → quizzes → lessons
