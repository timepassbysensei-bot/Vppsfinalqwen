// Hand-maintained typed database interfaces (generated types can replace these
// via `npm run supabase:types` once a project is linked).
export type AppRole = "super_admin" | "admin" | "teacher" | "student";
export type ContentStatus = "draft" | "published" | "archived";
export type AdmissionStatus = "open" | "filling_fast" | "closed";
export type CourseMode = "offline" | "online" | "hybrid";
export type InquiryStatus = "new" | "contacted" | "interested" | "follow_up" | "admitted" | "closed" | "spam";
export type TestType = "weekly" | "monthly" | "mock" | "physical" | "interview" | "custom";
export type MarksStatus = "draft" | "published" | "locked";
export type AttendanceMark = "present" | "absent" | "late" | "excused";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  assigned_by: string | null;
  created_at: string;
}

export interface Teacher {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  can_publish_results: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string | null;
  student_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  emergency_contact: string | null;
  address: string | null;
  city: string | null;
  joined_on: string | null;
  notes: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademicSession {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  short_description: string | null;
  full_description: string | null;
  eligibility: string | null;
  age_criteria: string | null;
  duration: string | null;
  subjects: string[];
  batch_timings: string | null;
  fee_display: string | null;
  mode: CourseMode;
  seats_total: number | null;
  seats_available: number | null;
  admission_status: AdmissionStatus;
  is_featured: boolean;
  display_order: number;
  syllabus_url: string | null;
  status: ContentStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  course_id: string;
  academic_session_id: string | null;
  name: string;
  timing: string | null;
  start_date: string | null;
  end_date: string | null;
  capacity: number | null;
  teacher_id: string | null;
  admission_status: AdmissionStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  course_id: string | null;
  display_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  course_id: string | null;
  batch_id: string | null;
  subject_id: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  batch_id: string;
  enrolled_on: string;
  left_on: string | null;
  created_at: string;
}

export interface Test {
  id: string;
  academic_session_id: string | null;
  course_id: string;
  batch_id: string;
  name: string;
  test_type: TestType;
  test_date: string;
  instructions: string | null;
  show_rank: boolean;
  status: MarksStatus;
  published_by: string | null;
  published_at: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestSubject {
  id: string;
  test_id: string;
  subject_id: string | null;
  subject_name: string;
  max_marks: number;
  passing_marks: number;
  display_order: number;
}

export interface StudentMark {
  id: string;
  test_subject_id: string;
  student_id: string;
  marks: number | null;
  is_absent: boolean;
  remarks_internal: string | null;
  feedback_public: string | null;
  entered_by: string | null;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  batch_id: string;
  session_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceMark;
  note: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  batch_id: string;
  subject_id: string | null;
  title: string;
  instructions: string | null;
  due_date: string | null;
  attachment_url: string | null;
  external_link: string | null;
  allow_submissions: boolean;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string | null;
  note: string | null;
  submitted_at: string;
  feedback: string | null;
  feedback_by: string | null;
  viewed_at: string | null;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  batch_id: string | null;
  subject_id: string | null;
  resource_type: string;
  file_url: string | null;
  external_link: string | null;
  visibility: ContentStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  interested_course: string | null;
  preferred_batch: string | "Any";
  message: string | null;
  source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: InquiryStatus;
  assigned_to: string | null;
  follow_up_date: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageThread {
  id: string;
  student_id: string;
  teacher_id: string | null;
  category: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_user_id: string | null;
  sender_role: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
}

export interface Notice {
  id: string;
  title: string;
  description: string | null;
  publish_date: string;
  expiry_date: string | null;
  attachment_url: string | null;
  audience: "public" | "all_students" | "course" | "batch" | "teachers" | "admins";
  course_id: string | null;
  batch_id: string | null;
  is_pinned: boolean;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  student_name: string;
  photo_url: string | null;
  examination: string;
  rank_display: string;
  course_id: string | null;
  year: number;
  description: string | null;
  is_featured: boolean;
  consent_recorded: boolean;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  photo_url: string | null;
  course: string | null;
  quote: string;
  rating: number;
  is_approved: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  event_date: string | null;
  category: string | null;
  display_order: number;
  status: ContentStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  album_id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  bucket: string;
  path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string;
  caption: string | null;
  category: string;
  focal_position: string;
  usage_refs: string[];
  is_archived: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacultyProfile {
  id: string;
  name: string;
  designation: string | null;
  subject_area: string | null;
  bio: string | null;
  photo_url: string | null;
  display_order: number;
  is_published: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatbotFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_published: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatbotUnansweredQuestion {
  id: string;
  question: string;
  asked_count: number;
  first_asked_at: string;
  last_asked_at: string;
  resolved_faq_id: string | null;
  created_at: string;
}

export interface PublicResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: "syllabus" | "sample_paper" | "exam_notification" | "study_tips" | "prospectus" | "useful_link";
  file_url: string | null;
  external_link: string | null;
  status: ContentStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: number;
  academy_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  tagline: string | null;
  address: string | null;
  map_url: string | null;
  phone: string | null;
  phone_secondary: string | null;
  whatsapp: string | null;
  email: string | null;
  business_hours: string | null;
  hero_heading: string | null;
  hero_description: string | null;
  hero_image_url: string | null;
  hero_image_position: string;
  hero_primary_label: string | null;
  hero_primary_href: string | null;
  hero_secondary_label: string | null;
  hero_secondary_href: string | null;
  admission_status_text: string | null;
  announcement_text: string | null;
  announcement_enabled: boolean;
  about_overview: string | null;
  about_history: string | null;
  mission: string | null;
  vision: string | null;
  teaching_approach: string | null;
  directors_message: string | null;
  directors_photo_url: string | null;
  footer_description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  attendance_enabled: boolean;
  ranking_enabled: boolean;
  submissions_enabled: boolean;
  chatbot_enabled: boolean;
  floating_call_enabled: boolean;
  floating_whatsapp_enabled: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialLink {
  id: string;
  platform: "facebook" | "instagram" | "youtube" | "whatsapp" | "linkedin" | "twitter";
  url: string;
  display_order: number;
  is_enabled: boolean;
}

export interface PageSection {
  id: string;
  page_key: string;
  section_key: string;
  heading: string | null;
  body: string | null;
  image_url: string | null;
  image_position: string;
  data: Record<string, unknown>;
  updated_by: string | null;
}

export interface AuditLog {
  id: number;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Supabase client schema envelope
// ---------------------------------------------------------------------------
// `createClient<Database>()` uses this to type `.from(...).select(...)`.
// Known columns get their real types from the interfaces above; unknown keys
// (embedded relations such as `courses(title)`) fall back to `any` so joins
// stay usable. Inserts/updates are permissive — Postgres enforces NOT NULL
// constraints, defaults and RLS, which is where the real guardrails live.
//
// Once a Supabase project is linked you can replace this whole file with:
//   bun run supabase:types

type TableDefinition<Row> = {
  Row: Row & Record<string, any>;
  // Writes stay permissive on purpose: Postgres defaults, NOT NULL constraints
  // and RLS policies are the real guardrails, and generated inserts would
  // otherwise reject the partial payloads the dashboard legitimately sends.
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: [];
};

type ViewDefinition<Row> = {
  Row: Row & Record<string, any>;
  Relationships: [];
};

type Fn<Args, Returns> = { Args: Args; Returns: Returns };

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<Profile>;
      user_roles: TableDefinition<UserRole>;
      teachers: TableDefinition<Teacher>;
      students: TableDefinition<Student>;
      academic_sessions: TableDefinition<AcademicSession>;
      courses: TableDefinition<Course>;
      batches: TableDefinition<Batch>;
      subjects: TableDefinition<Subject>;
      teacher_assignments: TableDefinition<TeacherAssignment>;
      enrollments: TableDefinition<Enrollment>;
      tests: TableDefinition<Test>;
      test_subjects: TableDefinition<TestSubject>;
      student_marks: TableDefinition<StudentMark>;
      attendance_sessions: TableDefinition<AttendanceSession>;
      attendance_records: TableDefinition<AttendanceRecord>;
      assignments: TableDefinition<Assignment>;
      assignment_submissions: TableDefinition<AssignmentSubmission>;
      resources: TableDefinition<Resource>;
      inquiries: TableDefinition<Inquiry>;
      message_threads: TableDefinition<MessageThread>;
      messages: TableDefinition<Message>;
      notices: TableDefinition<Notice>;
      achievements: TableDefinition<Achievement>;
      testimonials: TableDefinition<Testimonial>;
      gallery_albums: TableDefinition<GalleryAlbum>;
      gallery_images: TableDefinition<GalleryImage>;
      media_assets: TableDefinition<MediaAsset>;
      faculty_profiles: TableDefinition<FacultyProfile>;
      chatbot_faqs: TableDefinition<ChatbotFaq>;
      chatbot_unanswered_questions: TableDefinition<ChatbotUnansweredQuestion>;
      public_resources: TableDefinition<PublicResource>;
      site_settings: TableDefinition<SiteSettings>;
      social_links: TableDefinition<SocialLink>;
      page_sections: TableDefinition<PageSection>;
      audit_logs: TableDefinition<AuditLog>;
    };
    Views: Record<string, ViewDefinition<Record<string, unknown>>>;
    Functions: {
      has_role: Fn<{ uid: string; roles: AppRole[] }, boolean>;
      is_staff: Fn<Record<string, never>, boolean>;
      is_admin_level: Fn<Record<string, never>, boolean>;
      current_student_id: Fn<Record<string, never>, string | null>;
      current_teacher_id: Fn<Record<string, never>, string | null>;
      teacher_batch_ids: Fn<{ tid: string }, string[]>;
      teacher_can_access_batch: Fn<{ tid: string; bid: string }, boolean>;
      admin_create_user: Fn<
        { p_email: string; p_full_name: string; p_role: AppRole; p_phone?: string | null; p_teacher_id?: string | null; p_student_id?: string | null },
        { user_id: string; invite_link: string }[]
      >;
      accept_invite: Fn<{ p_token: string; p_password: string }, string>;
      admin_set_publish_permission: Fn<{ p_teacher_id: string; p_allowed: boolean }, undefined>;
      test_review: Fn<{ p_test_id: string }, Record<string, unknown>>;
      test_results: Fn<{ p_test_id: string }, Record<string, unknown>>;
      log_chatbot_question: Fn<{ p_question: string; p_answered: boolean }, undefined>;
      admin_list_users: Fn<
        Record<string, never>,
        {
          user_id: string;
          email: string;
          full_name: string;
          is_active: boolean;
          must_change_password: boolean;
          roles: AppRole[];
          created_at: string;
        }[]
      >;
      admin_grant_role: Fn<{ p_user_id: string; p_role: AppRole }, undefined>;
      admin_revoke_role: Fn<{ p_user_id: string; p_role: AppRole }, undefined>;
      admin_set_user_active: Fn<{ p_user_id: string; p_active: boolean }, undefined>;
    };
    Enums: {
      app_role: AppRole;
      content_status: ContentStatus;
      admission_status: AdmissionStatus;
      course_mode: CourseMode;
      attendance_mark: AttendanceMark;
      test_type: TestType;
      marks_status: MarksStatus;
      inquiry_status: InquiryStatus;
    };
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
}

export type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;
export type RowOf<T extends TableName> = Tables[T]["Row"];
export type InsertOf<T extends TableName> = Tables[T]["Insert"];
