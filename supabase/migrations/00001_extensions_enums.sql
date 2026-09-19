-- Bokaro Defence Academy — 00001: extensions & enums
create extension if not exists "pgcrypto";

-- Enums centralize state so RLS and app logic share one source of truth.
do $$ begin
  create type app_role as enum ('super_admin', 'admin', 'teacher', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type admission_status as enum ('open', 'filling_fast', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type course_mode as enum ('offline', 'online', 'hybrid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_status as enum ('new','contacted','interested','follow_up','admitted','closed','spam');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_mark as enum ('present', 'absent', 'late', 'excused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type test_type as enum ('weekly','monthly','mock','physical','interview','custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type marks_status as enum ('draft', 'published', 'locked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inquiry_status as enum ('new','contacted','interested','follow_up','admitted','closed','spam');
exception when duplicate_object then null; end $$;
