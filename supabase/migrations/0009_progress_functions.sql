-- Migration 0009: Funções de progresso (start_lesson, complete_lesson)
-- Fase 10 — apenas registra conclusões, SEM conceder XP (XP é Fase 12).
-- Todas as funções são SECURITY DEFINER com set search_path = ''.
-- Membros não recebem GRANT para _complete_lesson_internal (função interna).

-- ===========================================================================
-- start_lesson(p_lesson_id uuid) returns void
-- Chamada quando o usuário abre uma aula.
-- 1. Verifica acesso (can_access_lesson) e desbloqueio (is_lesson_unlocked).
-- 2. Upsert em lesson_progress (cria ou atualiza last_accessed_at).
-- 3. Upsert em user_learning_paths (marca started_at na primeira visita).
-- 4. Atualiza profiles.last_seen_at.
-- Idempotente: chamada múltiplas vezes apenas atualiza last_accessed_at.
-- ===========================================================================
create or replace function public.start_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id   uuid;
  v_path_id   uuid;
begin
  v_user_id := auth.uid();

  -- Exige autenticação
  if v_user_id is null then
    raise exception 'NO_ACCESS' using hint = 'Usuário não autenticado';
  end if;

  -- Verifica acesso à aula
  if not public.can_access_lesson(p_lesson_id, v_user_id) then
    raise exception 'NO_ACCESS' using hint = 'Sem acesso a esta aula';
  end if;

  -- Verifica se a aula está desbloqueada (sequencialidade)
  if not public.is_lesson_unlocked(p_lesson_id, v_user_id) then
    raise exception 'LESSON_LOCKED' using hint = 'Aula bloqueada: complete as aulas anteriores';
  end if;

  -- Obtém o learning_path_id para o upsert de user_learning_paths
  select m.learning_path_id
    into v_path_id
    from public.lessons l
    join public.modules m on m.id = l.module_id
   where l.id = p_lesson_id;

  -- Upsert em lesson_progress
  insert into public.lesson_progress (user_id, lesson_id, started_at, last_accessed_at)
  values (v_user_id, p_lesson_id, now(), now())
  on conflict (user_id, lesson_id) do update
    set last_accessed_at = now();

  -- Upsert em user_learning_paths: registra início da trilha na primeira visita
  if v_path_id is not null then
    insert into public.user_learning_paths (user_id, learning_path_id, started_at)
    values (v_user_id, v_path_id, now())
    on conflict (user_id, learning_path_id) do update
      set started_at = coalesce(public.user_learning_paths.started_at, now());
  end if;

  -- Atualiza last_seen_at no perfil
  update public.profiles
     set last_seen_at = now()
   where id = v_user_id;
end;
$$;

-- Apenas usuários autenticados podem chamar start_lesson
revoke execute on function public.start_lesson(uuid) from public, anon;
grant  execute on function public.start_lesson(uuid) to authenticated;


-- ===========================================================================
-- _complete_lesson_internal(p_user_id uuid, p_lesson_id uuid) returns void
-- Função interna: marca lesson_progress.completed_at, verifica se o módulo
-- e a trilha foram concluídos e atualiza as tabelas correspondentes.
-- SEM XP nesta fase.
-- Sem GRANT público — só chamada por outras funções SECURITY DEFINER.
-- ===========================================================================
create or replace function public._complete_lesson_internal(
  p_user_id  uuid,
  p_lesson_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module_id         uuid;
  v_path_id           uuid;
  v_prev_completed_at timestamptz;
  v_required_total    integer;
  v_required_done     integer;
  v_path_done         boolean;
begin
  -- Garante que existe linha em lesson_progress (pode já existir pelo start_lesson)
  insert into public.lesson_progress (user_id, lesson_id, started_at, last_accessed_at)
  values (p_user_id, p_lesson_id, now(), now())
  on conflict (user_id, lesson_id) do nothing;

  -- Trava a linha para evitar dupla conclusão concorrente
  select completed_at
    into v_prev_completed_at
    from public.lesson_progress
   where user_id = p_user_id
     and lesson_id = p_lesson_id
  for update;

  -- Se já estava concluída, encerra (idempotente)
  if v_prev_completed_at is not null then
    return;
  end if;

  -- Marca a aula como concluída
  update public.lesson_progress
     set completed_at    = now(),
         last_accessed_at = now()
   where user_id  = p_user_id
     and lesson_id = p_lesson_id;

  -- Obtém módulo e trilha da aula
  select m.id, m.learning_path_id
    into v_module_id, v_path_id
    from public.lessons l
    join public.modules m on m.id = l.module_id
   where l.id = p_lesson_id;

  -- -------------------------------------------------------------------------
  -- Verifica conclusão do módulo:
  -- Módulo concluído quando TODAS as aulas required=true AND published=true
  -- do módulo têm completed_at não nulo para este usuário.
  -- Deve existir pelo menos 1 aula obrigatória publicada.
  -- -------------------------------------------------------------------------
  select
    count(*) filter (where l.required and l.published),
    count(*) filter (
      where l.required and l.published
        and exists (
          select 1 from public.lesson_progress lp
           where lp.lesson_id = l.id
             and lp.user_id   = p_user_id
             and lp.completed_at is not null
        )
    )
  into v_required_total, v_required_done
  from public.lessons l
  where l.module_id = v_module_id;

  if v_required_total > 0 and v_required_done = v_required_total then
    -- Insere em module_completions (idempotente via on conflict do nothing)
    insert into public.module_completions (user_id, module_id, completed_at)
    values (p_user_id, v_module_id, now())
    on conflict (user_id, module_id) do nothing;
  end if;

  -- -------------------------------------------------------------------------
  -- Verifica conclusão da trilha:
  -- Trilha concluída quando TODOS os módulos têm TODAS as suas aulas
  -- required=true AND published=true concluídas pelo usuário.
  -- Deve existir pelo menos 1 aula obrigatória publicada na trilha.
  -- -------------------------------------------------------------------------
  select
    count(*) filter (where l.required and l.published),
    count(*) filter (
      where l.required and l.published
        and exists (
          select 1 from public.lesson_progress lp
           where lp.lesson_id = l.id
             and lp.user_id   = p_user_id
             and lp.completed_at is not null
        )
    )
  into v_required_total, v_required_done
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.learning_path_id = v_path_id;

  v_path_done := (v_required_total > 0 and v_required_done = v_required_total);

  if v_path_done then
    -- Atualiza user_learning_paths.completed_at (só se ainda não estava concluída)
    update public.user_learning_paths
       set completed_at = now()
     where user_id          = p_user_id
       and learning_path_id = v_path_id
       and completed_at     is null;
  end if;
end;
$$;

-- Sem grant público — interna
revoke execute on function public._complete_lesson_internal(uuid, uuid) from public, anon, authenticated;


-- ===========================================================================
-- complete_lesson(p_lesson_id uuid) returns jsonb
-- Wrapper público:
-- 1. Verifica autenticação.
-- 2. Verifica acesso (can_access_lesson) e desbloqueio (is_lesson_unlocked).
-- 3. Se a aula tem quiz, verifica se existe tentativa aprovada.
-- 4. Chama _complete_lesson_internal.
-- 5. Retorna { ok: true }.
-- Idempotente: segunda chamada retorna { ok: true } sem efeito colateral.
-- ===========================================================================
create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id    uuid;
  v_has_quiz   boolean;
  v_quiz_passed boolean;
begin
  v_user_id := auth.uid();

  -- Exige autenticação
  if v_user_id is null then
    raise exception 'NO_ACCESS' using hint = 'Usuário não autenticado';
  end if;

  -- Verifica acesso
  if not public.can_access_lesson(p_lesson_id, v_user_id) then
    raise exception 'NO_ACCESS' using hint = 'Sem acesso a esta aula';
  end if;

  -- Verifica desbloqueio (sequencialidade)
  if not public.is_lesson_unlocked(p_lesson_id, v_user_id) then
    raise exception 'LESSON_LOCKED' using hint = 'Aula bloqueada: complete as aulas anteriores';
  end if;

  -- Verifica se a aula tem quiz e se foi aprovado
  select
    exists(select 1 from public.quizzes q where q.lesson_id = p_lesson_id),
    exists(
      select 1
        from public.quizzes q
        join public.quiz_attempts qa on qa.quiz_id = q.id
       where q.lesson_id = p_lesson_id
         and qa.user_id  = v_user_id
         and qa.passed   = true
    )
  into v_has_quiz, v_quiz_passed;

  if v_has_quiz and not v_quiz_passed then
    raise exception 'QUIZ_REQUIRED' using hint = 'Você precisa passar no quiz para concluir esta aula';
  end if;

  -- Executa a conclusão (idempotente)
  perform public._complete_lesson_internal(v_user_id, p_lesson_id);

  return jsonb_build_object('ok', true);
end;
$$;

-- Apenas usuários autenticados podem chamar complete_lesson
revoke execute on function public.complete_lesson(uuid) from public, anon;
grant  execute on function public.complete_lesson(uuid) to authenticated;
