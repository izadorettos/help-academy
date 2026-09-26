-- Migration 0021: Central de Ajuda — tutoriais, categorias, públicos, séries
-- Dependências: 0006 (is_admin, is_active_user), 0013 (storage)

-- ===========================================================================
-- Extensão unaccent (busca sem acento)
-- ===========================================================================
create extension if not exists unaccent with schema extensions;

-- ===========================================================================
-- Enums
-- ===========================================================================
create type public.tutorial_content_type as enum ('video', 'pdf', 'image', 'app', 'link', 'article');
create type public.tutorial_freshness   as enum ('current', 'needs_update', 'needs_review');
create type public.tutorial_visibility  as enum ('authenticated', 'public');

-- ===========================================================================
-- Tabelas
-- ===========================================================================

create table public.help_audiences (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.help_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  icon        text not null default 'BookOpen',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.help_series (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.tutorials (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique
                        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title               text not null
                        check (char_length(title) between 3 and 160),
  description         text not null,
  category_id         uuid not null references public.help_categories(id) on delete restrict,
  series_id           uuid          references public.help_series(id)    on delete set null,
  series_position     int,
  content_type        public.tutorial_content_type not null,
  -- mídia desacoplada: 'storage:<bucket>/<path>' OU URL https (YouTube, Vimeo, CDN)
  video_url           text,
  file_url            text,
  thumbnail_url       text,
  duration_seconds    int           check (duration_seconds >= 0),
  pages               int,
  file_size_bytes     bigint,
  mime_type           text,
  sha256              text,
  app_version         text,
  freshness           public.tutorial_freshness not null default 'current',
  freshness_note      text,
  visibility          public.tutorial_visibility not null default 'authenticated',
  is_published        boolean not null default false,
  is_featured         boolean not null default false,
  sort_order          int     not null default 0,
  source_file         text,
  date_source         text,
  last_content_update date    not null,
  created_by          uuid          references public.profiles(id) on delete set null,
  updated_by          uuid          references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (series_id, series_position),
  check (
    (content_type = 'video' and video_url is not null)
    or (content_type <> 'video' and file_url is not null)
    or content_type in ('link', 'article')
  )
);

create table public.tutorial_audiences (
  tutorial_id uuid not null references public.tutorials(id)      on delete cascade,
  audience_id uuid not null references public.help_audiences(id) on delete restrict,
  primary key (tutorial_id, audience_id)
);

-- ===========================================================================
-- Índices
-- ===========================================================================
create index tutorials_published_idx      on public.tutorials (is_published, sort_order);
create index tutorials_category_idx       on public.tutorials (category_id);
create index tutorials_updated_idx        on public.tutorials (last_content_update desc);
create index tutorial_audiences_audience_idx on public.tutorial_audiences (audience_id);
create index tutorials_search_idx         on public.tutorials
  using gin (
    to_tsvector('portuguese',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  );

-- ===========================================================================
-- Trigger set_updated_at (reutiliza função existente ou cria se não existir)
-- ===========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_tutorials_updated_at
  before update on public.tutorials
  for each row execute function public.set_updated_at();

create trigger set_help_categories_updated_at
  before update on public.help_categories
  for each row execute function public.set_updated_at();

create trigger set_help_series_updated_at
  before update on public.help_series
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- RLS
-- ===========================================================================

alter table public.help_audiences  enable row level security;
alter table public.help_categories enable row level security;
alter table public.help_series     enable row level security;
alter table public.tutorials       enable row level security;
alter table public.tutorial_audiences enable row level security;

-- ── help_audiences ────────────────────────────────────────────────────────────
create policy "help_audiences_select_authenticated"
  on public.help_audiences
  for select
  to authenticated
  using (public.is_active_user() or public.is_admin());

create policy "help_audiences_select_anon"
  on public.help_audiences
  for select
  to anon
  using (true);

create policy "help_audiences_admin_write"
  on public.help_audiences
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── help_categories ───────────────────────────────────────────────────────────
create policy "help_categories_select_authenticated"
  on public.help_categories
  for select
  to authenticated
  using (public.is_active_user() or public.is_admin());

create policy "help_categories_select_anon"
  on public.help_categories
  for select
  to anon
  using (true);

create policy "help_categories_admin_write"
  on public.help_categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── help_series ───────────────────────────────────────────────────────────────
create policy "help_series_select_authenticated"
  on public.help_series
  for select
  to authenticated
  using (public.is_active_user() or public.is_admin());

create policy "help_series_select_anon"
  on public.help_series
  for select
  to anon
  using (true);

create policy "help_series_admin_write"
  on public.help_series
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── tutorials ─────────────────────────────────────────────────────────────────
-- Admin vê tudo
create policy "tutorials_admin_select"
  on public.tutorials
  for select
  to authenticated
  using (public.is_admin());

-- Membro autenticado ativo vê apenas publicados
create policy "tutorials_member_select"
  on public.tutorials
  for select
  to authenticated
  using (
    is_published = true
    and public.is_active_user()
  );

-- Anon vê apenas publicados com visibility = 'public'
create policy "tutorials_anon_select"
  on public.tutorials
  for select
  to anon
  using (
    is_published = true
    and visibility = 'public'
  );

-- Escrita somente admin
create policy "tutorials_admin_insert"
  on public.tutorials
  for insert
  to authenticated
  with check (public.is_admin());

create policy "tutorials_admin_update"
  on public.tutorials
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "tutorials_admin_delete"
  on public.tutorials
  for delete
  to authenticated
  using (public.is_admin());

-- ── tutorial_audiences ────────────────────────────────────────────────────────
create policy "tutorial_audiences_select_authenticated"
  on public.tutorial_audiences
  for select
  to authenticated
  using (public.is_active_user() or public.is_admin());

create policy "tutorial_audiences_select_anon"
  on public.tutorial_audiences
  for select
  to anon
  using (true);

create policy "tutorial_audiences_admin_write"
  on public.tutorial_audiences
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- Storage bucket: tutorials (privado, 50 MB)
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutorials',
  'tutorials',
  false,
  52428800,
  array[
    'video/mp4',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.android.package-archive'
  ]
) on conflict (id) do nothing;

-- Admin: INSERT
create policy "tutorials_storage_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'tutorials'
    and public.is_admin()
  );

-- Admin: UPDATE
create policy "tutorials_storage_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'tutorials'
    and public.is_admin()
  );

-- Admin: DELETE
create policy "tutorials_storage_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'tutorials'
    and public.is_admin()
  );

-- Membro autenticado: SELECT via SECURITY DEFINER helper
-- O helper verifica se existe tutorial publicado com o arquivo correspondente.
create or replace function public.can_access_tutorial_file(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tutorials t
    where t.is_published = true
      and public.is_active_user()
      and (
        -- Thumbnail ou arquivo principal identificado pelo slug no caminho
        t.thumbnail_url = 'storage:tutorials/' || p_object_name
        or t.file_url    = 'storage:tutorials/' || p_object_name
        or t.video_url   = 'storage:tutorials/' || p_object_name
        or p_object_name like t.slug || '/%'
      )
  );
$$;

create policy "tutorials_storage_member_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'tutorials'
    and (
      public.is_admin()
      or public.can_access_tutorial_file(name)
    )
  );
