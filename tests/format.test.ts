import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  maskName,
  slugify,
  initials,
  bytes,
  pct,
  waLink,
  telLink,
  readableStudentCode,
} from "@/lib/format";

describe("date formatting", () => {
  it("returns an em dash for missing or invalid input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("formats a valid ISO date", () => {
    expect(formatDate("2026-09-18")).toMatch(/2026/);
  });
});

describe("maskName", () => {
  it("shortens a full name to first name plus initial", () => {
    expect(maskName("Sample Student Name")).toBe("Sample N.");
  });

  it("leaves a single name untouched", () => {
    expect(maskName("Sample")).toBe("Sample");
  });
});

describe("slugify", () => {
  it("produces a URL-safe slug", () => {
    expect(slugify("  NDA Foundation Course! ")).toBe("nda-foundation-course");
    expect(slugify("CDS_Target // 2026")).toBe("cds-target-2026");
    expect(slugify("CDS/NDA Target")).toBe("cds-nda-target");
    expect(slugify("--Edge Case--")).toBe("edge-case");
  });
});

describe("initials", () => {
  it("uses at most two initials", () => {
    expect(initials("Sample Student Name")).toBe("SS");
    expect(initials("Sample")).toBe("S");
  });
});

describe("bytes and pct", () => {
  it("formats byte sizes", () => {
    expect(bytes(512)).toBe("512 B");
    expect(bytes(2048)).toBe("2.0 KB");
    expect(bytes(2 * 1024 * 1024)).toBe("2.0 MB");
    expect(bytes(null)).toBe("—");
  });

  it("formats percentages safely", () => {
    expect(pct(1, 4)).toBe("25%");
    expect(pct(null, 4)).toBe("—");
    expect(pct(1, 0)).toBe("—");
  });
});

describe("contact links", () => {
  it("prefixes a 10-digit number with the Indian country code", () => {
    expect(waLink("9876543210")).toBe("https://wa.me/919876543210");
    expect(waLink("+91 98765 43210")).toBe("https://wa.me/919876543210");
  });

  it("encodes a WhatsApp message", () => {
    expect(waLink("9876543210", "Hello there")).toContain("text=Hello%20there");
  });

  it("builds a tel: link, tolerating spaces", () => {
    expect(telLink("+91 98765 43210")).toBe("tel:+919876543210");
    expect(telLink(null)).toBe("tel:");
  });
});

describe("readableStudentCode", () => {
  it("builds a predictable, prefixed student ID", () => {
    const code = readableStudentCode("BDA", 2026);
    expect(code).toMatch(/^BDA-2026-\d{4}$/);
  });
});
