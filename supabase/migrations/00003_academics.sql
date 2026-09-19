-- Bokaro Defence Academy — 00003: tests, marks, attendance, assignments, resources

create table if not exists tests (
  id uuid primary key default gen_random_uuid(),
  academic_session_id uuid references academic_sessions(id) on delete set null,
  course_id uuid not null references courses(id) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  name text not null,
  test_type test_type not null default 'weekly',
  test_date date not null default current_date,
  instructions text,
  show_rank boolean not null default false,
  status marks_status not null default 'draft',
  published_by uuid references auth.users(id),
  published_at timestamptz,
  locked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, name, test_date)
);

create table if not exists test_subjects (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  subject_name text not null,
  max_marks numeric not null check (max_marks > 0),
  passing_marks numeric not null default 0 check (passing_marks >= 0),
  display_order int not null default 100
);
comment on table test_subjects is 'Denormalized subject_name keeps the marks sheet stable if a subject is later archived.';

create table if not exists student_marks (
  id uuid primary key default gen_random_uuid(),
  test_subject_id uuid not null references test_subjects(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  marks numeric,
  is_absent boolean not null default false,
  remarks_internal text,
  feedback_public text,
  entered_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (test_subject_id, student_id)
);
comment on table student_marks is 'marks is NULL when absent or not yet entered — NULL is never treated as zero.';

create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  session_date date not null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, session_date)
);

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status attendance_mark not null default 'present',
  note text,
  marked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  instructions text,
  due_date date,
  attachment_url text,
  external_link text,
  allow_submissions boolean not null default true,
  status content_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  file_url text,
  note text,
  submitted_at timestamptz not null default now(),
  feedback text,
  feedback_by uuid references auth.users(id),
  viewed_at timestamptz,
  unique (assignment_id, student_id)
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course_id uuid references courses(id) on delete cascade,
  batch_id uuid references batches(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  resource_type text not null default 'study_material',
  file_url text,
  external_link text,
  visibility content_status not null default 'published',
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tests_batch on tests (batch_id);
create index if not exists idx_tests_status on tests (status);
create index if not exists idx_marks_ts on student_marks (test_subject_id);
create index if not exists idx_marks_student on student_marks (student_id);
create index if not exists idx_att_session on attendance_records (session_id);
create index if not exists idx_att_student on attendance_records (student_id);
create index if not exists idx_assign_batch on assignments (batch_id);
create index if not exists idx_submissions_student on assignment_submissions (student_id);
