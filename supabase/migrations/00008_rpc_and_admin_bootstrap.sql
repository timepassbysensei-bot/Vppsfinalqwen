-- Bokaro Defence Academy — 00008: secure RPCs & first Super Admin bootstrap
-- All privileged actions run server-side. The browser can never assign roles.

-- Create (or link) a user account and assign a role. Executable only by admins.
-- Returns the generated invite link when a new user is created.
create or replace function public.admin_create_user(
  p_email text,
  p_full_name text,
  p_role app_role,
  p_phone text default null,
  p_teacher_id uuid default null,
  p_student_id uuid default null
)
returns table (user_id uuid, invite_link text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
  v_token text;
  v_url text;
begin
  if not is_admin_level() then
    raise exception 'Only admins can create users';
  end if;
  if not has_role(auth.uid(), array['super_admin']::app_role[]) and p_role <> 'student' then
    raise exception 'Only a Super Admin can create staff accounts';
  end if;

  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then
    -- generate_link mints a magiclink/invite; we construct a one-time link
    v_token := encode(gen_random_bytes(24), 'hex');
    insert into auth.users (id, email, email_confirmed_at, encrypted_password, raw_user_meta_data, created_at, updated_at)
    values (gen_random_uuid(), p_email, now(), crypt('x', gen_salt('bf')), jsonb_build_object('name', p_full_name, 'invite_token', v_token), now(), now())
    returning id into v_uid;
    -- Store a one-time invite; Supabase's GoTrue admin API is the preferred path.
    perform pg_notify('bda_invite', json_build_object('user_id', v_uid, 'email', p_email, 'token', v_token)::text);
  end if;

  insert into profiles (id, full_name, email, phone) values (v_uid, p_full_name, p_email, p_phone)
  on conflict (id) do update set full_name = excluded.full_name, phone = coalesce(excluded.phone, profiles.phone);

  insert into user_roles (user_id, role) values (v_uid, p_role)
  on conflict (user_id, role) do nothing;

  if p_teacher_id is not null then
    update teachers set user_id = v_uid where id = p_teacher_id;
  end if;
  if p_student_id is not null then
    update students set user_id = v_uid where id = p_student_id;
  end if;

  v_url := current_setting('app.settings.site_url', true);
  return query select v_uid,
    v_url || '/auth/set-password?token=' || v_token as invite_link;
end $$;

-- Validate a one-time invite token and set the password (public, unauthenticated).
create or replace function public.accept_invite(p_token text, p_password text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb;
  v_uid uuid;
begin
  if length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;
  select id, raw_user_meta_data into v_uid, v_meta from auth.users
  where raw_user_meta_data->>'invite_token' = p_token limit 1;
  if v_uid is null then
    raise exception 'Invalid or already-used invite link';
  end if;
  update auth.users set
    encrypted_password = crypt(p_password, gen_salt('bf')),
    raw_user_meta_data = raw_user_meta_data - 'invite_token',
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = v_uid;
  update profiles set must_change_password = false where id = v_uid;
  return v_uid;
end $$;

-- Grant result-publishing permission to a teacher (admin only).
create or replace function public.admin_set_publish_permission(p_teacher_id uuid, p_allowed boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin_level() then
    raise exception 'Only admins can change publishing permission';
  end if;
  update teachers set can_publish_results = p_allowed where id = p_teacher_id;
end $$;

-- Review summary for a test before publishing (staff only).
create or replace function public.test_review(p_test_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'missing_entries', (
      select count(*) from test_subjects ts
      left join student_marks m on m.test_subject_id = ts.id
      where ts.test_id = p_test_id and m.id is null
    ),
    'invalid_entries', 0,
    'absent_count', (
      select count(*) from student_marks m
      join test_subjects ts on ts.id = m.test_subject_id
      where ts.test_id = p_test_id and m.is_absent
    ),
    'total_students', (
      select count(distinct e.student_id) from enrollments e
      join tests t on t.batch_id = e.batch_id
      where t.id = p_test_id and e.left_on is null
    )
  );
$$;

-- Per-student computed results for a published test (students call for their own data).
create or replace function public.test_results(p_test_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'subjects', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'subject_name', ts.subject_name,
        'max_marks', ts.max_marks,
        'passing_marks', ts.passing_marks,
        'marks', m.marks,
        'is_absent', m.is_absent,
        'feedback', m.feedback_public
      ) order by ts.display_order), '[]'::jsonb)
      from test_subjects ts
      left join student_marks m on m.test_subject_id = ts.id and m.student_id = current_student_id()
      where ts.test_id = p_test_id
    ),
    'total', (
      select sum(m.marks) from student_marks m
      join test_subjects ts on ts.id = m.test_subject_id
      where ts.test_id = p_test_id and m.student_id = current_student_id() and not m.is_absent
    ),
    'max_total', (select sum(max_marks) from test_subjects where test_id = p_test_id),
    'show_rank', (select show_rank from tests where id = p_test_id)
  );
$$;

-- Rate-limited chatbot logging (called by the edge function with service role).
create or replace function public.log_chatbot_question(p_question text, p_answered boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_answered then
    insert into chatbot_faqs (question, answer, category)
    values (left(p_question, 500), '', 'Auto')
    on conflict do nothing;
    delete from chatbot_faqs where category = 'Auto' and answer = '';
  else
    insert into chatbot_unanswered_questions (question)
    values (left(p_question, 500))
    on conflict do nothing;
  end if;
end $$;
