-- Bokaro Defence Academy — 00005: site settings, page content, social links, audit logs

create table if not exists site_settings (
  id int primary key default 1 check (id = 1),
  academy_name text not null default 'Bokaro Defence Academy',
  logo_url text,
  favicon_url text,
  tagline text,
  address text,
  map_url text,
  phone text,
  phone_secondary text,
  whatsapp text,
  email text,
  business_hours text,
  hero_heading text,
  hero_description text,
  hero_image_url text,
  hero_image_position text not null default 'center',
  hero_primary_label text,
  hero_primary_href text,
  hero_secondary_label text,
  hero_secondary_href text,
  admission_status_text text,
  announcement_text text,
  announcement_enabled boolean not null default false,
  about_overview text,
  about_history text,
  mission text,
  vision text,
  teaching_approach text,
  directors_message text,
  directors_photo_url text,
  footer_description text,
  seo_title text,
  seo_description text,
  og_image_url text,
  attendance_enabled boolean not null default true,
  ranking_enabled boolean not null default true,
  submissions_enabled boolean not null default true,
  chatbot_enabled boolean not null default true,
  floating_call_enabled boolean not null default true,
  floating_whatsapp_enabled boolean not null default true,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table site_settings is 'Single-row table (id=1) holding all editable website content and feature toggles.';

create table if not exists social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique check (platform in ('facebook','instagram','youtube','whatsapp','linkedin','twitter')),
  url text not null,
  display_order int not null default 100,
  is_enabled boolean not null default true
);

create table if not exists page_sections (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  section_key text not null,
  heading text,
  body text,
  image_url text,
  image_position text not null default 'center',
  data jsonb not null default '{}',
  updated_by uuid references auth.users(id),
  unique (page_key, section_key)
);
comment on table page_sections is 'Flexible per-page editable sections; the admin CMS lists known keys and writes here.';

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
comment on table audit_logs is 'Append-only. Written via record_audit() from triggers and privileged actions.';