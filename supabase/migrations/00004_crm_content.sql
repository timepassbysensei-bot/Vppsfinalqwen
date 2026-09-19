-- Bokaro Defence Academy — 00004: CRM, messaging, public content

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  whatsapp text,
  email text,
  city text,
  interested_course text,
  preferred_batch text,
  message text,
  source_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status inquiry_status not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  follow_up_date date,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table inquiries is 'Admission leads from public forms. Public visitors may insert with status forced to new; only staff can update.';

create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid references teachers(id) on delete set null,
  category text not null default 'general',
  subject text not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_user_id uuid references auth.users(id),
  sender_role text not null,
  body text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  publish_date date not null default current_date,
  expiry_date date,
  attachment_url text,
  audience text not null default 'public' check (audience in ('public','all_students','course','batch','teachers','admins')),
  course_id uuid references courses(id) on delete cascade,
  batch_id uuid references batches(id) on delete cascade,
  is_pinned boolean not null default false,
  status content_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  photo_url text,
  examination text not null,
  rank_display text not null,
  course_id uuid references courses(id) on delete set null,
  year int not null,
  description text,
  is_featured boolean not null default false,
  consent_recorded boolean not null default false,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table achievements is 'consent_recorded=false must hide photo and shorten name in public queries.';

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  course text,
  quote text not null,
  rating int not null default 5 check (rating between 1 and 5),
  is_approved boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  event_date date,
  category text,
  display_order int not null default 100,
  status content_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gallery_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references gallery_albums(id) on delete cascade,
  image_url text not null,
  caption text,
  display_order int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  width int,
  height int,
  alt_text text not null default '',
  caption text,
  category text not null default 'Gallery',
  focal_position text not null default 'center',
  usage_refs text[] not null default '{}',
  is_archived boolean not null default false,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);
comment on table media_assets is 'Media Library index. usage_refs tracks where an image is used so deletion can warn.';

create table if not exists faculty_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  designation text,
  subject_area text,
  bio text,
  photo_url text,
  display_order int not null default 100,
  is_published boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chatbot_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'General',
  is_published boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chatbot_unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  asked_count int not null default 1,
  first_asked_at timestamptz not null default now(),
  last_asked_at timestamptz not null default now(),
  resolved_faq_id uuid references chatbot_faqs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  resource_type text not null default 'syllabus' check (resource_type in ('syllabus','sample_paper','exam_notification','study_tips','prospectus','useful_link')),
  file_url text,
  external_link text,
  status content_status not null default 'published',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inquiries_status on inquiries (status);
create index if not exists idx_inquiries_phone on inquiries (phone);
create index if not exists idx_threads_student on message_threads (student_id);
create index if not exists idx_messages_thread on messages (thread_id);
create index if not exists idx_notices_status on notices (status, publish_date);
create index if not exists idx_ach_status on achievements (status, year);
create index if not exists idx_media_cat on media_assets (category) where is_archived = false;
create index if not exists idx_faqs_pub on chatbot_faqs (is_published) where archived_at is null;
