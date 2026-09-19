// Pure marks-calculation helpers — heavily unit-tested (tests/marks.test.ts).
export interface MarkCell {
  marks: number | null;
  is_absent: boolean;
  /** Set once a teacher edits the cell, so untouched blanks stay "missing" (never 0). */
  touched?: boolean;
}

export interface SubjectColumn {
  id: string;
  subject_name: string;
  max_marks: number;
  passing_marks: number;
}

export interface ComputedRow {
  studentId: string;
  cells: Record<string, MarkCell>;
  total: number | null; // null when any subject is missing (not zero!)
  maxTotal: number;
  percentage: number | null;
  passed: boolean | null;
  hasMissing: boolean;
  absentCount: number;
}

export function computeRow(
  subjects: SubjectColumn[],
  cells: Record<string, MarkCell>,
  studentId: string,
): ComputedRow {
  let total = 0;
  let maxTotal = 0;
  let hasMissing = false;
  let absentCount = 0;
  let passed = true;

  for (const s of subjects) {
    maxTotal += s.max_marks;
    const cell = cells[s.id];
    if (!cell || cell.marks === null || cell.marks === undefined) {
      if (cell?.is_absent) {
        absentCount += 1;
        passed = false;
      } else {
        hasMissing = true;
      }
      continue;
    }
    total += cell.marks;
    if (cell.marks < s.passing_marks) passed = false;
  }

  const complete = !hasMissing;
  return {
    studentId,
    cells,
    total: complete ? total : null,
    maxTotal,
    percentage: complete && maxTotal > 0 ? Math.round((total / maxTotal) * 1000) / 10 : null,
    passed: complete ? passed : null,
    hasMissing,
    absentCount,
  };
}

export function computeAll(
  subjects: SubjectColumn[],
  rows: { studentId: string; cells: Record<string, MarkCell> }[],
): ComputedRow[] {
  return rows.map((r) => computeRow(subjects, r.cells, r.studentId));
}

/** Rank by total desc; equal totals share a rank; nulls excluded. */
export function computeRanks(rows: ComputedRow[]): Record<string, number> {
  const sorted = rows
    .filter((r) => r.total !== null)
    .sort((a, b) => (b.total as number) - (a.total as number));
  const ranks: Record<string, number> = {};
  let prevTotal: number | null = null;
  let prevRank = 0;
  sorted.forEach((r, i) => {
    if (prevTotal !== null && r.total === prevTotal) {
      ranks[r.studentId] = prevRank;
    } else {
      ranks[r.studentId] = i + 1;
      prevRank = i + 1;
      prevTotal = r.total;
    }
  });
  return ranks;
}

export interface SubjectStats {
  average: number | null;
  highest: number | null;
  lowest: number | null;
  enteredCount: number;
  missingCount: number;
}

export function subjectStats(subject: SubjectColumn, rows: ComputedRow[]): SubjectStats {
  const values = rows
    .map((r) => r.cells[subject.id]?.marks)
    .filter((m): m is number => m !== null && m !== undefined && !rows.find((r) => r.studentId)?.cells[subject.id]?.is_absent);
  const entered = rows.filter((r) => {
    const c = r.cells[subject.id];
    return c && c.marks !== null && !c.is_absent;
  }).length;
  const absent = rows.filter((r) => r.cells[subject.id]?.is_absent).length;
  return {
    average: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null,
    highest: values.length ? Math.max(...values) : null,
    lowest: values.length ? Math.min(...values) : null,
    enteredCount: entered,
    missingCount: rows.length - entered - absent,
  };
}

/** Validate a full marks grid before review/publish. */
export function validateGrid(
  subjects: SubjectColumn[],
  rows: { studentId: string; cells: Record<string, MarkCell> }[],
): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  for (const row of rows) {
    for (const s of subjects) {
      const cell = row.cells[s.id];
      if (!cell) continue;
      if (cell.marks !== null) {
        if (cell.marks < 0) problems.push(`Marks below zero in "${s.subject_name}"`);
        if (cell.marks > s.max_marks) problems.push(`Marks exceed maximum (${s.max_marks}) in "${s.subject_name}"`);
        if (cell.is_absent) problems.push(`Absent student should not have numerical marks in "${s.subject_name}"`);
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

export function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/csv") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
