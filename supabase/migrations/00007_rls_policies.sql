-- Bokaro Defence Academy — 00007: Row Level Security
-- Principle: deny by default; explicit policies per table; helpers from 00006.

alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table academic_sessions enable row level security;
alter table courses enable row level security;
alter table batches enable row level security;
alter table subjects enable row level security;
alter table teacher_assignments enable row level security;
alter table enrollments enable row level security;
alter table tests enable row level security;
alter table test_subjects enable row level security;
alter table student_marks enable row level security;
alter table attendance_sessions enable row level security;
alter table attendance_records enable row level security;
alter table assignments enable row level security;
alter table assignment_submissions enable row level security;
alter table resources enable row level security;
alter table inquiries enable row level security;
alter table message_threads enable row level security;
alter table messages enable row level security;
alter table notices enable row level security;
alter table achievements enable row level security;
alter table testimonials enable row level security;
alter table gallery_albums enable row level security;
alter table gallery_images enable row level security;
alter table media_assets enable row level security;
alter table faculty_profiles enable row level security;
alter table chatbot_faqs enable row level security;
alter table chatbot_unanswered_questions enable row level security;
alter table public_resources enable row level security;
alter table site_settings enable row level security;
alter table social_links enable row level security;
alter table page_sections enable row level security;
alter table audit_logs enable row level security;

-- profiles: self read/update (limited), admins read all
drop policy if exists p_profiles_select on profiles;
create policy p_profiles_select on profiles for select
  using (id = auth.uid() or is_admin_level());

drop policy if exists p_profiles_update on profiles;
create policy p_profiles_update on profiles for update
  using (id = auth.uid() or is_admin_level())
  with check (id = auth.uid() or is_admin_level());

-- user_roles: readable only by admins; NO insert/update policies for clients.
-- Role assignment happens only via the secure RPC (00008) using the service role.
drop policy if exists p_roles_select on user_roles;
create policy p_roles_select on user_roles for select
  using (is_admin_level() or user_id = auth.uid());

-- teachers: staff can read; self can read own row; admins manage
drop policy if exists p_teachers_select on teachers;
create policy p_teachers_select on teachers for select
  using ((user_id = auth.uid() and archived_at is null) or is_staff());

drop policy if exists p_teachers_write on teachers;
create policy p_teachers_write on teachers for all
  using (is_admin_level()) with check (is_admin_level());

-- students: admins manage; staff read; student reads own row
drop policy if exists p_students_select on students;
create policy p_students_select on students for select
  using ((user_id = auth.uid()) or is_staff());

drop policy if exists p_students_write on students;
create policy p_students_write on students for all
  using (is_admin_level()) with check (is_admin_level());

-- academic sessions / subjects / teacher_assignments: staff scoped
drop policy if exists p_sessions_select on academic_sessions;
create policy p_sessions_select on academic_sessions for select using (is_staff());

drop policy if exists p_sessions_write on academic_sessions;
create policy p_sessions_write on academic_sessions for all
  using (is_admin_level()) with check (is_admin_level());

drop policy if exists p_subjects_select on subjects;
create policy p_subjects_select on subjects for select using (is_staff());

drop policy if exists p_subjects_write on subjects;
create policy p_subjects_write on subjects for all
  using (is_admin_level()) with check (is_admin_level());

drop policy if exists p_ta_select on teacher_assignments;
create policy p_ta_select on teacher_assignments for select
  using (is_admin_level() or teacher_id = current_teacher_id());

drop policy if exists p_ta_write on teacher_assignments;
create policy p_ta_write on teacher_assignments for all
  using (is_admin_level()) with check (is_admin_level());

-- enrollments: staff read; student reads own
drop policy if exists p_enroll_select on enrollments;
create policy p_enroll_select on enrollments for select
  using (is_staff() or student_id = current_student_id());

drop policy if exists p_enroll_write on enrollments;
create policy p_enroll_write on enrollments for all
  using (is_admin_level()) with check (is_admin_level());

-- courses / batches: public reads published; staff manage
drop policy if exists p_courses_select on courses;
create policy p_courses_select on courses for select
  using ((status = 'published' and archived_at is null) or is_staff());

drop policy if exists p_courses_write on courses;
create policy p_courses_write on courses for all
  using (is_admin_level()) with check (is_admin_level());

drop policy if exists p_batches_select on batches;
create policy p_batches_select on batches for select
  using (
    is_staff()
    or exists (
      select 1 from courses c
      where c.id = batches.course_id and c.status = 'published' and c.archived_at is null
    )
  );

drop policy if exists p_batches_write on batches;
create policy p_batches_write on batches for all
  using (is_admin_level()) with check (is_admin_level());

-- tests: staff scoped; students read only published/locked for their batch
drop policy if exists p_tests_select on tests;
create policy p_tests_select on tests for select
  using (
    is_admin_level()
    or (
      (current_teacher_id() is not null and teacher_can_access_batch(current_teacher_id(), tests.batch_id))
      or exists (select 1 from enrollments e where e.student_id = current_student_id() and e.batch_id = tests.batch_id)
    ) and tests.status in ('published','locked')
  );

drop policy if exists p_tests_write on tests;
create policy p_tests_write on tests for all
  using (
    is_admin_level()
    or (current_teacher_id() is not null and teacher_can_access_batch(current_teacher_id(), tests.batch_id))
  ) with check (
    is_admin_level()
    or (current_teacher_id() is not null and teacher_can_access_batch(current_teacher_id(), tests.batch_id))
  );

drop policy if exists p_test_subjects_select on test_subjects;
create policy p_test_subjects_select on test_subjects for select
  using (
    is_staff()
    or exists (
      select 1 from tests t
      join enrollments e on e.batch_id = t.batch_id
      where t.id = test_subjects.test_id and e.student_id = current_student_id() and t.status in ('published','locked')
    )
  );

drop policy if exists p_test_subjects_write on test_subjects;
create policy p_test_subjects_write on test_subjects for all
  using (
    is_admin_level()
    or exists (select 1 from tests t where t.id = test_subjects.test_id and teacher_can_access_batch(current_teacher_id(), t.batch_id))
  ) with check (
    is_admin_level()
    or exists (select 1 from tests t where t.id = test_subjects.test_id and teacher_can_access_batch(current_teacher_id(), t.batch_id))
  );

-- student_marks: teachers of the batch write; students read only own rows of published tests
drop policy if exists p_marks_select on student_marks;
create policy p_marks_select on student_marks for select
  using (
    is_staff()
    or (
      student_id = current_student_id()
      and exists (
        select 1 from test_subjects ts
        join tests t on t.id = ts.test_id
        where ts.id = student_marks.test_subject_id and t.status in ('published','locked')
      )
    )
  );

drop policy if exists p_marks_write on student_marks;
create policy p_marks_write on student_marks for all
  using (
    is_admin_level()
    or exists (
      select 1 from test_subjects ts
      join tests t on t.id = ts.test_id
      where ts.id = student_marks.test_subject_id
        and teacher_can_access_batch(current_teacher_id(), t.batch_id)
    )
  ) with check (
    is_admin_level()
    or exists (
      select 1 from test_subjects ts
      join tests t on t.id = ts.test_id
      where ts.id = student_marks.test_subject_id
        and teacher_can_access_batch(current_teacher_id(), t.batch_id)
    )
  );

-- attendance
drop policy if exists p_att_sessions_select on attendance_sessions;
create policy p_att_sessions_select on attendance_sessions for select
  using (is_staff() or exists (select 1 from enrollments e where e.student_id = current_student_id() and e.batch_id = attendance_sessions.batch_id));

drop policy if exists p_att_sessions_write on attendance_sessions;
create policy p_att_sessions_write on attendance_sessions for all
  using (
    is_admin_level()
    or teacher_can_access_batch(current_teacher_id(), attendance_sessions.batch_id)
  ) with check (
    is_admin_level()
    or teacher_can_access_batch(current_teacher_id(), attendance_sessions.batch_id)
  );

drop policy if exists p_att_records_select on attendance_records;
create policy p_att_records_select on attendance_records for select
  using (is_staff() or student_id = current_student_id());

drop policy if exists p_att_records_write on attendance_records;
create policy p_att_records_write on attendance_records for all
  using (
    is_admin_level()
    or exists (select 1 from attendance_sessions s where s.id = attendance_records.session_id and teacher_can_access_batch(current_teacher_id(), s.batch_id))
  ) with check (
    is_admin_level()
    or exists (select 1 from attendance_sessions s where s.id = attendance_records.session_id and teacher_can_access_batch(current_teacher_id(), s.batch_id))
  );

-- assignments: students read published for their batch
drop policy if exists p_assign_select on assignments;
create policy p_assign_select on assignments for select
  using (
    is_staff()
    or exists (select 1 from enrollments e where e.student_id = current_student_id() and e.batch_id = assignments.batch_id and assignments.status = 'published')
  );

drop policy if exists p_assign_write on assignments;
create policy p_assign_write on assignments for all
  using (
    is_admin_level()
    or teacher_can_access_batch(current_teacher_id(), assignments.batch_id)
  ) with check (
    is_admin_level()
    or teacher_can_access_batch(current_teacher_id(), assignments.batch_id)
  );

-- submissions: student owns own; staff of the batch read/feedback
drop policy if exists p_subs_select on assignment_submissions;
create policy p_subs_select on assignment_submissions for select
  using (
    student_id = current_student_id()
    or is_admin_level()
    or exists (select 1 from assignments a where a.id = assignment_submissions.assignment_id and teacher_can_access_batch(current_teacher_id(), a.batch_id))
  );

drop policy if exists p_subs_insert on assignment_submissions;
create policy p_subs_insert on assignment_submissions for insert
  with check (student_id = current_student_id());

drop policy if exists p_subs_update on assignment_submissions;
create policy p_subs_update on assignment_submissions for update
  using (
    student_id = current_student_id()
    or is_admin_level()
    or exists (select 1 from assignments a where a.id = assignment_submissions.assignment_id and teacher_can_access_batch(current_teacher_id(), a.batch_id))
  ) with check (
    student_id = current_student_id()
    or is_admin_level()
    or exists (select 1 from assignments a where a.id = assignment_submissions.assignment_id and teacher_can_access_batch(current_teacher_id(), a.batch_id))
  );

-- resources: students read published matching their course or batch
drop policy if exists p_resources_select on resources;
create policy p_resources_select on resources for select
  using (
    is_staff()
    or (
      resources.visibility = 'published'
      and resources.archived_at is null
      and exists (
        select 1
        from enrollments e
        join batches b on b.id = e.batch_id
        where e.student_id = current_student_id()
          and (resources.batch_id = e.batch_id or resources.course_id = b.course_id or (resources.batch_id is null and resources.course_id is null))
      )
    )
  );

drop policy if exists p_resources_write on resources;
create policy p_resources_write on resources for all
  using (
    is_staff()
    and (
      is_admin_level()
      or resources.batch_id is null
      or teacher_can_access_batch(current_teacher_id(), resources.batch_id)
    )
  ) with check (
    is_staff()
    and (
      is_admin_level()
      or resources.batch_id is null
      or teacher_can_access_batch(current_teacher_id(), resources.batch_id)
    )
  );

-- inquiries: public insert, staff manage
drop policy if exists p_inq_select on inquiries;
create policy p_inq_select on inquiries for select using (is_staff());

drop policy if exists p_inq_insert on inquiries;
create policy p_inq_insert on inquiries for insert with check (true);

drop policy if exists p_inq_update on inquiries;
create policy p_inq_update on inquiries for update using (is_staff()) with check (is_staff());

drop policy if exists p_inq_delete on inquiries;
create policy p_inq_delete on inquiries for delete using (is_admin_level());

-- messaging
drop policy if exists p_threads_select on message_threads;
create policy p_threads_select on message_threads for select
  using (
    student_id = current_student_id()
    or is_admin_level()
    or (current_teacher_id() is not null and (message_threads.teacher_id = current_teacher_id() or message_threads.teacher_id is null))
  );

drop policy if exists p_threads_insert on message_threads;
create policy p_threads_insert on message_threads for insert
  with check (student_id = current_student_id());

drop policy if exists p_threads_update on message_threads;
create policy p_threads_update on message_threads for update
  using (
    student_id = current_student_id()
    or is_admin_level()
    or current_teacher_id() is not null
  ) with check (
    student_id = current_student_id()
    or is_admin_level()
    or current_teacher_id() is not null
  );

drop policy if exists p_msgs_select on messages;
create policy p_msgs_select on messages for select
  using (exists (select 1 from message_threads t where t.id = messages.thread_id));

drop policy if exists p_msgs_insert on messages;
create policy p_msgs_insert on messages for insert
  with check (
    exists (select 1 from message_threads t where t.id = messages.thread_id)
    and (
      sender_role in ('student','teacher')
      and (sender_role = 'student' and exists (select 1 from message_threads t2 where t2.id = messages.thread_id and t2.student_id = current_student_id())
           or sender_role = 'teacher' and current_teacher_id() is not null
           or sender_role = 'admin' and is_admin_level())
    )
  );

-- notices: public sees published non-expired; scoped for audience
drop policy if exists p_notices_select on notices;
create policy p_notices_select on notices for select
  using (
    is_staff()
    or (
      notices.status = 'published'
      and (notices.expiry_date is null or notices.expiry_date >= current_date)
      and (
        notices.audience = 'public'
        or (notices.audience in ('all_students','course','batch') and current_student_id() is not null
            and (notices.audience = 'all_students'
                 or (notices.course_id is not null and exists (select 1 from enrollments e join batches b on b.id = e.batch_id where e.student_id = current_student_id() and b.course_id = notices.course_id))
                 or (notices.batch_id is not null and exists (select 1 from enrollments e where e.student_id = current_student_id() and e.batch_id = notices.batch_id))))
      )
    )
  );

drop policy if exists p_notices_write on notices;
create policy p_notices_write on notices for all
  using (is_staff()) with check (is_staff());

-- achievements: public sees published but privacy fields are enforced by view; staff full
drop policy if exists p_ach_select on achievements;
create policy p_ach_select on achievements for select
  using (is_staff() or (status = 'published'));

drop policy if exists p_ach_write on achievements;
create policy p_ach_write on achievements for all
  using (is_admin_level()) with check (is_admin_level());

-- testimonials: public approved; staff manage
drop policy if exists p_testi_select on testimonials;
create policy p_testi_select on testimonials for select
  using (is_staff() or is_approved);

drop policy if exists p_testi_write on testimonials;
create policy p_testi_write on testimonials for all
  using (is_admin_level()) with check (is_admin_level());

-- gallery: public published albums + their images
drop policy if exists p_albums_select on gallery_albums;
create policy p_albums_select on gallery_albums for select
  using (is_staff() or (status = 'published' and archived_at is null));

drop policy if exists p_albums_write on gallery_albums;
create policy p_albums_write on gallery_albums for all
  using (is_admin_level()) with check (is_admin_level());

drop policy if exists p_gimg_select on gallery_images;
create policy p_gimg_select on gallery_images for select
  using (exists (select 1 from gallery_albums a where a.id = gallery_images.album_id and (is_staff() or (a.status = 'published' and a.archived_at is null))));

drop policy if exists p_gimg_write on gallery_images;
create policy p_gimg_write on gallery_images for all
  using (is_admin_level()) with check (is_admin_level());

-- media library: staff only
drop policy if exists p_media_select on media_assets;
create policy p_media_select on media_assets for select using (is_staff());

drop policy if exists p_media_write on media_assets;
create policy p_media_write on media_assets for all
  using (is_staff()) with check (is_staff());

-- faculty profiles: public published; admin manage
drop policy if exists p_faculty_select on faculty_profiles;
create policy p_faculty_select on faculty_profiles for select
  using (is_admin_level() or (is_published and archived_at is null));

drop policy if exists p_faculty_write on faculty_profiles;
create policy p_faculty_write on faculty_profiles for all
  using (is_admin_level()) with check (is_admin_level());

-- chatbot FAQs: public published; staff manage; unanswered staff-only
drop policy if exists p_faqs_select on chatbot_faqs;
create policy p_faqs_select on chatbot_faqs for select
  using (is_staff() or (is_published and archived_at is null));

drop policy if exists p_faqs_write on chatbot_faqs;
create policy p_faqs_write on chatbot_faqs for all
  using (is_admin_level()) with check (is_admin_level());

drop policy if exists p_unans_select on chatbot_unanswered_questions;
create policy p_unans_select on chatbot_unanswered_questions for select using (is_staff());

-- unanswered questions are inserted by the edge function (service role), no client policy.

-- public resources: public published; staff manage
drop policy if exists p_pubres_select on public_resources;
create policy p_pubres_select on public_resources for select
  using (is_staff() or (status = 'published' and archived_at is null));

drop policy if exists p_pubres_write on public_resources;
create policy p_pubres_write on public_resources for all
  using (is_admin_level()) with check (is_admin_level());

-- site_settings & page_sections: public read, admin write
drop policy if exists p_settings_select on site_settings;
create policy p_settings_select on site_settings for select using (true);

drop policy if exists p_settings_write on site_settings;
create policy p_settings_write on site_settings for all
  using (is_admin_level()) with check (is_admin_level());

drop policy if exists p_sections_select on page_sections;
create policy p_sections_select on page_sections for select using (true);

drop policy if exists p_sections_write on page_sections;
create policy p_sections_write on page_sections for all
  using (is_admin_level()) with check (is_admin_level());

-- social links: public read enabled, admin manage
drop policy if exists p_social_select on social_links;
create policy p_social_select on social_links for select using (true);

drop policy if exists p_social_write on social_links;
create policy p_social_write on social_links for all
  using (is_admin_level()) with check (is_admin_level());

-- audit logs: admins read; nobody writes directly (triggers use definer rights)
drop policy if exists p_audit_select on audit_logs;
create policy p_audit_select on audit_logs for select using (is_admin_level());
