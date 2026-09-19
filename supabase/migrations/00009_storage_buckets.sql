-- Bokaro Defence Academy — 00009: Storage buckets & policies
-- Public buckets serve website imagery; private buckets isolate student/staff files.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('site-assets', 'site-assets', true, 5242880),
  ('course-images', 'course-images', true, 5242880),
  ('gallery', 'gallery', true, 8388608),
  ('achievement-photos', 'achievement-photos', true, 5242880),
  ('faculty-photos', 'faculty-photos', true, 5242880),
  ('student-resources', 'student-resources', false, 26214400),
  ('assignment-files', 'assignment-files', false, 26214400),
  ('assignment-submissions', 'assignment-submissions', false, 26214400),
  ('student-documents', 'student-documents', false, 10485760),
  ('message-attachments', 'message-attachments', false, 10485760)
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- Staff manage all public buckets.
create policy "staff_manage_public_assets" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('site-assets','course-images','gallery','achievement-photos','faculty-photos')
    and is_staff()
  )
  with check (
    bucket_id in ('site-assets','course-images','gallery','achievement-photos','faculty-photos')
    and is_staff()
  );

-- Anyone may read public buckets.
create policy "public_read_public_assets" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('site-assets','course-images','gallery','achievement-photos','faculty-photos'));

-- Staff-managed private buckets for course material.
create policy "staff_manage_private_staff_buckets" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('student-resources','assignment-files')
    and is_staff()
  )
  with check (
    bucket_id in ('student-resources','assignment-files')
    and is_staff()
  );

-- Students may read course material only from their own course/batch folders.
create policy "student_read_own_material" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('student-resources','assignment-files')
    and is_staff() = false
    and exists (
      select 1 from students s
      join enrollments e on e.student_id = s.id
      join batches b on b.id = e.batch_id
      where s.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] in ('course-' || b.course_id::text, 'batch-' || b.id::text)
          or (storage.foldername(name))[1] = 'public'
        )
    )
  );

-- Students write/read their own submissions and documents only.
create policy "student_own_submissions" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('assignment-submissions','student-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('assignment-submissions','student-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Staff read any submission folder.
create policy "staff_read_submissions" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('assignment-submissions','student-documents','message-attachments')
    and is_staff()
  );

-- Message attachments: participant folders only (thread id folder, student uid prefix).
create policy "message_attachments_participants" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'message-attachments'
    and (
      is_staff()
      or exists (
        select 1 from message_threads t
        join students s on s.id = t.student_id
        where t.id::text = (storage.foldername(name))[1]
          and s.user_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'message-attachments'
    and (
      is_staff()
      or exists (
        select 1 from message_threads t
        join students s on s.id = t.student_id
        where t.id::text = (storage.foldername(name))[1]
          and s.user_id = auth.uid()
      )
    )
  );
