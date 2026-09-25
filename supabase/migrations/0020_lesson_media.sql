-- Migration 0020: lesson-media bucket, image/presentation lesson types, module cover_path
-- Dependências: 0001 (lesson_type enum), 0006 (is_admin, can_access_lesson), 0013 (storage)

-- ===========================================================================
-- Enum: adicionar 'image' e 'presentation' ao lesson_type
-- ===========================================================================

alter type public.lesson_type add value if not exists 'image';
alter type public.lesson_type add value if not exists 'presentation';

-- ===========================================================================
-- Tabela: módulos — adicionar coluna cover_path
-- ===========================================================================

alter table public.modules
  add column if not exists cover_path text null;

-- ===========================================================================
-- Bucket: lesson-media (privado, 50 MiB)
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-media',
  'lesson-media',
  false,
  52428800,
  array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
) on conflict (id) do nothing;

-- ===========================================================================
-- Políticas: lesson-media
-- Admin: tudo. Membro autenticado: SELECT se pode acessar a aula (via pasta lessons/{lesson_id}/).
-- ===========================================================================

-- Admin INSERT
create policy "lesson_media_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'lesson-media'
    and public.is_admin()
  );

-- Admin UPDATE
create policy "lesson_media_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'lesson-media'
    and public.is_admin()
  );

-- Admin DELETE
create policy "lesson_media_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'lesson-media'
    and public.is_admin()
  );

-- Member SELECT: path format is lessons/{lesson_id}/filename
-- (storage.foldername(name))[1] returns first folder segment → lesson_id
create policy "lesson_media_member_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'lesson-media'
    and (
      public.is_admin()
      or public.can_access_lesson((storage.foldername(name))[2])
    )
  );
