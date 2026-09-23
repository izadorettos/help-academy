-- Migration 0001: Extensões e tipos enumerados
-- Dependências: nenhuma

create extension if not exists citext schema extensions;

create type public.user_role as enum ('member', 'admin');

create type public.path_status as enum ('draft', 'published', 'archived');

create type public.lesson_type as enum ('text', 'video', 'pdf', 'link', 'embed');

create type public.question_type as enum ('multiple_choice', 'true_false');

create type public.xp_reason as enum (
  'lesson_completed',
  'quiz_passed',
  'quiz_perfect',
  'module_completed',
  'path_completed'
);
