-- Migration 0013: Buckets de Storage e políticas
-- Dependências: 0006 (is_admin)
--
-- Buckets:
--   lesson-files  — privado, PDFs das aulas (50 MiB)
--   avatars       — público, fotos de perfil (2 MiB)
--   covers        — público, capas das trilhas (5 MiB)
--
-- Leitura de lesson-files é feita pelo servidor via URL assinada (signed URL);
-- não há policy SELECT pública — o backend gera o URL assinado com service role.

-- ===========================================================================
-- Buckets
-- ===========================================================================

-- Bucket privado para PDFs das aulas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-files',
  'lesson-files',
  false,
  52428800,
  array['application/pdf']
) on conflict (id) do nothing;

-- Bucket público para avatars de perfil
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) on conflict (id) do nothing;

-- Bucket público para imagens de capa das trilhas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

-- ===========================================================================
-- Políticas: lesson-files
-- Leitura pública não é permitida; o servidor gera URLs assinadas via service role.
-- Escrita (upload, atualização, exclusão) somente admin.
-- ===========================================================================

create policy "lesson_files_admin_write"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'lesson-files'
    and public.is_admin()
  );

create policy "lesson_files_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'lesson-files'
    and public.is_admin()
  );

create policy "lesson_files_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'lesson-files'
    and public.is_admin()
  );

-- ===========================================================================
-- Políticas: avatars
-- Leitura pública (bucket é público, Supabase Storage libera GET sem policy).
-- Escrita/deleção: apenas o próprio usuário dentro do path avatars/{uid}/*.
-- ===========================================================================

create policy "avatars_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars_owner_write"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===========================================================================
-- Políticas: covers
-- Leitura pública.
-- Escrita/deleção: somente admin.
-- ===========================================================================

create policy "covers_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'covers');

create policy "covers_admin_write"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and public.is_admin()
  );

create policy "covers_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'covers'
    and public.is_admin()
  );

create policy "covers_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'covers'
    and public.is_admin()
  );
