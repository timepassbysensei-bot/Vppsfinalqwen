-- Bokaro Defence Academy — 00002: core academic tables
-- Conventions: uuid PKs, created_at/updated_at, created_by, archived_at for soft deletion.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table profiles is 'Public profile data for every authenticated user. Roles live in user_roles.';

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
comment on table user_roles is 'Server-side role assignments. The browser can never insert here directly.';

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  specialization text,
  bio text,
  photo_url text,
  is_active boolean not null default true,
  can_publish_results boolean not null default false,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table teachers is 'Teacher records. Linking user_id grants dashboard access.';

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  student_code text unique not null,
  full_name text not null,
  email text,
  phone text,
  date_of_birth date,
  gender text,
  guardian_name text,
  guardian_phone text,
  emergency_contact text,
  address text,
  city text,
  joined_on date default current_date,
  notes text,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table students is 'Student records. student_code is the readable academy student ID.';

create table if not exists academic_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  thumbnail_url text,
  short_description text,
  full_description text,
  eligibility text,
  age_criteria text,
  duration text,
  subjects text[] not null default '{}',
  batch_timings text,
  fee_display text,
  mode course_mode not null default 'offline',
  seats_total int,
  seats_available int,
  admission_status admission_status not null default 'open',
  is_featured boolean not null default false,
  display_order int not null default 100,
  syllabus_url text,
  status content_status not null default 'draft',
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  academic_session_id uuid references academic_sessions(id) on delete set null,
  name text not null,
  timing text,
  start_date date,
  end_date date,
  capacity int,
  teacher_id uuid references teachers(id) on delete set null,
  admission_status admission_status not null default 'open',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, name)
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  course_id uuid references courses(id) on delete cascade,
  display_order int not null default 100,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, course_id)
);

create table if not exists teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  batch_id uuid references batches(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (teacher_id, course_id, batch_id, subject_id)
);
comment on table teacher_assignments is 'Scope of what a teacher may access. NULL columns act as wildcards.';

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  enrolled_on date not null default current_date,
  left_on date,
  created_at timestamptz not null default now(),
  unique (student_id, batch_id)
);

create index if not exists idx_courses_slug on courses (slug);
create index if not exists idx_courses_status on courses (status) where archived_at is null;
create index if not exists idx_batches_course on batches (course_id);
create index if not exists idx_enroll_batch on enrollments (batch_id);
create index if not exists idx_enroll_student on enrollments (student_id);
create index if not exists idx_ta_teacher on teacher_assignments (teacher_id);
create index if not exists idx_students_name on students (lower(full_name));
create index if not exists idx_students_code on students (student_code);
