// Admin Tests & Marks: list of tests with status workflow; create-test wizard step 1;
// marks entry happens in AdminTestMarks (spreadsheet-style / mobile card flow).
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ArrowRight, Eye, Lock, FileDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate, downloadText, toCsv } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, Textarea, Checkbox } from "@/components/ui";
import type { Course, Batch, Subject, AcademicSession } from "@/types/database";

const TYPE_LABELS: Record<string, string> = {
  weekly: "Weekly Test", monthly: "Monthly Test", mock: "Mock Test",
  physical: "Physical Test", interview: "Interview Assessment", custom: "Custom",
};

export default function AdminTests() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: tests, isLoading } = useQuery({
    queryKey: ["admin_tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("*,batches(name,courses(title))")
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const publish = useMutation({
    mutationFn: async ({ t, next }: { t: any; next: string }) => {
      const { error } = await supabase.from("tests").update({ status: next }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: (_v, vars) => {
      toast.success(vars.next === "published" ? "Results published — students can now see them" : vars.next === "locked" ? "Results locked" : "Test unpublished (back to draft)");
      qc.invalidateQueries({ queryKey: ["admin_tests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportMissing = useMemo(() => async (t: any) => {
    const { data: tsubs } = await supabase.from("test_subjects").select("id,subject_name,max_marks").eq("test_id", t.id);
    const { data: enr } = await supabase
      .from("enrollments").select("student_id,students(full_name,student_code)").eq("batch_id", t.batch_id).is("left_on", null);
    const { data: marks } = await supabase.from("student_marks").select("test_subject_id,student_id,marks,is_absent")
      .in("test_subject_id", (tsubs ?? []).map((s: any) => s.id));
    const rows = (enr ?? []).map((e: any) => {
      const row: any[] = [e.students.student_code, e.students.full_name];
      for (const s of tsubs ?? []) {
        const m = marks?.find((mk: any) => mk.test_subject_id === s.id && mk.student_id === e.student_id);
        row.push(m?.is_absent ? "AB" : (m?.marks ?? ""));
      }
      return row;
    });
    downloadText(`test-${t.name.replace(/\s+/g, "-")}-missing.csv`,
      toCsv(["Student ID", "Name", ...(tsubs ?? []).map((s: any) => `${s.subject_name} (/${s.max_marks})`)], rows));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Tests &amp; Marks</h1>
          <p className="mt-0.5 text-sm text-muted">Create tests, enter marks, review and publish results.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden /> Create Test</Button>
      </div>

      {isLoading ? <Spinner /> : !tests?.length ? (
        <EmptyState
          title="No tests yet"
          description="Create your first test: pick a batch, choose subjects, set maximum marks — then enter marks in the marks sheet."
          action={<Button onClick={() => setCreating(true)}>Create Test</Button>}
        />
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={t.status === "published" ? "green" : t.status === "locked" ? "navy" : "amber"}>
                    {t.status === "published" ? "Published" : t.status === "locked" ? "Locked" : "Draft"}
                  </Badge>
                  <Badge tone="gray">{TYPE_LABELS[t.test_type] ?? t.test_type}</Badge>
                </div>
                <h2 className="mt-1.5 truncate font-heading font-bold text-navy">{t.name}</h2>
                <p className="text-xs text-muted">
                  {t.batches?.name} · {t.batches?.courses?.title} · {formatDate(t.test_date)}
                  {t.published_at ? ` · published ${formatDate(t.published_at)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Link to={`/admin/tests/${t.id}`} className="btn-outline btn-sm">
                  {t.status === "draft" ? "Enter Marks" : "View Marks"} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <Button variant="ghost" size="sm" onClick={() => exportMissing(t)} aria-label="Export CSV template/entries"><FileDown className="h-4 w-4" /></Button>
                {t.status === "draft" ? (
                  <Button size="sm" variant="accent" onClick={() => publish.mutate({ t, next: "published" })}>Publish</Button>
                ) : t.status === "published" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => publish.mutate({ t, next: "locked" })}><Lock className="h-3.5 w-3.5" aria-hidden /> Lock</Button>
                    <Button size="sm" variant="outline" onClick={() => publish.mutate({ t, next: "draft" })}><Eye className="h-3.5 w-3.5" aria-hidden /> Unpublish</Button>
                  </>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateTestModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function CreateTestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", test_type: "weekly", academic_session_id: "", course_id: "", batch_id: "",
    test_date: new Date().toISOString().slice(0, 10), instructions: "", show_rank: false,
  });
  const [subjectMarks, setSubjectMarks] = useState<Record<string, { max: string; passing: string }>>({});

  const { data: sessions } = useQuery({
    queryKey: ["admin_sessions_light"],
    queryFn: async () => (await supabase.from("academic_sessions").select("id,name").order("name")).data as Pick<AcademicSession, "id" | "name">[],
  });
  const { data: courses } = useQuery({
    queryKey: ["admin_courses_light"],
    queryFn: async () => (await supabase.from("courses").select("id,title").order("title")).data as Pick<Course, "id" | "title">[],
  });
  const { data: batches } = useQuery({
    queryKey: ["admin_batches_light3", form.course_id],
    enabled: !!form.course_id,
    queryFn: async () => (await supabase.from("batches").select("id,name").eq("course_id", form.course_id).is("archived_at", null)).data as Pick<Batch, "id" | "name">[],
  });
  const { data: subjects } = useQuery({
    queryKey: ["admin_subjects_light2", form.course_id],
    enabled: !!form.course_id,
    queryFn: async () => (await supabase.from("subjects").select("id,name").eq("course_id", form.course_id).is("archived_at", null)).data as Pick<Subject, "id" | "name">[],
  });

  const selectedSubjects = Object.entries(subjectMarks).filter(([_, v]) => v.max !== "" && Number(v.max) > 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Test name is required");
      if (!form.course_id || !form.batch_id) throw new Error("Select a course and batch");
      if (!form.test_date) throw new Error("Pick the test date");
      if (!selectedSubjects.length) throw new Error("Add at least one subject with maximum marks");
      const { data: test, error } = await supabase.from("tests").insert({
        name: form.name.trim(),
        test_type: form.test_type,
        academic_session_id: form.academic_session_id || null,
        course_id: form.course_id,
        batch_id: form.batch_id,
        test_date: form.test_date,
        instructions: form.instructions || null,
        show_rank: form.show_rank,
        status: "draft",
      }).select("id").single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("test_subjects").insert(
        selectedSubjects.map(([sid, v], i) => ({
          test_id: test.id,
          subject_id: sid,
          subject_name: subjects?.find((s) => s.id === sid)?.name ?? "Subject",
          max_marks: Number(v.max),
          passing_marks: Number(v.passing || 0),
          display_order: (i + 1) * 10,
        })),
      );
      if (e2) throw e2;
      return test.id;
    },
    onSuccess: (testId) => {
      toast.success("Test created — now enter marks");
      qc.invalidateQueries({ queryKey: ["admin_tests"] });
      onClose();
      window.location.href = `/admin/tests/${testId}`;
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!open) return null;
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title="Create Test" wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Test Name" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Weekly Test 4 — Mathematics" />
          </Field>
          <Field label="Test Type" required>
            <Select value={form.test_type} onChange={(e) => set("test_type", e.target.value)}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Academic Session">
            <Select value={form.academic_session_id} onChange={(e) => set("academic_session_id", e.target.value)}>
              <option value="">Not linked</option>
              {(sessions ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Test Date" required>
            <Input type="date" value={form.test_date} onChange={(e) => set("test_date", e.target.value)} />
          </Field>
          <Field label="Course" required>
            <Select value={form.course_id} onChange={(e) => { set("course_id", e.target.value); set("batch_id", ""); setSubjectMarks({}); }}>
              <option value="">Select course…</option>
              {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          <Field label="Batch" required>
            <Select value={form.batch_id} onChange={(e) => set("batch_id", e.target.value)} disabled={!form.course_id}>
              <option value="">{form.course_id ? "Select batch…" : "Select a course first"}</option>
              {(batches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        </div>

        <div>
          <p className="label">Subjects &amp; Maximum Marks <span className="text-error">*</span></p>
          {!form.course_id ? (
            <p className="text-xs text-muted">Select a course to load its subjects.</p>
          ) : (
            <div className="space-y-2">
              {(subjects ?? []).map((s) => (
                <div key={s.id} className="grid grid-cols-[1fr,90px,90px] items-center gap-2 rounded-md bg-offwhite px-3 py-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={subjectMarks[s.id] !== undefined}
                      onChange={(e) => {
                        setSubjectMarks((m) => {
                          const next = { ...m };
                          if (e.target.checked) next[s.id] = { max: "100", passing: "33" };
                          else delete next[s.id];
                          return next;
                        });
                      }}
                    />
                    {s.name}
                  </label>
                  <Input
                    type="number" min={1} placeholder="Max"
                    value={subjectMarks[s.id]?.max ?? ""}
                    onChange={(e) => setSubjectMarks((m) => ({ ...m, [s.id]: { ...m[s.id], max: e.target.value } }))}
                    aria-label={`Maximum marks for ${s.name}`}
                    disabled={subjectMarks[s.id] === undefined}
                  />
                  <Input
                    type="number" min={0} placeholder="Passing"
                    value={subjectMarks[s.id]?.passing ?? ""}
                    onChange={(e) => setSubjectMarks((m) => ({ ...m, [s.id]: { ...m[s.id], passing: e.target.value } }))}
                    aria-label={`Passing marks for ${s.name}`}
                    disabled={subjectMarks[s.id] === undefined}
                  />
                </div>
              ))}
              {!subjects?.length ? <p className="text-xs text-muted">No subjects defined for this course — add them under Admin → Subjects.</p> : null}
            </div>
          )}
        </div>

        <Field label="Instructions (optional)">
          <Textarea rows={2} value={form.instructions} onChange={(e) => set("instructions", e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.show_rank} onChange={(e) => set("show_rank", e.target.checked)} />
          Show student rank after publishing (Site Setting can force this off globally)
        </label>

        <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending}>Create Test &amp; Enter Marks</Button>
        </div>
      </div>
    </Modal>
  );
}
