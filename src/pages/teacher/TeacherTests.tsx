// Teacher Tests: create tests for the teacher's own batches and jump into the
// marks sheet. Publishing is only offered when the academy has granted the
// teacher "can publish results"; otherwise marks stay in draft for admin review.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ArrowRight, FileSpreadsheet, Lock, Info, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge } from "@/components/ui";

const TEST_TYPES = [
  { value: "weekly", label: "Weekly test" },
  { value: "monthly", label: "Monthly test" },
  { value: "mock", label: "Mock test" },
  { value: "physical", label: "Physical test" },
  { value: "interview", label: "Interview assessment" },
  { value: "custom", label: "Custom" },
];

export default function TeacherTests() {
  const qc = useQueryClient();
  const { data: scope, isLoading: loadingScope } = useTeacherScope();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", test_type: "weekly", batch_id: "", test_date: new Date().toISOString().slice(0, 10),
    instructions: "", show_rank: false,
  });
  const [subjectMarks, setSubjectMarks] = useState<Record<string, { max: string; passing: string }>>({});
  const allowedBatchIds = scope?.allowedBatchIds ?? [];

  const { data: subjects } = useQuery({
    queryKey: ["teacher_subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id,name,course_id").is("archived_at", null).order("name");
      if (error) throw error;
      return data as { id: string; name: string; course_id: string | null }[];
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["teacher_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("academic_sessions").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: tests, isLoading } = useQuery({
    queryKey: ["teacher_tests", allowedBatchIds.join(",")],
    enabled: !!scope,
    queryFn: async () => {
      if (!allowedBatchIds.length) return [];
      const { data, error } = await supabase
        .from("tests")
        .select("*,batches(name),courses(title)")
        .in("batch_id", allowedBatchIds)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const batchCourse = useMemo(() => new Map((scope?.batches ?? []).map((b) => [b.id, b.course_id])), [scope?.batches]);

  const eligibleSubjects = useMemo(() => {
    const courseId = form.batch_id ? batchCourse.get(form.batch_id) : undefined;
    return (subjects ?? []).filter((s) => !courseId || !s.course_id || s.course_id === courseId);
  }, [subjects, form.batch_id, batchCourse]);

  const selected = Object.entries(subjectMarks).filter(([, v]) => v.max !== "" && Number(v.max) > 0);

  function openCreate() {
    setForm({
      name: "", test_type: "weekly", batch_id: scope?.batches[0]?.id ?? "",
      test_date: new Date().toISOString().slice(0, 10), instructions: "", show_rank: false,
    });
    setSubjectMarks({});
    setError("");
    setCreating(true);
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Give the test a name");
      if (!form.batch_id) throw new Error("Select one of your batches");
      if (!form.test_date) throw new Error("Choose the test date");
      if (!selected.length) throw new Error("Add at least one subject with maximum marks");
      const course_id = batchCourse.get(form.batch_id);
      if (!course_id) throw new Error("That batch has no course linked — please contact an administrator.");

      const { data: test, error } = await supabase
        .from("tests")
        .insert({
          name: form.name.trim(),
          test_type: form.test_type,
          academic_session_id: sessions?.[0]?.id ?? null,
          course_id,
          batch_id: form.batch_id,
          test_date: form.test_date,
          instructions: form.instructions.trim() || null,
          show_rank: form.show_rank,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: e2 } = await supabase.from("test_subjects").insert(
        selected.map(([sid, v], i) => ({
          test_id: test.id,
          subject_id: sid,
          subject_name: (subjects ?? []).find((s) => s.id === sid)?.name ?? "Subject",
          max_marks: Number(v.max),
          passing_marks: v.passing ? Number(v.passing) : 0,
          display_order: (i + 1) * 10,
        })),
      );
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Test created — now enter the marks.");
      qc.invalidateQueries({ queryKey: ["teacher_tests"] });
      setCreating(false);
    },
    onError: (e: any) => setError(e.message ?? "Could not create the test"),
  });

  const publish = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await supabase.from("tests").update({ status: "published" }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Results published — students can now see their marks.");
      qc.invalidateQueries({ queryKey: ["teacher_tests"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not publish the results"),
  });

  if (loadingScope) return <Spinner label="Loading your batches…" />;

  if (!scope?.teacher || !scope.batches.length) {
    return <EmptyState title="No batches assigned" description="You need an assigned batch before you can create tests." />;
  }

  // Captured before the callbacks below so the non-null narrowing survives.
  const canPublishResults = scope.teacher.can_publish_results;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Tests &amp; Marks</h1>
          <p className="mt-0.5 text-sm text-muted">Create tests for your batches and enter marks in the marks sheet.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> New Test</Button>
      </div>

      {!canPublishResults ? (
        <Card className="border-saffron-200 bg-saffron-50 p-4">
          <p className="flex items-start gap-2 text-sm text-navy">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-saffron-600" aria-hidden />
            <span>
              You can save marks, but publishing results needs permission from the academy. Ask an administrator to enable
              “Allow publish” on your profile — until then, an admin reviews and publishes your marks.
            </span>
          </p>
        </Card>
      ) : null}

      {isLoading ? (
        <Spinner label="Loading tests…" />
      ) : !tests?.length ? (
        <EmptyState
          title="No tests yet"
          description="Create a test for a batch, then open the marks sheet to enter marks student by student."
          action={<Button onClick={openCreate}>New Test</Button>}
        />
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-heading font-bold text-navy">
                    <FileSpreadsheet className="h-4 w-4 text-problue" aria-hidden /> {t.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {t.batches?.name} · {t.courses?.title} · {formatDate(t.test_date)} ·{" "}
                    {TEST_TYPES.find((x) => x.value === t.test_type)?.label ?? t.test_type}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={t.status === "published" ? "green" : t.status === "locked" ? "navy" : "amber"}>
                    {t.status}
                  </Badge>
                  {t.status === "locked" ? <Badge tone="gray"><Lock className="h-3 w-3" aria-hidden /> Locked</Badge> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                <Link to={`/teacher/tests/${t.id}`} className="btn-primary btn-sm">
                  {t.status === "draft" ? "Enter marks" : "View marks"} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                {t.status === "draft" && canPublishResults ? (
                  <Button variant="accent" size="sm" onClick={() => publish.mutate(t)} loading={publish.isPending}>
                    <Eye className="h-3.5 w-3.5" aria-hidden /> Publish results
                  </Button>
                ) : null}
                {t.status === "draft" && !canPublishResults ? (
                  <span className="self-center text-xs text-muted">Awaiting admin review to publish</span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New Test" wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Test name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekly Test 4 — Mathematics" /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Batch" required>
              <Select value={form.batch_id} onChange={(e) => { setForm({ ...form, batch_id: e.target.value }); setSubjectMarks({}); }}>
                <option value="">Select a batch…</option>
                {scope.batches.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.courses?.title ?? ""}</option>)}
              </Select>
            </Field>
            <Field label="Test type">
              <Select value={form.test_type} onChange={(e) => setForm({ ...form, test_type: e.target.value })}>
                {TEST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
            <Field label="Test date" required><Input type="date" value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })} /></Field>
          </div>

          <div className="rounded-md border border-lightgray p-3">
            <p className="label">Subjects &amp; maximum marks</p>
            {!form.batch_id ? (
              <p className="text-sm text-muted">Choose a batch to list its subjects.</p>
            ) : !eligibleSubjects.length ? (
              <p className="text-sm text-muted">No subjects are set up for this course yet. Ask an administrator to add them.</p>
            ) : (
              <ul className="space-y-2">
                {eligibleSubjects.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-lightgray text-navy"
                        checked={!!subjectMarks[s.id]}
                        onChange={(e) => setSubjectMarks({
                          ...subjectMarks,
                          [s.id]: e.target.checked ? { max: subjectMarks[s.id]?.max ?? "100", passing: subjectMarks[s.id]?.passing ?? "33" } : { max: "", passing: "" },
                        })}
                      />
                      {s.name}
                    </label>
                    <div className="w-24">
                      <span className="text-[11px] text-muted">Max</span>
                      <Input
                        type="number" min={1} aria-label={`Maximum marks for ${s.name}`}
                        value={subjectMarks[s.id]?.max ?? ""} disabled={!subjectMarks[s.id]}
                        onChange={(e) => setSubjectMarks({ ...subjectMarks, [s.id]: { max: e.target.value, passing: subjectMarks[s.id]?.passing ?? "0" } })}
                      />
                    </div>
                    <div className="w-24">
                      <span className="text-[11px] text-muted">Pass</span>
                      <Input
                        type="number" min={0} aria-label={`Passing marks for ${s.name}`}
                        value={subjectMarks[s.id]?.passing ?? ""} disabled={!subjectMarks[s.id]}
                        onChange={(e) => setSubjectMarks({ ...subjectMarks, [s.id]: { max: subjectMarks[s.id]?.max ?? "0", passing: e.target.value } })}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Field label="Instructions for students" hint="Optional"><Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={form.show_rank} onChange={(e) => setForm({ ...form, show_rank: e.target.checked })} />
            Show ranks in the published results
          </label>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create Test</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
