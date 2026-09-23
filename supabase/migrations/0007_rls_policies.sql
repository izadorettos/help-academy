-- Migration 0007: Políticas RLS
-- Dependências: 0002–0005 (tabelas), 0006 (funções auxiliares: is_admin, is_active_user,
--               can_access_path, can_access_lesson)
--
-- Convenções de nomes: {tabela}_{operação}_{perfil}
-- Anon: sem policies = acesso negado automaticamente pelo RLS.
-- Membros: sempre verificam is_active_user() antes de can_access_*.
-- Admins: verificam is_admin().

-- ===========================================================================
-- departments
-- SELECT: qualquer usuário autenticado e ativo
-- INSERT/UPDATE: admin
-- DELETE: não permitido
-- ===========================================================================
create policy "departments_select_authenticated"
  on public.departments
  for select
  to authenticated
  using (public.is_active_user());

create policy "departments_insert_admin"
  on public.departments
  for insert
  to authenticated
  with check (public.is_admin());

create policy "departments_update_admin"
  on public.departments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- profiles
-- SELECT: próprio perfil OU admin
-- INSERT: via trigger handle_new_user (service role) — sem policy de INSERT
-- UPDATE: próprio perfil OU admin (colunas protegidas pelo trigger protect_profile_columns)
-- DELETE: não permitido
-- ===========================================================================
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- learning_paths
-- SELECT: can_access_path (membro ativo) OU admin
-- INSERT: admin
-- UPDATE: admin
-- DELETE: admin, apenas draft sem progresso de aulas
-- ===========================================================================
create policy "learning_paths_select_member"
  on public.learning_paths
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.can_access_path(id, auth.uid())
  );

create policy "learning_paths_select_admin"
  on public.learning_paths
  for select
  to authenticated
  using (public.is_admin());

create policy "learning_paths_insert_admin"
  on public.learning_paths
  for insert
  to authenticated
  with check (public.is_admin());

create policy "learning_paths_update_admin"
  on public.learning_paths
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "learning_paths_delete_admin"
  on public.learning_paths
  for delete
  to authenticated
  using (
    public.is_admin()
    and status = 'draft'
    and not exists (
      select 1
      from public.lesson_progress lp
      join public.lessons l on l.id = lp.lesson_id
      join public.modules m on m.id = l.module_id
      where m.learning_path_id = learning_paths.id
    )
  );

-- ===========================================================================
-- learning_path_departments
-- SELECT: can_access_path (via trilha) OU admin
-- INSERT/UPDATE/DELETE: admin
-- ===========================================================================
create policy "learning_path_departments_select_member"
  on public.learning_path_departments
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.can_access_path(learning_path_id, auth.uid())
  );

create policy "learning_path_departments_select_admin"
  on public.learning_path_departments
  for select
  to authenticated
  using (public.is_admin());

create policy "learning_path_departments_insert_admin"
  on public.learning_path_departments
  for insert
  to authenticated
  with check (public.is_admin());

create policy "learning_path_departments_update_admin"
  on public.learning_path_departments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "learning_path_departments_delete_admin"
  on public.learning_path_departments
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- modules
-- SELECT: can_access_path (via módulo → trilha) OU admin
-- INSERT/UPDATE/DELETE: admin
-- ===========================================================================
create policy "modules_select_member"
  on public.modules
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.can_access_path(learning_path_id, auth.uid())
  );

create policy "modules_select_admin"
  on public.modules
  for select
  to authenticated
  using (public.is_admin());

create policy "modules_insert_admin"
  on public.modules
  for insert
  to authenticated
  with check (public.is_admin());

create policy "modules_update_admin"
  on public.modules
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "modules_delete_admin"
  on public.modules
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- lessons
-- SELECT: can_access_lesson OU admin (membros só veem published=true)
-- INSERT/UPDATE/DELETE: admin
-- ===========================================================================
create policy "lessons_select_member"
  on public.lessons
  for select
  to authenticated
  using (
    public.is_active_user()
    and published = true
    and public.can_access_lesson(id, auth.uid())
  );

create policy "lessons_select_admin"
  on public.lessons
  for select
  to authenticated
  using (public.is_admin());

create policy "lessons_insert_admin"
  on public.lessons
  for insert
  to authenticated
  with check (public.is_admin());

create policy "lessons_update_admin"
  on public.lessons
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "lessons_delete_admin"
  on public.lessons
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- quizzes
-- SELECT: can_access_lesson (via quiz → lesson) OU admin
-- INSERT/UPDATE/DELETE: admin
-- ===========================================================================
create policy "quizzes_select_member"
  on public.quizzes
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.can_access_lesson(lesson_id, auth.uid())
  );

create policy "quizzes_select_admin"
  on public.quizzes
  for select
  to authenticated
  using (public.is_admin());

create policy "quizzes_insert_admin"
  on public.quizzes
  for insert
  to authenticated
  with check (public.is_admin());

create policy "quizzes_update_admin"
  on public.quizzes
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "quizzes_delete_admin"
  on public.quizzes
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- quiz_questions
-- SELECT: can_access_lesson (via question → quiz → lesson) OU admin
-- INSERT/UPDATE/DELETE: admin
-- ===========================================================================
create policy "quiz_questions_select_member"
  on public.quiz_questions
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.quizzes q
      where q.id = quiz_id
        and public.can_access_lesson(q.lesson_id, auth.uid())
    )
  );

create policy "quiz_questions_select_admin"
  on public.quiz_questions
  for select
  to authenticated
  using (public.is_admin());

create policy "quiz_questions_insert_admin"
  on public.quiz_questions
  for insert
  to authenticated
  with check (public.is_admin());

create policy "quiz_questions_update_admin"
  on public.quiz_questions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "quiz_questions_delete_admin"
  on public.quiz_questions
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- quiz_options
-- SELECT: somente admin (membros NUNCA leem is_correct antes de submeter)
-- INSERT/UPDATE/DELETE: admin
-- ===========================================================================
create policy "quiz_options_select_admin"
  on public.quiz_options
  for select
  to authenticated
  using (public.is_admin());

create policy "quiz_options_insert_admin"
  on public.quiz_options
  for insert
  to authenticated
  with check (public.is_admin());

create policy "quiz_options_update_admin"
  on public.quiz_options
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "quiz_options_delete_admin"
  on public.quiz_options
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- user_learning_paths
-- SELECT: próprio registro OU admin
-- INSERT/UPDATE/DELETE: admin (atribuições individuais são gerenciadas por admin)
-- ===========================================================================
create policy "user_learning_paths_select_own"
  on public.user_learning_paths
  for select
  to authenticated
  using (
    public.is_active_user()
    and user_id = auth.uid()
  );

create policy "user_learning_paths_select_admin"
  on public.user_learning_paths
  for select
  to authenticated
  using (public.is_admin());

create policy "user_learning_paths_insert_admin"
  on public.user_learning_paths
  for insert
  to authenticated
  with check (public.is_admin());

create policy "user_learning_paths_update_admin"
  on public.user_learning_paths
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "user_learning_paths_delete_admin"
  on public.user_learning_paths
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- lesson_progress
-- SELECT: próprio registro OU admin
-- INSERT/UPDATE/DELETE: somente via RPC (funções SECURITY DEFINER)
-- ===========================================================================
create policy "lesson_progress_select_own"
  on public.lesson_progress
  for select
  to authenticated
  using (
    public.is_active_user()
    and user_id = auth.uid()
  );

create policy "lesson_progress_select_admin"
  on public.lesson_progress
  for select
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- module_completions
-- SELECT: próprio registro OU admin
-- INSERT/UPDATE/DELETE: somente via RPC
-- ===========================================================================
create policy "module_completions_select_own"
  on public.module_completions
  for select
  to authenticated
  using (
    public.is_active_user()
    and user_id = auth.uid()
  );

create policy "module_completions_select_admin"
  on public.module_completions
  for select
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- quiz_attempts
-- SELECT: próprio registro OU admin
-- INSERT/UPDATE/DELETE: somente via RPC
-- ===========================================================================
create policy "quiz_attempts_select_own"
  on public.quiz_attempts
  for select
  to authenticated
  using (
    public.is_active_user()
    and user_id = auth.uid()
  );

create policy "quiz_attempts_select_admin"
  on public.quiz_attempts
  for select
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- quiz_attempt_answers
-- SELECT: membro lê via join com próprias tentativas OU admin
-- INSERT/UPDATE/DELETE: somente via RPC
-- ===========================================================================
create policy "quiz_attempt_answers_select_own"
  on public.quiz_attempt_answers
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.quiz_attempts qa
      where qa.id = attempt_id
        and qa.user_id = auth.uid()
    )
  );

create policy "quiz_attempt_answers_select_admin"
  on public.quiz_attempt_answers
  for select
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- gamification_settings
-- SELECT: qualquer usuário autenticado
-- UPDATE: admin
-- INSERT/DELETE: não permitido
-- ===========================================================================
create policy "gamification_settings_select_authenticated"
  on public.gamification_settings
  for select
  to authenticated
  using (public.is_active_user());

create policy "gamification_settings_update_admin"
  on public.gamification_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- levels
-- SELECT: qualquer usuário autenticado
-- INSERT/UPDATE/DELETE: admin
-- ===========================================================================
create policy "levels_select_authenticated"
  on public.levels
  for select
  to authenticated
  using (public.is_active_user());

create policy "levels_insert_admin"
  on public.levels
  for insert
  to authenticated
  with check (public.is_admin());

create policy "levels_update_admin"
  on public.levels
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "levels_delete_admin"
  on public.levels
  for delete
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- xp_transactions
-- SELECT: próprio registro OU admin
-- INSERT/UPDATE/DELETE: somente via funções SQL (award_xp)
-- ===========================================================================
create policy "xp_transactions_select_own"
  on public.xp_transactions
  for select
  to authenticated
  using (
    public.is_active_user()
    and user_id = auth.uid()
  );

create policy "xp_transactions_select_admin"
  on public.xp_transactions
  for select
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- achievements
-- SELECT: qualquer usuário autenticado
-- INSERT/UPDATE: admin
-- DELETE: não permitido
-- ===========================================================================
create policy "achievements_select_authenticated"
  on public.achievements
  for select
  to authenticated
  using (public.is_active_user());

create policy "achievements_insert_admin"
  on public.achievements
  for insert
  to authenticated
  with check (public.is_admin());

create policy "achievements_update_admin"
  on public.achievements
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- user_achievements
-- SELECT: próprio registro OU admin
-- INSERT/UPDATE/DELETE: somente via funções SQL (evaluate_achievements)
-- ===========================================================================
create policy "user_achievements_select_own"
  on public.user_achievements
  for select
  to authenticated
  using (
    public.is_active_user()
    and user_id = auth.uid()
  );

create policy "user_achievements_select_admin"
  on public.user_achievements
  for select
  to authenticated
  using (public.is_admin());

-- ===========================================================================
-- Grants / revokes finais
-- As tabelas já tiveram revoke all aplicado nas migrations 0003, 0004 e 0005.
-- Aqui ajustamos os grants para refletir exatamente o que a RLS permite:
-- tabelas onde membros nunca inserem/atualizam/deletam diretamente (RPCs fazem isso
-- como SECURITY DEFINER) não recebem grant de escrita para authenticated.
-- ===========================================================================

grant usage on schema public to authenticated;

-- departments: membro lê; admin escreve
revoke insert, update, delete on public.departments from authenticated;
grant select on public.departments to authenticated;
grant insert, update, delete on public.departments to authenticated;

-- profiles: membro lê/atualiza (trigger protege colunas); sem insert/delete direto
revoke insert, delete on public.profiles from authenticated;
grant select, update on public.profiles to authenticated;

-- learning_paths: admin pode tudo; membro apenas lê (RLS filtra)
grant select, insert, update, delete on public.learning_paths to authenticated;

-- learning_path_departments: admin pode tudo; membro apenas lê (RLS filtra)
grant select, insert, update, delete on public.learning_path_departments to authenticated;

-- modules: admin pode tudo; membro apenas lê (RLS filtra)
grant select, insert, update, delete on public.modules to authenticated;

-- lessons: admin pode tudo; membro apenas lê (RLS filtra)
grant select, insert, update, delete on public.lessons to authenticated;

-- quizzes: admin pode tudo; membro apenas lê (RLS filtra)
grant select, insert, update, delete on public.quizzes to authenticated;

-- quiz_questions: admin pode tudo; membro apenas lê (RLS filtra)
grant select, insert, update, delete on public.quiz_questions to authenticated;

-- quiz_options: somente admin lê e escreve (RLS nega leitura a membros)
grant select, insert, update, delete on public.quiz_options to authenticated;

-- user_learning_paths: admin pode tudo; membro apenas lê (RLS filtra)
grant select, insert, update, delete on public.user_learning_paths to authenticated;

-- lesson_progress: membro apenas lê; escrita só via RPC (SECURITY DEFINER)
revoke insert, update, delete on public.lesson_progress from authenticated;
grant select on public.lesson_progress to authenticated;

-- module_completions: membro apenas lê; escrita só via RPC
revoke insert, update, delete on public.module_completions from authenticated;
grant select on public.module_completions to authenticated;

-- quiz_attempts: membro apenas lê; escrita só via RPC
revoke insert, update, delete on public.quiz_attempts from authenticated;
grant select on public.quiz_attempts to authenticated;

-- quiz_attempt_answers: membro apenas lê; escrita só via RPC
revoke insert, update, delete on public.quiz_attempt_answers from authenticated;
grant select on public.quiz_attempt_answers to authenticated;

-- gamification_settings: todos leem; admin atualiza; sem insert/delete
revoke insert, delete on public.gamification_settings from authenticated;
grant select, update on public.gamification_settings to authenticated;

-- levels: todos leem; admin escreve
grant select, insert, update, delete on public.levels to authenticated;

-- xp_transactions: membro apenas lê; escrita só via funções SQL (award_xp)
revoke insert, update, delete on public.xp_transactions from authenticated;
grant select on public.xp_transactions to authenticated;

-- achievements: todos leem; admin escreve; sem delete
revoke delete on public.achievements from authenticated;
grant select, insert, update on public.achievements to authenticated;

-- user_achievements: membro apenas lê; escrita só via funções SQL (evaluate_achievements)
revoke insert, update, delete on public.user_achievements from authenticated;
grant select on public.user_achievements to authenticated;

-- Garantir que anon não tenha nenhum acesso residual
revoke all on all tables in schema public from anon;
