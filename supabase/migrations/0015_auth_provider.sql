-- Add auth_provider and external_subject to profiles
alter table public.profiles
  add column if not exists auth_provider text not null default 'supabase',
  add column if not exists external_subject text null;

alter table public.profiles
  add constraint profiles_external_subject_unique
  unique (auth_provider, external_subject);
