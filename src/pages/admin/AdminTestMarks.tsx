// Marks sheet: desktop spreadsheet-style entry; mobile one-student-at-a-time flow.
// Validation: no negatives, never above max, absent excludes marks, missing ≠ 0.
import { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, CheckCircle2, AlertTriangle, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  computeAll, computeRanks, validateGrid, toCsv, downloadText,
  type SubjectColumn, type MarkCell,
} from "@/lib/marks";
import { formatDate } from "@/lib/format";
import { Button, Card, Field, Input, Spinner, Badge, ConfirmDialog } from "@/components/ui";

interface Row { studentId: string; name: string; code: string; cells: Record<string, MarkCell>; }

export default function AdminTestMarks() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const [mobileIdx, setMobileIdx] = useState(0);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const { data: test, isLoading } = useQuery({
    queryKey: ["test", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("*,batches(name),courses(title)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: testSubjects } = useQuery({
    queryKey: ["test_subjects", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_subjects")
        .select("*")
        .eq("test_id", id!)
        .order("display_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: roster } = useQuery({
    queryKey: ["test_roster", test?.batch_id],
    enabled: !!test,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("student_id,students(id,full_name,student_code)")
        .eq("batch_id", test!.batch_id)
        .is("left_on", null);
      if (error) throw error;
      return (data ?? []).map((e: any) => ({ id: e.students.id, name: e.students.full_name, code: e.students.student_code }));
    },
  });

  const { data: existingMarks } = useQuery({
    queryKey: ["test_marks", id],
    enabled: !!id && !!testSubjects?.length,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_marks")
        .select("*")
        .in("test_subject_id", testSubjects!.map((ts) => ts.id));
      if (error) throw error;
      return data as any[];
    },
  });

  const subjects: SubjectColumn[] = useMemo(
    () => (testSubjects ?? []).map((ts) => ({
      id: ts.id, subject_name: ts.subject_name, max_marks: Number(ts.max_marks), passing_marks: Number(ts.passing_marks),
    })),
    [testSubjects],
  );

  // Initialize editable rows once roster + marks are loaded
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!roster || !testSubjects || !existingMarks || initialized) return;
    setRows(roster.map((s) => {
      const cells: Record<string, MarkCell> = {};
      for (const ts of testSubjects) {
        const m = existingMarks.find((mk) => mk.test_subject_id === ts.id && mk.student_id === s.id);
        cells[ts.id] = {
          marks: m?.marks !== null && m?.marks !== undefined ? Number(m.marks) : null,
          is_absent: m?.is_absent ?? false,
        };
      }
      return { studentId: s.id, name: s.name, code: s.code, cells };
    }));
    setInitialized(true);
  }, [roster, testSubjects, existingMarks, initialized]);

  const published = test?.status === "published" || test?.status === "locked";

  function setCell(studentId: string, tsId: string, patch: Partial<MarkCell>) {
    if (published) return;
    setRows((rs) => rs.map((r) => (r.studentId === studentId
      ? { ...r, cells: { ...r.cells, [tsId]: { ...r.cells[tsId], ...patch, touched: true } } }
      : r)));
    setDirty(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      // Validate before save
      const v = validateGrid(subjects, rows.map((r) => ({ studentId: r.studentId, cells: r.cells })));
      if (!v.ok) throw new Error(v.problems[0]);

      const payloads: { test_subject_id: string; student_id: string; marks: number | null; is_absent: boolean }[] = [];
      for (const r of rows) {
        for (const ts of testSubjects ?? []) {
          const cell = r.cells[ts.id];
          if (!cell) continue;
          // A blank, untouched cell stays "missing" — it must never be stored as zero.
          if (cell.marks === null && !cell.is_absent && cell.touched !== true) continue;
          payloads.push({
            test_subject_id: ts.id,
            student_id: r.studentId,
            marks: cell.is_absent ? null : cell.marks,
            is_absent: cell.is_absent,
          });
        }
      }
      if (!payloads.length) return;

      // One upsert for the whole grid rather than one request per cell — a
      // 40-student, 5-subject sheet goes from 200 requests to 1.
      const { error } = await supabase
        .from("student_marks")
        .upsert(payloads, { onConflict: "test_subject_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marks saved as draft");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["test_marks", id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const v = validateGrid(subjects, rows.map((r) => ({ studentId: r.studentId, cells: r.cells })));
      if (!v.ok) throw new Error(v.problems[0]);
      await save.mutateAsync();
      const { error } = await supabase.from("tests").update({ status: "published" }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Results published — students can now see their marks");
      setConfirmPublish(false);
      qc.invalidateQueries({ queryKey: ["test", id] });
      qc.invalidateQueries({ queryKey: ["admin_tests"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Publish failed"),
  });

  // Computed review
  const computed = useMemo(
    () => computeAll(subjects, rows.map((r) => ({ studentId: r.studentId, cells: r.cells }))),
    [subjects, rows],
  );
  const ranks = useMemo(() => computeRanks(computed), [computed]);
  const missing = computed.filter((r) => r.hasMissing).length;
  const problems = useMemo(() => validateGrid(subjects, rows.map((r) => ({ studentId: r.studentId, cells: r.cells }))), [subjects, rows]);

  const csvTemplate = () => {
    downloadText(`marks-template-${test?.name?.replace(/\s+/g, "-")}.csv`, toCsv(
      ["Student ID", "Name", ...subjects.map((s) => `${s.subject_name} (/${s.max_marks}) or AB for absent`)],
      rows.map((r) => [r.code, r.name, ...subjects.map(() => "")]),
    ));
  };

  const csvExport = () => {
    downloadText(`marks-${test?.name?.replace(/\s+/g, "-")}.csv`, toCsv(
      ["Student ID", "Name", ...subjects.map((s) => s.subject_name), "Total", "Percentage", "Rank", "Status"],
      rows.map((r, i) => {
        const c = computed[i];
        return [
          r.code, r.name,
          ...subjects.map((s) => {
            const cell = r.cells[s.id];
            return cell?.is_absent ? "AB" : cell?.marks ?? "";
          }),
          c.total ?? "INCOMPLETE", c.percentage !== null ? `${c.percentage}%` : "", ranks[r.studentId] ?? "", c.hasMissing ? "Incomplete" : c.passed ? "Pass" : "Fail",
        ];
      }),
    ));
  };

  if (isLoading || !test || !initialized) return <Spinner label="Loading marks sheet…" />;

  const currentRow = rows[mobileIdx];
  const progress = rows.length ? Math.round(((mobileIdx + 1) / rows.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <Link to="/admin/tests" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Tests
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">{test.name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {test.batches?.name} · {test.courses?.title} · {formatDate(test.test_date)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={test.status === "published" ? "green" : test.status === "locked" ? "navy" : "amber"}>
            {test.status === "published" ? "Published" : test.status === "locked" ? "Locked" : "Draft"}
          </Badge>
          {!published ? (
            <>
              <Button variant="outline" onClick={csvTemplate}><FileDown className="h-4 w-4" aria-hidden /> CSV Template</Button>
              <Button variant="outline" onClick={csvExport}><FileDown className="h-4 w-4" aria-hidden /> Export</Button>
              <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
                <Save className="h-4 w-4" aria-hidden /> Save Draft
              </Button>
              <Button variant="accent" onClick={() => setConfirmPublish(true)}>
                <CheckCircle2 className="h-4 w-4" aria-hidden /> Review &amp; Publish
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Review summary */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-navy">Review Summary</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">Students</p><p className="font-heading text-lg font-bold">{rows.length}</p></div>
          <div><p className="text-xs text-muted">Missing entries</p><p className={`font-heading text-lg font-bold ${missing ? "text-amber-600" : "text-success"}`}>{missing}</p></div>
          <div><p className="text-xs text-muted">Validation</p><p className={`font-heading text-lg font-bold ${problems.ok ? "text-success" : "text-error"}`}>{problems.ok ? "OK" : "Issues"}</p></div>
          <div><p className="text-xs text-muted">Status</p><p className="font-heading text-lg font-bold">{published ? "Visible to students" : "Hidden (draft)"}</p></div>
        </div>
        {!problems.ok ? (
          <ul className="mt-3 space-y-1 rounded-md bg-red-50 p-3 text-xs text-error" role="alert">
            {problems.problems.slice(0, 6).map((p, i) => <li key={i} className="flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden /> {p}</li>)}
          </ul>
        ) : null}
      </Card>

      {/* Desktop spreadsheet */}
      <Card className="hidden overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-offwhite">
              <tr>
                <th className="table-th sticky left-0 z-10 bg-offwhite">Student</th>
                {subjects.map((s) => (
                  <th key={s.id} className="table-th whitespace-nowrap">{s.subject_name} <span className="font-normal text-muted">/{s.max_marks}</span></th>
                ))}
                <th className="table-th">Absent</th>
                <th className="table-th">Total</th>
                <th className="table-th">%</th>
                {test.show_rank ? <th className="table-th">Rank</th> : null}
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lightgray">
              {rows.map((r, i) => {
                const c = computed[i];
                return (
                  <tr key={r.studentId}>
                    <td className="table-td sticky left-0 z-10 bg-white">
                      <p className="font-medium text-navy">{r.name}</p>
                      <p className="font-mono text-[10px] text-muted">{r.code}</p>
                    </td>
                    {subjects.map((s) => {
                      const cell = r.cells[s.id];
                      return (
                        <td key={s.id} className="table-td">
                          <Input
                            type="number"
                            min={0}
                            max={s.max_marks}
                            value={cell.marks ?? ""}
                            disabled={published || cell.is_absent}
                            onChange={(e) => setCell(r.studentId, s.id, { marks: e.target.value === "" ? null : Number(e.target.value) })}
                            aria-label={`Marks for ${r.name} in ${s.subject_name}`}
                            className="min-h-[36px] w-20"
                          />
                        </td>
                      );
                    })}
                    <td className="table-td">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-lightgray text-navy"
                        checked={subjects.every((s) => r.cells[s.id]?.is_absent)}
                        disabled={published}
                        onChange={(e) => {
                          for (const s of subjects) setCell(r.studentId, s.id, { is_absent: e.target.checked, marks: e.target.checked ? null : r.cells[s.id]?.marks ?? null });
                        }}
                        aria-label={`Mark ${r.name} absent for all subjects`}
                      />
                    </td>
                    <td className="table-td font-semibold">{c.total ?? <span className="text-muted">—</span>}</td>
                    <td className="table-td">{c.percentage !== null ? `${c.percentage}%` : "—"}</td>
                    {test.show_rank ? <td className="table-td">{ranks[r.studentId] ?? "—"}</td> : null}
                    <td className="table-td">
                      {c.hasMissing ? <Badge tone="amber">Incomplete</Badge> : c.passed ? <Badge tone="green">Pass</Badge> : <Badge tone="red">Fail</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile one-at-a-time */}
      <div className="lg:hidden">
        {rows.length ? (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={mobileIdx === 0} onClick={() => setMobileIdx((i) => i - 1)} aria-label="Previous student">
                <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
              </Button>
              <div className="text-center">
                <p className="font-heading font-bold text-navy">{currentRow.name}</p>
                <p className="font-mono text-[10px] text-muted">{currentRow.code}</p>
              </div>
              <Button variant="outline" size="sm" disabled={mobileIdx >= rows.length - 1} onClick={() => setMobileIdx((i) => i + 1)} aria-label="Next student">
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lightgray" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-problue transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 space-y-3">
              {subjects.map((s) => {
                const cell = currentRow.cells[s.id];
                return (
                  <div key={s.id} className="rounded-lg border border-lightgray p-3">
                    <Field label={`${s.subject_name} (max ${s.max_marks})`}>
                      <Input
                        type="number" inputMode="numeric" min={0} max={s.max_marks}
                        value={cell.marks ?? ""}
                        disabled={published || cell.is_absent}
                        onChange={(e) => setCell(currentRow.studentId, s.id, { marks: e.target.value === "" ? null : Number(e.target.value) })}
                        className="text-lg"
                      />
                    </Field>
                    <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy"
                        checked={cell.is_absent} disabled={published}
                        onChange={(e) => setCell(currentRow.studentId, s.id, { is_absent: e.target.checked, marks: e.target.checked ? null : null })}
                      />
                      Absent
                    </label>
                  </div>
                );
              })}
            </div>
            {!published ? (
              <Button className="mt-4 w-full" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
                <Save className="h-4 w-4" aria-hidden /> Save Draft
              </Button>
            ) : null}
          </Card>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        onConfirm={() => publish.mutate()}
        title="Publish results?"
        message={`${missing} student(s) still have missing entries — they will show as "Incomplete" to students, not zero. Published results can only be changed by admins and every change is audit-logged. Publish now?`}
        confirmLabel="Publish Results"
      />
    </div>
  );
}
