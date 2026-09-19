import { describe, expect, it } from "vitest";
import {
  inquirySchema,
  loginSchema,
  resetPasswordSchema,
  studentFormSchema,
  courseFormSchema,
  phoneSchema,
  createTestSchema,
} from "@/lib/validation";

describe("phoneSchema", () => {
  it("accepts Indian mobile numbers with and without the country code", () => {
    expect(phoneSchema.safeParse("9876543210").success).toBe(true);
    expect(phoneSchema.safeParse("+91 9876543210").success).toBe(true);
    expect(phoneSchema.safeParse("+91-9876543210").success).toBe(true);
  });

  it("rejects landline-style or short numbers", () => {
    expect(phoneSchema.safeParse("12345").success).toBe(false);
    expect(phoneSchema.safeParse("1234567890").success).toBe(false);
  });
});

describe("inquirySchema", () => {
  const valid = {
    name: "Sample Applicant",
    email: "",
    phone: "9876543210",
    whatsapp: "",
    city: "Bokaro",
    interested_course: "NDA",
    preferred_batch: "Any",
    message: "",
    consent: true as const,
  };

  it("accepts a complete inquiry", () => {
    expect(inquirySchema.safeParse(valid).success).toBe(true);
  });

  it("requires the consent checkbox", () => {
    const result = inquirySchema.safeParse({ ...valid, consent: false });
    expect(result.success).toBe(false);
  });

  it("requires a name of at least two characters", () => {
    expect(inquirySchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejects an invalid email when one is supplied", () => {
    expect(inquirySchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires an email and a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires at least 8 characters and matching confirmation", () => {
    expect(resetPasswordSchema.safeParse({ password: "longenough", confirm: "longenough" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(false);
    const mismatch = resetPasswordSchema.safeParse({ password: "longenough", confirm: "different1" });
    expect(mismatch.success).toBe(false);
  });
});

describe("studentFormSchema", () => {
  it("requires a name and accepts an empty optional email", () => {
    expect(studentFormSchema.safeParse({ full_name: "Sample Student", email: "" }).success).toBe(true);
    expect(studentFormSchema.safeParse({ full_name: "" }).success).toBe(false);
  });
});

describe("courseFormSchema", () => {
  const base = {
    title: "NDA Foundation",
    slug: "nda-foundation",
    mode: "offline" as const,
    admission_status: "open" as const,
    is_featured: false,
    status: "draft" as const,
  };

  it("accepts a valid slug", () => {
    expect(courseFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects uppercase or spaced slugs", () => {
    expect(courseFormSchema.safeParse({ ...base, slug: "NDA Foundation" }).success).toBe(false);
    expect(courseFormSchema.safeParse({ ...base, slug: "-bad-" }).success).toBe(false);
  });
});

describe("createTestSchema", () => {
  it("requires at least one subject", () => {
    const result = createTestSchema.safeParse({
      name: "Weekly Test",
      test_type: "weekly",
      course_id: "00000000-0000-0000-0000-000000000000",
      batch_id: "00000000-0000-0000-0000-000000000001",
      test_date: "2026-09-18",
      subject_ids: [],
      max_marks: {},
      passing_marks: {},
    });
    expect(result.success).toBe(false);
  });
});
