-- Bokaro Defence Academy — 00006: helper functions & triggers
-- Security model: role checks run as SQL functions marked SECURITY DEFINER with
-- `set search_path = public` so RLS policies cannot be bypassed via search_path tricks.

create or replace function public.has_role(uid uuid, roles app_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = uid and ur.role = any(roles)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select has_role(auth.uid(), array['super_admin','admin','teacher']::app_role[]);
$$;

create or replace function public.is_admin_level()
returns boolean
language sql stable security definer set search_path = public
as $$
  select has_role(auth.uid(), array['super_admin','admin']::app_role[]);
$$;

create or replace function public.current_student_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select s.id from students s where s.user_id = auth.uid() and s.archived_at is null limit 1;
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select t.id from teachers t where t.user_id = auth.uid() and t.archived_at is null limit 1;
$$;

-- Returns ids of batches a teacher may access (null = all, staff-only shortcut).
create or replace function public.teacher_batch_ids(tid uuid)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select distinct b.id
  from batches b
  where exists (
    select 1 from teacher_assignments ta
    where ta.teacher_id = tid
      and (ta.batch_id = b.id or (ta.batch_id is null and ta.course_id = b.course_id))
  )
  union
  select b.id from batches b where b.teacher_id = tid;
$$;

create or replace function public.teacher_can_access_batch(tid uuid, bid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from teacher_batch_ids(tid) where teacher_batch_ids = bid);
$$;

create or replace function public.teacher_can_access_subject(tid uuid, sid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from teacher_assignments ta
    where ta.teacher_id = tid and ta.subject_id = sid
  ) or is_admin_level();
$$;

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','teachers','students','academic_sessions','courses','batches','subjects',
    'tests','student_marks','attendance_sessions','assignments','assignment_submissions',
    'resources','inquiries','message_threads','notices','achievements','testimonials',
    'gallery_albums','media_assets','faculty_profiles','chatbot_faqs','public_resources',
    'site_settings','page_sections'
  ] loop
    execute format('drop trigger if exists trg_touch_%1$s on %1$s; create trigger trg_touch_%1$s before update on %1$s for each row execute function touch_updated_at();', t);
  end loop;
end $$;

-- Audit logging helper
create or replace function public.record_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor uuid := auth.uid();
begin
  insert into audit_logs (actor, action, entity, entity_id, details)
  values (
    actor,
    tg_op,
    tg_table_name,
    coalesce(new.id::text, old.id::text),
    jsonb_build_object('at', now())
  );
  return coalesce(new, old);
end $$;

-- Audit: any change to published tests and user roles is recorded.
drop trigger if exists trg_audit_tests on tests;
create trigger trg_audit_tests after insert or update or delete on tests
for each row execute function record_audit();

drop trigger if exists trg_audit_roles on user_roles;
create trigger trg_audit_roles after insert or delete on user_roles
for each row execute function record_audit();

-- Enforce published-test protection + publish bookkeeping
create or replace function public.guard_test_publish()
returns trigger language plpgsql as $$
begin
  if old.status in ('published','locked') and new.status = 'published' then
    -- changing content of published tests requires admin and is audited
    if not is_admin_level() then
      raise exception 'Published results cannot be modified without admin permission';
    end if;
    insert into audit_logs (actor, action, entity, entity_id, details)
    values (auth.uid(), 'PUBLISHED_TEST_EDITED', 'tests', new.id::text, jsonb_build_object('at', now()));
  end if;
  if old.status = 'draft' and new.status in ('published','locked') then
    new.published_by := auth.uid();
    new.published_at := now();
  end if;
  if new.status = 'locked' then
    new.locked_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_tests on tests;
create trigger trg_guard_tests before update on tests
for each row execute function guard_test_publish();

-- Prevent public inserts claiming staff roles; ensure inquiries always start as new
create or replace function public.guard_inquiry_insert()
returns trigger language plpgsql as $$
begin
  new.status := 'new';
  new.assigned_to := null;
  new.internal_notes := null;
  return new;
end $$;

drop trigger if exists trg_inquiry_guard on inquiries;
create trigger trg_inquiry_guard before insert on inquiries
for each row execute function guard_inquiry_insert();
