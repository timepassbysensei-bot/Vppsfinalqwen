import { describe, expect, it } from "vitest";
import {
  computeRow,
  computeAll,
  computeRanks,
  validateGrid,
  csvEscape,
  toCsv,
  type SubjectColumn,
  type MarkCell,
} from "@/lib/marks";

const subjects: SubjectColumn[] = [
  { id: "math", subject_name: "Mathematics", max_marks: 100, passing_marks: 33 },
  { id: "gk", subject_name: "General Knowledge", max_marks: 50, passing_marks: 15 },
];

function cell(marks: number | null, is_absent = false): MarkCell {
  return { marks, is_absent };
}

describe("computeRow", () => {
  it("totals complete rows and computes a percentage", () => {
    const row = computeRow(subjects, { math: cell(80), gk: cell(40) }, "s1");
    expect(row.total).toBe(120);
    expect(row.maxTotal).toBe(150);
    expect(row.percentage).toBe(80);
    expect(row.passed).toBe(true);
    expect(row.hasMissing).toBe(false);
  });

  it("treats a missing mark as incomplete rather than zero", () => {
    const row = computeRow(subjects, { math: cell(80) }, "s1");
    expect(row.total).toBeNull();
    expect(row.percentage).toBeNull();
    expect(row.passed).toBeNull();
    expect(row.hasMissing).toBe(true);
  });

  it("marks an absent subject as a fail and counts it", () => {
    const row = computeRow(subjects, { math: cell(null, true), gk: cell(40) }, "s1");
    expect(row.absentCount).toBe(1);
    expect(row.passed).toBe(false);
    expect(row.total).toBe(40);
  });

  it("fails a row when any subject is below its pass mark", () => {
    const row = computeRow(subjects, { math: cell(30), gk: cell(45) }, "s1");
    expect(row.passed).toBe(false);
  });

  it("handles an empty subject list without dividing by zero", () => {
    const row = computeRow([], {}, "s1");
    expect(row.total).toBe(0);
    expect(row.percentage).toBeNull();
  });
});

describe("computeRanks", () => {
  it("ranks by total descending and shares ranks on ties", () => {
    const rows = computeAll(subjects, [
      { studentId: "a", cells: { math: cell(90), gk: cell(40) } },
      { studentId: "b", cells: { math: cell(90), gk: cell(40) } },
      { studentId: "c", cells: { math: cell(60), gk: cell(20) } },
    ]);
    const ranks = computeRanks(rows);
    expect(ranks.a).toBe(1);
    expect(ranks.b).toBe(1);
    expect(ranks.c).toBe(3);
  });

  it("excludes students with incomplete results from ranking", () => {
    const rows = computeAll(subjects, [
      { studentId: "a", cells: { math: cell(90), gk: cell(40) } },
      { studentId: "b", cells: { math: cell(50) } },
    ]);
    const ranks = computeRanks(rows);
    expect(ranks.b).toBeUndefined();
    expect(ranks.a).toBe(1);
  });
});

describe("validateGrid", () => {
  it("accepts a valid grid", () => {
    const result = validateGrid(subjects, [{ studentId: "a", cells: { math: cell(50), gk: cell(20) } }]);
    expect(result.ok).toBe(true);
    expect(result.problems).toHaveLength(0);
  });

  it("rejects marks above the maximum", () => {
    const result = validateGrid(subjects, [{ studentId: "a", cells: { math: cell(101) } }]);
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toMatch(/exceed maximum/i);
  });

  it("rejects negative marks", () => {
    const result = validateGrid(subjects, [{ studentId: "a", cells: { math: cell(-1) } }]);
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toMatch(/below zero/i);
  });

  it("rejects numeric marks on a student marked absent", () => {
    const result = validateGrid(subjects, [{ studentId: "a", cells: { math: { marks: 10, is_absent: true } } }]);
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toMatch(/absent/i);
  });
});

describe("csv helpers", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(csvEscape('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
    expect(csvEscape(42)).toBe("42");
  });

  it("builds a CSV document with a header row", () => {
    const csv = toCsv(["Name", "Mark"], [["A, B", 90], ["C", null]]);
    expect(csv.split("\n")).toEqual(["Name,Mark", '"A, B",90', "C,"]);
  });
});
