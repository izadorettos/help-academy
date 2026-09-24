-- ============================================================================
-- Demo user — password provided via :demo_password psql variable
-- Only for local/staging; production guard is in scripts/demo.mjs
-- ============================================================================

insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data,
  -- GoTrue exige que esses campos sejam '' e não NULL (mesma nota do seed.sql).
  confirmation_token, recovery_token,
  email_change_token_new, email_change
) values (
  'de000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo@help.local',
  crypt(:'demo_password', gen_salt('bf')),
  now(), now(), now(),
  '{"name": "Ana Demonstração"}'::jsonb,
  '', '', '', ''
) on conflict (id) do nothing;

-- Atribui área "Demonstração" e marca como demo.
-- O trigger handle_new_user já criou o profile; aqui só ajustamos.
update public.profiles
   set department_id = 'de000000-0000-0000-0001-000000000001',
       is_demo = true
 where id = 'de000000-0000-0000-0000-000000000001';
