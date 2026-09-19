# Database, RLS and Data Reference

For developers. All schema changes live in `supabase/migrations/` and must be
applied in numeric order.

---

## 1. Migration map

| File | Contents |
|---|---|
| `00001_extensions_enums.sql` | `pgcrypto`; enums: `app_role`, `content_status`, `admission_status`, `course_mode`, `attendance_mark`, `test_type`, `marks_status`, `inquiry_status` |
| `00002_core_tables.sql` | `profiles`, `user_roles`, `teachers`, `students`, `academic_sessions`, `courses`, `batches`, `subjects`, `teacher_assignments`, `enrollments` |
| `00003_academics.sql` | `tests`, `test_subjects`, `student_marks`, `attendance_sessions`, `attendance_records`, `assignments`, `assignment_submissions`, `resources` |
| `00004_crm_content.sql` | `inquiries`, `message_threads`, `messages`, `notices`, `achievements`, `testimonials`, `gallery_albums`, `gallery_images`, `media_assets`, `faculty_profiles`, `chatbot_faqs`, `chatbot_unanswered_questions`, `public_resources` |
| `00005_settings_content.sql` | `site_settings` (single row, `id = 1`), `social_links`, `page_sections`, `audit_logs` |
| `00006_functions_triggers.sql` | Role helpers, `touch_updated_at`, audit triggers, `guard_test_publish`, `guard_inquiry_insert` |
| `00007_rls_policies.sql` | Every `create policy` in one auditable place |
| `00008_rpc_and_admin_bootstrap.sql` | `admin_create_user`, `accept_invite`, `admin_set_publish_permission`, `test_review`, `test_results`, `log_chatbot_question` |
| `00009_storage_buckets.sql` | Buckets and storage policies |
| `00010_admin_user_management.sql` | `admin_list_users`, `admin_grant_role`, `admin_revoke_role`, `admin_set_user_active` |

`seed.sql` inserts clearly-labelled SAMPLE data only.

---

## 2. Data model in one picture

```
auth.users ──1:1── profiles
     │
     └──1:N── user_roles (app_role)

teachers ──1:N── teacher_assignments ──> courses / batches / subjects
    │                (NULL = wildcard)
    └──1:1── auth.users            (grants dashboard access)

students ──1:1── auth.users
    └──1:N── enrollments ──N:1── batches ──N:1── courses
                                   │
tests ──N:1── batches              ├── assignments ──1:N── assignment_submissions
  └──1:N── test_subjects           ├── attendance_sessions ──1:N── attendance_records
            └──1:N── student_marks └── resources

site_settings (id=1) · social_links · page_sections · audit_logs
media_assets · gallery_albums ──1:N── gallery_images
message_threads ──1:N── messages      inquiries · notices
achievements · testimonials · faculty_profiles · chatbot_faqs · public_resources
```

Key conventions:
- UUID primary keys (`gen_random_uuid()`).
- `created_at` / `updated_at` on mutable tables, maintained by `touch_updated_at` triggers.
- `archived_at` for soft deletion on academic and content records.
- **`student_marks.marks` is `NULL` when a mark is missing or the student was absent.**
  `NULL` is never read as zero — this is enforced in `src/lib/marks.ts` and unit-tested.

---

## 3. Security model

### Roles
`user_roles` is the single source of truth. There is **no** client INSERT/UPDATE/DELETE
policy on it, so the browser cannot grant itself a role. Helpers:

| Function | Meaning |
|---|---|
| `is_admin_level()` | caller is `admin` or `super_admin` |
| `is_staff()` | caller is `teacher`, `admin` or `super_admin` |
| `current_student_id()` | the `students.id` linked to the signed-in user |
| `current_teacher_id()` | the `teachers.id` linked to the signed-in user |
| `teacher_can_access_batch(tid, bid)` | batch is in the teacher's scope |
| `has_role(uid, roles[])` | generic role check |

All are `SECURITY DEFINER` with `set search_path = public` so `search_path` tricks
cannot bypass a policy.

### Policy shape (examples)

| Table | Read | Write |
|---|---|---|
| `courses`, `batches` | published rows are public; staff see all | admin only |
| `students` | own row, or any row for staff | admin only |
| `student_marks` | staff; students only their own rows of published/locked tests | admin, or a teacher of that batch |
| `attendance_*` | staff; a student only sees their own records | admin, or a teacher of that batch |
| `resources` | staff; students see published items for their course/batch | staff, scoped to their batch (or course-wide) |
| `assignments` | staff; students see published work for their batches | admin, or a teacher of that batch |
| `assignment_submissions` | the owning student, staff of that batch, admins | student creates/updates their own; staff write feedback |
| `message_threads` / `messages` | the owning student, admins, teachers | participants only, with `sender_role` validated |
| `inquiries` | staff | anyone may INSERT (public form); staff UPDATE; admin DELETE |
| `achievements` | published rows publicly, all rows for staff | admin only |
| `testimonials` | approved rows publicly | admin only |
| `site_settings`, `page_sections`, `social_links` | public read | admin only |
| `audit_logs` | admins | nobody (written by triggers using definer rights) |

### Guard triggers
- `guard_test_publish` — blocks edits to published/locked tests unless the caller is an
  admin, records `PUBLISHED_TEST_EDITED` in `audit_logs`, and stamps `published_by` / `published_at` / `locked_at`.
- `guard_inquiry_insert` — forces `status = 'new'` and clears `assigned_to` + `internal_notes`
  so a public submission cannot pre-assign or inject internal data.

### Edge functions
- `academy-chatbot` — public (`verify_jwt = false`), rate-limited 10 requests / 5 min / IP,
  grounded only on published FAQs + published courses + public settings. Uses the
  service-role key **server-side only** and never receives student data.
- `invite-user` — requires a JWT, re-checks the caller's admin role server-side with the
  service-role client, then sends the invitation and syncs profile, role and linked record.

---

## 4. Storage buckets

| Bucket | Public | Written by | Read by |
|---|---|---|---|
| `site-assets`, `course-images`, `gallery`, `achievement-photos`, `faculty-photos` | ✅ | staff | everyone |
| `student-resources`, `assignment-files` | ❌ | staff | staff; students only for their `course-<id>` / `batch-<id>` / `public` folders |
| `assignment-submissions`, `student-documents` | ❌ | the owning student (`<uid>/…`) | that student; staff |
| `message-attachments` | ❌ | thread participants (`<thread-id>/…`) | participants and staff |

Private files are read through `createSignedUrl`, wrapped by `src/lib/storage.ts`.

---

## 5. RPCs used by the app

| RPC | Purpose | Called from |
|---|---|---|
| `admin_list_users()` | accounts + roles for the User Roles screen | `AdminUsers` |
| `admin_grant_role(uid, role)` | add a role (Super Admin only for staff roles) | `AdminUsers` |
| `admin_revoke_role(uid, role)` | remove a role; refuses to drop the last Super Admin | `AdminUsers` |
| `admin_set_user_active(uid, active)` | activate/deactivate a login | `AdminUsers` |
| `admin_set_publish_permission(teacher_id, allowed)` | grant result publishing | `AdminTeachers` |
| `test_results(test_id)` | per-student subject breakdown, total, max total, rank flag | `StudentResults` |
| `test_review(test_id)` | missing/invalid/absent counts before publishing | available for review screens |
| `admin_create_user(...)` | account + role creation (server-side path) | available to admins |

---

## 6. Keeping types in sync

`src/types/database.ts` holds hand-written row interfaces plus the `Database`
envelope that `createClient<Database>()` consumes. Once a project is linked:

```bash
bun run supabase:types   # writes src/types/database.types.ts from the live schema
```

Note that the hand-written types do **not** describe embedded joins
(`select("*, batches(name)")`), so screens that use them assert the joined row
shape locally (see `useTeacherScope` for the pattern).
