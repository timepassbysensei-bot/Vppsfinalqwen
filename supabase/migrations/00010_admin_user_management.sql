-- Bokaro Defence Academy — 00010: admin user & role management
-- The browser can never write to user_roles directly (no INSERT/UPDATE/DELETE
-- policy exists). Every change goes through one of these SECURITY DEFINER
-- functions, each of which re-checks the caller's own role server-side.

-- List every account with its roles, for the User Roles screen.
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  is_active boolean,
  must_change_password boolean,
  roles app_role[],
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    u.id,
    u.email::text,
    coalesce(p.full_name, u.raw_user_meta_data->>'name', ''),
    coalesce(p.is_active, true),
    coalesce(p.must_change_password, false),
    coalesce(
      (select array_agg(ur.role order by ur.role) from user_roles ur where ur.user_id = u.id),
      array[]::app_role[]
    ),
    u.created_at
  from auth.users u
  left join profiles p on p.id = u.id
  where is_admin_level()
  order by u.created_at desc;
$$;

-- Grant a role. Only a Super Admin may grant staff roles; admins may grant
-- 'student'. A Super Admin can never be created by anyone but a Super Admin.
create or replace function public.admin_grant_role(p_user_id uuid, p_role app_role)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin_level() then
    raise exception 'Only admins can change roles';
  end if;
  if p_role in ('admin', 'super_admin') and not has_role(auth.uid(), array['super_admin']::app_role[]) then
    raise exception 'Only a Super Admin can grant admin roles';
  end if;
  if p_role = 'teacher' and not has_role(auth.uid(), array['super_admin']::app_role[]) then
    raise exception 'Only a Super Admin can grant the teacher role';
  end if;

  insert into user_roles (user_id, role, assigned_by)
  values (p_user_id, p_role, auth.uid())
  on conflict (user_id, role) do nothing;
end $$;

-- Revoke a role. A Super Admin cannot revoke their own last Super Admin role,
-- which prevents locking the academy out of its own dashboard.
create or replace function public.admin_revoke_role(p_user_id uuid, p_role app_role)
returns void
language plpgsql security definer set search_path = public as $$
declare remaining int;
begin
  if not has_role(auth.uid(), array['super_admin']::app_role[]) then
    raise exception 'Only a Super Admin can revoke roles';
  end if;

  if p_role = 'super_admin' then
    select count(*) into remaining
    from user_roles
    where role = 'super_admin' and user_id <> p_user_id;
    if remaining = 0 then
      raise exception 'At least one Super Admin must remain';
    end if;
  end if;

  delete from user_roles where user_id = p_user_id and role = p_role;
end $$;

-- Activate / deactivate an account without deleting it (keeps marks & history).
create or replace function public.admin_set_user_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin_level() then
    raise exception 'Only admins can change account status';
  end if;
  if p_user_id = auth.uid() and not p_active then
    raise exception 'You cannot deactivate your own account';
  end if;

  insert into profiles (id, full_name, email, is_active)
  select u.id, coalesce(u.raw_user_meta_data->>'name', ''), u.email::text, p_active
  from auth.users u where u.id = p_user_id
  on conflict (id) do update set is_active = excluded.is_active;
end $$;

-- Sensible defaults so a brand-new academy has an editable site row.
alter table site_settings alter column academy_name set default 'Bokaro Defence Academy';
