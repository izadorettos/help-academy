-- pgTAP tests for lesson-media storage RLS and modules.cover_path
-- Migration: 0020_lesson_media.sql

begin;

select plan(8);

-- ─── 1. lesson_type enum includes 'image' and 'presentation' ─────────────────

select has_column('public', 'lessons', 'content_type',
  'lessons.content_type column exists');

-- Check that the enum has the new values by attempting to cast
select ok(
  exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'lesson_type'
    and e.enumlabel = 'image'
  ),
  'lesson_type enum includes image'
);

select ok(
  exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'lesson_type'
    and e.enumlabel = 'presentation'
  ),
  'lesson_type enum includes presentation'
);

-- ─── 2. modules.cover_path column exists ─────────────────────────────────────

select has_column('public', 'modules', 'cover_path',
  'modules.cover_path column exists');

select col_is_null('public', 'modules', 'cover_path',
  'modules.cover_path is nullable');

-- ─── 3. lesson-media bucket exists and is private ───────────────────────────

select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'lesson-media'
    and public = false
  ),
  'lesson-media bucket exists and is private'
);

-- ─── 4. lesson-media bucket has correct file size limit ─────────────────────

select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'lesson-media'
    and file_size_limit = 52428800
  ),
  'lesson-media bucket has 50 MiB file size limit'
);

-- ─── 5. lesson-media policies exist ─────────────────────────────────────────

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'lesson_media_admin_insert'
  ),
  'lesson_media_admin_insert policy exists'
);

select finish();
rollback;
