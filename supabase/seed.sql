-- Bokaro Defence Academy — seed.sql (SAMPLE DATA)
-- ⚠️ All content below is SAMPLE/PLACEHOLDER data, clearly labeled, for development.
-- It contains NO real academy claims, no real student results, and no secrets.
-- Run with: supabase db reset   (or psql -f seed.sql)

-- Site settings (single row)
insert into site_settings (
  id, academy_name, tagline, address, phone, whatsapp, email, business_hours,
  hero_heading, hero_description, hero_primary_label, hero_primary_href,
  hero_secondary_label, hero_secondary_href,
  admission_status_text, announcement_text, announcement_enabled,
  about_overview, about_history, mission, vision, teaching_approach,
  directors_message, footer_description,
  seo_title, seo_description,
  attendance_enabled, ranking_enabled, submissions_enabled, chatbot_enabled,
  floating_call_enabled, floating_whatsapp_enabled
) values (
  1,
  'Bokaro Defence Academy',
  'Discipline. Guidance. Selection.',
  'SAMPLE ADDRESS — Sector 4, Bokaro Steel City, Jharkhand 827004 (edit in Admin → Site Settings)',
  '+91 00000 00000',
  '910000000000',
  'contact@example.com',
  'Mon–Sat: 8:00 AM – 7:00 PM, Sunday: Closed (sample)',
  'Prepare with discipline. Serve with honour.',
  'Structured coaching for NDA, CDS, AFCAT and Agniveer aspirants — sample copy, editable in the admin dashboard.',
  'Apply Now', '/admissions',
  'Explore Courses', '/courses',
  'Admissions Open — sample status text',
  'SAMPLE NOTICE: New session batches starting soon. Contact the office for details.',
  true,
  'Bokaro Defence Academy is a SAMPLE sample overview text. Replace this with the academy''s real overview from Admin → Website Content → About.',
  'SAMPLE history text — the real founding story should be added by academy staff.',
  'SAMPLE mission statement text.',
  'SAMPLE vision statement text.',
  'SAMPLE teaching approach text describing classroom method, tests and physical training.',
  'SAMPLE director''s message. The academy director should replace this with a personal message.',
  'Bokaro Defence Academy — disciplined coaching for defence aspirants. (sample footer text)',
  'Bokaro Defence Academy — NDA, CDS & Agniveer Coaching in Bokaro',
  'Structured coaching for NDA, CDS, AFCAT and Agniveer with disciplined routines, regular tests and physical training. Sample meta description — replace with approved copy.',
  true, true, true, true, true, true
) on conflict (id) do nothing;

-- Sample social links (disabled until real URLs are added)
insert into social_links (platform, url, display_order, is_enabled) values
  ('facebook', 'https://facebook.com/example-handle', 10, false),
  ('instagram', 'https://instagram.com/example-handle', 20, false),
  ('youtube', 'https://youtube.com/@example-handle', 30, false),
  ('whatsapp', 'https://wa.me/910000000000', 40, false),
  ('linkedin', 'https://linkedin.com/company/example-handle', 50, false),
  ('twitter', 'https://x.com/example-handle', 60, false)
on conflict (platform) do nothing;

-- Sample academic session
insert into academic_sessions (name, start_date, end_date, is_active) values
  ('2025-26 (sample)', '2025-04-01', '2026-03-31', true)
on conflict do nothing;

-- Sample courses — clearly labeled sample courses
insert into courses (title, slug, short_description, full_description, eligibility, age_criteria, duration, subjects, batch_timings, fee_display, mode, seats_total, seats_available, admission_status, is_featured, display_order, status) values
  ('NDA Foundation (Sample)', 'nda-foundation-sample',
   'Sample course covering NDA written exam preparation with mathematics and general ability.',
   'SAMPLE COURSE. This placeholder course demonstrates the course page layout. Replace with the academy''s real course details from the admin dashboard. Covers Mathematics and General Ability Test preparation with weekly tests.',
   'Class 11/12 or passed (sample)', '16–19 years (sample)', '12 months (sample)',
   array['Mathematics','English','General Knowledge','Physics','Chemistry'],
   'Morning & evening batches (sample)', 'Contact for fee', 'offline',
   60, 18, 'open', true, 10, 'published'),
  ('CDS Target (Sample)', 'cds-target-sample',
   'Sample course for graduate-level CDS preparation covering English, GK and Elementary Mathematics.',
   'SAMPLE COURSE. Placeholder demonstrating CDS course page. Replace with real content via admin.',
   'Graduate or final-year (sample)', '19–25 years (sample)', '9 months (sample)',
   array['English','General Knowledge','Elementary Mathematics'],
   'Evening batch (sample)', 'Contact for fee', 'offline',
   40, 22, 'open', true, 20, 'published'),
  ('Agniveer Prep (Sample)', 'agniveer-prep-sample',
   'Sample course for Agniveer written and fitness preparation.',
   'SAMPLE COURSE. Placeholder demonstrating Agniveer course page. Replace with real content via admin.',
   'Class 10/12 (sample)', '17–21 years (sample)', '6 months (sample)',
   array['General Science','Mathematics','Reasoning','Physical Training'],
   'Morning batch (sample)', 'Contact for fee', 'hybrid',
   50, 30, 'open', false, 30, 'published')
on conflict (slug) do nothing;

-- Sample batches
insert into batches (course_id, name, timing, start_date, capacity, admission_status)
select c.id, b.nm, b.tm, b.sd, b.cap, 'open'
from courses c
join (values
  ('nda-foundation-sample', 'Morning A (sample)', '6:00–8:00 AM (sample)', current_date + 30, 40),
  ('nda-foundation-sample', 'Evening A (sample)', '5:00–7:00 PM (sample)', current_date + 45, 40),
  ('cds-target-sample', 'Evening Batch (sample)', '6:00–8:30 PM (sample)', current_date + 60, 30)
) as b(slug, nm, tm, sd, cap) on b.slug = c.slug
where not exists (select 1 from batches bb where bb.course_id = c.id and bb.name = b.nm);

-- Sample subjects
insert into subjects (name, course_id, display_order)
select s.nm, c.id, s.ord
from courses c
join (values
  ('nda-foundation-sample','Mathematics',10),
  ('nda-foundation-sample','English',20),
  ('nda-foundation-sample','General Knowledge',30),
  ('cds-target-sample','English',10),
  ('cds-target-sample','General Knowledge',20),
  ('cds-target-sample','Elementary Mathematics',30)
) as s(slug, nm, ord) on s.slug = c.slug
where not exists (select 1 from subjects sb where sb.course_id = c.id and sb.name = s.nm);

-- Sample notices (public)
insert into notices (title, description, publish_date, audience, is_pinned, status) values
  ('Sample Notice — New Session Batches', 'This is a SAMPLE notice. New session batches will be announced here. Replace with real notices from the admin dashboard.', current_date, 'public', true, 'published'),
  ('Sample Notice — Study Materials Available', 'This is a SAMPLE notice describing study material availability.', current_date - 10, 'public', false, 'published')
on conflict do nothing;

-- Sample FAQs (chatbot knowledge base)
insert into chatbot_faqs (question, answer, category, is_published) values
  ('What courses do you offer?', 'We offer coaching for NDA, CDS and Agniveer examinations. See the Courses page for current offerings and batch timings. (sample answer — edit in Admin → Chatbot FAQ)', 'Courses', true),
  ('How do I apply for admission?', 'You can apply through the Admissions page by filling the inquiry form, calling the office, or messaging us on WhatsApp. (sample answer)', 'Admissions', true),
  ('What documents are needed for admission?', 'Commonly required documents include recent photographs, a photo ID, and the latest marksheet. Confirm the exact list with the office during admission. (sample answer)', 'Admissions', true),
  ('Do you provide physical training?', 'Defence exam preparation typically includes physical fitness sessions. Contact the office for the current schedule. (sample answer)', 'Training', true),
  ('What are the batch timings?', 'Batch timings vary by course and are listed on each course page. Contact the office for the latest schedule. (sample answer)', 'Batches', true)
on conflict do nothing;

-- Sample public resources
insert into public_resources (title, description, resource_type, external_link, status) values
  ('Sample NDA Syllabus Overview', 'SAMPLE resource — a placeholder syllabus overview. Replace with the official syllabus document.', 'syllabus', null, 'published'),
  ('Sample Study Tips Article', 'SAMPLE study-tips resource for exam preparation.', 'study_tips', 'https://www.example.com', 'published')
on conflict do nothing;

-- Sample faculty profile
insert into faculty_profiles (name, designation, subject_area, bio, is_published, display_order) values
  ('Sample Faculty Member', 'SAMPLE — Faculty of Mathematics', 'Mathematics',
   'This is a sample faculty profile. Real faculty profiles should be added by the academy with verified information and proper photographs.', true, 10)
on conflict do nothing;

-- Sample gallery album
insert into gallery_albums (title, description, event_date, category, status) values
  ('Sample Album — Classroom Session', 'SAMPLE gallery album. Replace with real academy photographs (with consent) via the admin dashboard.', current_date - 15, 'Academics', 'published')
on conflict do nothing;

-- Sample achievement — draft and UNPUBLISHED, flagged sample
insert into achievements (student_name, examination, rank_display, year, description, is_featured, consent_recorded, status) values
  ('SAMPLE Student (No Real Result)', 'Sample Examination', 'SAMPLE — Not a real result', 2025,
   'This is sample achievement data to demonstrate layout. It is kept in DRAFT status and must never be published as a real claim.', false, false, 'draft')
on conflict do nothing;

-- Sample testimonial — unapproved by default
insert into testimonials (name, course, quote, rating, is_approved, is_featured) values
  ('Sample Student Name', 'NDA Foundation (Sample)', 'This is a sample testimonial to demonstrate layout. Real testimonials require student consent and admin approval before publishing.', 5, false, false)
on conflict do nothing;

-- Sample student & teacher records (no linked user accounts, no passwords)
insert into teachers (full_name, email, specialization, is_active, can_publish_results) values
  ('Sample Teacher One', 'teacher1@example.com', 'Mathematics', true, false)
on conflict do nothing;
insert into teachers (full_name, email, specialization, is_active, can_publish_results) values
  ('Sample Teacher Two', 'teacher2@example.com', 'General Knowledge', true, true)
on conflict do nothing;

insert into students (student_code, full_name, email, city, is_active) values
  ('BDA-2025-0001', 'Sample Student One', 'student1@example.com', 'Bokaro (sample)', true),
  ('BDA-2025-0002', 'Sample Student Two', 'student2@example.com', 'Bokaro (sample)', true)
on conflict do nothing;

-- Enroll sample students into a sample batch
insert into enrollments (student_id, batch_id)
select s.id, b.id
from students s, batches b
where s.student_code = 'BDA-2025-0001' and b.name = 'Morning A (sample)'
  and not exists (select 1 from enrollments e where e.student_id = s.id and e.batch_id = b.id);

insert into enrollments (student_id, batch_id)
select s.id, b.id
from students s, batches b
where s.student_code = 'BDA-2025-0002' and b.name = 'Evening A (sample)'
  and not exists (select 1 from enrollments e where e.student_id = s.id and e.batch_id = b.id);
