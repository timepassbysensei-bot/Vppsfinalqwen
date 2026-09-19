// Shared validation schemas (Zod) — reused by forms on both web and dashboard.
import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const optionalPhone = z.union([phoneSchema, z.literal("")]).optional().or(z.literal(""));

export const inquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter the applicant's full name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(200).optional().or(z.literal("")),
  phone: phoneSchema,
  whatsapp: optionalPhone,
  city: z.string().trim().max(100).optional().or(z.literal("")),
  interested_course: z.string().max(160).optional().or(z.literal("")),
  preferred_batch: z.string().max(160).optional().or(z.literal("Any")),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the consent checkbox" }) }),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const contactSchema = inquirySchema.omit({ preferred_batch: true });
export type ContactInput = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const marksCellSchema = z.object({
  marks: z.number().min(0, "Marks cannot be negative").max(1000, "Marks too large").nullable(),
  is_absent: z.boolean(),
});

export const createTestSchema = z.object({
  name: z.string().trim().min(2, "Test name is required").max(160),
  test_type: z.enum(["weekly", "monthly", "mock", "physical", "interview", "custom"]),
  academic_session_id: z.string().uuid().optional().or(z.literal("")),
  course_id: z.string().uuid("Select a course"),
  batch_id: z.string().uuid("Select a batch"),
  test_date: z.string().min(1, "Test date is required"),
  subject_ids: z.array(z.string().uuid()).min(1, "Select at least one subject"),
  max_marks: z.record(z.string(), z.number().min(1, "Max marks must be positive")),
  passing_marks: z.record(z.string(), z.number().min(0)),
  instructions: z.string().max(2000).optional().or(z.literal("")),
  show_rank: z.boolean().optional(),
});

export const studentFormSchema = z.object({
  full_name: z.string().trim().min(2, "Student name is required").max(120),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: optionalPhone,
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional().or(z.literal("")),
  guardian_name: z.string().max(120).optional().or(z.literal("")),
  guardian_phone: optionalPhone,
  emergency_contact: z.string().max(20).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(400).optional().or(z.literal("")),
});
export type StudentFormInput = z.infer<typeof studentFormSchema>;

export const teacherFormSchema = z.object({
  full_name: z.string().trim().min(2, "Teacher name is required").max(120),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: optionalPhone,
  specialization: z.string().max(160).optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
});

export const courseFormSchema = z.object({
  title: z.string().trim().min(2, "Course title is required").max(160),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only"),
  short_description: z.string().max(300).optional().or(z.literal("")),
  full_description: z.string().max(8000).optional().or(z.literal("")),
  eligibility: z.string().max(300).optional().or(z.literal("")),
  age_criteria: z.string().max(160).optional().or(z.literal("")),
  duration: z.string().max(120).optional().or(z.literal("")),
  subjects_text: z.string().max(600).optional().or(z.literal("")),
  batch_timings: z.string().max(300).optional().or(z.literal("")),
  fee_display: z.string().max(120).optional().or(z.literal("")),
  mode: z.enum(["offline", "online", "hybrid"]),
  seats_total: z.number().int().min(0).max(100000).optional(),
  seats_available: z.number().int().min(0).max(100000).optional(),
  admission_status: z.enum(["open", "filling_fast", "closed"]),
  is_featured: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
});

export const assignmentFormSchema = z.object({
  title: z.string().trim().min(2, "Assignment title is required").max(200),
  course_id: z.string().uuid("Select a course"),
  batch_id: z.string().uuid("Select a batch"),
  subject_id: z.string().uuid().optional().or(z.literal("")),
  instructions: z.string().max(4000).optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  external_link: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  allow_submissions: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
});

export const messageSendSchema = z.object({
  body: z.string().trim().min(1, "Type a message").max(2000),
  category: z.enum(["general", "admission", "fee", "exam", "other"]).optional(),
  subject: z.string().trim().min(2, "Subject is required").max(160).optional(),
});
