// Teacher Assignments: create homework for the teacher's own batches and review
// student submissions with feedback. Batch pickers are limited to assigned
// batches so a submission never fails a row-level security check.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Eye, EyeOff, ClipboardList, Users, Upload, Save, Paperclip, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { uploadPrivate, openPrivateFile } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, Textarea, Checkbox } from "@/components/ui";

interface FormState {
  title: string;
  batch_id: string;
  subject_id: string;
  instructions: string;
  due_date: string;
  attachment_url: string;
  external_link: string;
  allow_submissions: boolean;
  status: "draft" | "published" | "archived";
}

const EMPTY: FormState = {
  title: "", batch_id: "", subject_id: "", instructions: "", due_date: "",
  attachment_url: "", external_link: "", allow_submissions: true, status: "draft",
};

export default function TeacherAssignments() {
  const qc = useQueryClient();
  const { data: scope, isLoading: loadingScope } = useTeacherScope();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const allowedBatchIds = scope?.allowedBatchIds ?? [];

  const { data: subjects } = useQuery({
    queryKey: ["teacher_subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id,name,course_id").is("archived_at", null).order("name");
      if (error) throw error;
      return data as { id: string; name: string; course_id: string | null }[];
    },
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["teacher_assignments_list", allowedBatchIds.join(",")],
    enabled: !!scope,
    queryFn: async () => {
      if (!allowedBatchIds.length) return [];
      const { data, error } = await supabase
        .from("assignments")
        .select("*,batches(name),subjects(name),courses(title)")
        .in("batch_id", allowedBatchIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: submissions, isLoading: loadingSubs } = useQuery({
    queryKey: ["teacher_submissions", reviewing?.id],
    enabled: !!reviewing,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*,students(full_name,student_code)")
        .eq("assignment_id", reviewing!.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      setFeedback(Object.fromEntries(rows.map((r) => [r.id, r.feedback ?? ""])));
      return rows;
    },
  });

  const batchCourse = useMemo(() => new Map((scope?.batches ?? []).map((b) => [b.id, b.course_id])), [scope?.batches]);

  function openCreate() {
    setForm({ ...EMPTY, batch_id: scope?.batches[0]?.id ?? "" });
    setError("");
    setCreating(true);
  }

  function openEdit(a: any) {
    setForm({
      title: a.title, batch_id: a.batch_id, subject_id: a.subject_id ?? "",
      instructions: a.instructions ?? "", due_date: a.due_date ?? "",
      attachment_url: a.attachment_url ?? "", external_link: a.external_link ?? "",
      allow_submissions: a.allow_submissions, status: a.status,
    });
    setError("");
    setEditing(a);
  }

  async function onPickAttachment(file: File) {
    if (!form.batch_id) { toast.error("Choose a batch first."); return; }
    setUploading(true);
    try {
      const { path } = await uploadPrivate("assignment-files", file, `batch-${form.batch_id}`);
      setForm((f) => ({ ...f, attachment_url: path }));
      toast.success("Attachment uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormState; id?: string }) => {
      if (values.title.trim().length < 2) throw new Error("Give the assignment a title");
      if (!values.batch_id) throw new Error("Select one of your batches");
      const course_id = batchCourse.get(values.batch_id);
      if (!course_id) throw new Error("That batch has no course linked — please contact an administrator.");
      const payload = {
        title: values.title.trim(),
        course_id,
        batch_id: values.batch_id,
        subject_id: values.subject_id || null,
        instructions: values.instructions.trim() || null,
        due_date: values.due_date || null,
        attachment_url: values.attachment_url || null,
        external_link: values.external_link.trim() || null,
        allow_submissions: values.allow_submissions,
        status: values.status,
      };
      if (id) {
        const { error } = await supabase.from("assignments").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assignments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Assignment updated" : "Assignment created");
      qc.invalidateQueries({ queryKey: ["teacher_assignments_list"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the assignment"),
  });

  const toggle = useMutation({
    mutationFn: async (a: any) => {
      const { error } = await supabase.from("assignments").update({ status: a.status === "published" ? "draft" : "published" }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["teacher_assignments_list"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveFeedback = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase
        .from("assignment_submissions")
        .update({ feedback: value.trim() || null, viewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Feedback saved"); qc.invalidateQueries({ queryKey: ["teacher_submissions", reviewing?.id] }); },
    onError: (e: any) => toast.error(e.message ?? "Could not save feedback"),
  });

  if (loadingScope) return <Spinner label="Loading your batches…" />;

  if (!scope?.teacher || !scope.batches.length) {
    return (
      <EmptyState
        title="No batches assigned"
        description="You need at least one assigned batch before you can publish assignments. Please contact an administrator."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Assignments</h1>
          <p className="mt-0.5 text-sm text-muted">Homework for your batches. Drafts stay hidden until published.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> New Assignment</Button>
      </div>

      {isLoading ? (
        <Spinner label="Loading assignments…" />
      ) : !assignments?.length ? (
        <EmptyState
          title="No assignments yet"
          description="Create your first assignment for one of your batches."
          action={<Button onClick={openCreate}>New Assignment</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assignments.map((a) => (
            <Card key={a.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1.5 font-heading font-bold text-navy">
                    <ClipboardList className="h-4 w-4 text-problue" aria-hidden /> {a.title}
                  </h2>
                  <p className="text-xs text-muted">{a.batches?.name} · {a.courses?.title}{a.subjects?.name ? ` · ${a.subjects.name}` : ""}</p>
                </div>
                <Badge tone={a.status === "published" ? "green" : a.status === "draft" ? "amber" : "gray"}>{a.status}</Badge>
              </div>
              {a.instructions ? <p className="mt-2 flex-1 text-sm text-ink/90">{a.instructions}</p> : <div className="flex-1" />}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Due {formatDate(a.due_date)}
                {a.allow_submissions ? " · submissions open" : " · submissions closed"}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                <Button variant="outline" size="sm" onClick={() => setReviewing(a)}><Users className="h-3.5 w-3.5" aria-hidden /> Submissions</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => toggle.mutate(a)}>
                  {a.status === "published" ? <><EyeOff className="h-3.5 w-3.5" aria-hidden /> Unpublish</> : <><Eye className="h-3.5 w-3.5" aria-hidden /> Publish</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit Assignment" : "New Assignment"} wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ values: form, id: editing?.id }); }}>
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Batch" required hint="Only your assigned batches are listed">
              <Select value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value, subject_id: "" })}>
                <option value="">Select a batch…</option>
                {scope.batches.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.courses?.title ?? ""}</option>)}
              </Select>
            </Field>
            <Field label="Subject" hint="Optional">
              <Select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
                <option value="">Not subject-specific</option>
                {(subjects ?? []).filter((s) => !form.batch_id || !s.course_id || s.course_id === batchCourse.get(form.batch_id)).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Due date"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          <Field label="Instructions"><Textarea rows={4} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field>
          <Field label="External link" hint="Optional"><Input value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })} placeholder="https://…" /></Field>
          <div className="rounded-md border border-lightgray p-3">
            <p className="label">Attachment</p>
            {form.attachment_url ? (
              <p className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4 text-problue" aria-hidden />
                <span className="truncate font-mono text-xs">{form.attachment_url}</span>
                <button type="button" onClick={() => setForm({ ...form, attachment_url: "" })} className="ml-auto text-xs text-error underline">Remove</button>
              </p>
            ) : (
              <label className={`btn-outline btn-sm ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
                <Upload className="h-3.5 w-3.5" aria-hidden /> {uploading ? "Uploading…" : "Upload attachment"}
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickAttachment(f); e.target.value = ""; }} />
              </label>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.allow_submissions} onChange={(e) => setForm({ ...form, allow_submissions: e.target.checked })} />
              Allow submissions
            </label>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}>
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
          </div>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save Assignment</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title={`Submissions — ${reviewing?.title ?? ""}`} wide>
        {loadingSubs ? (
          <Spinner label="Loading submissions…" />
        ) : !submissions?.length ? (
          <EmptyState title="No submissions yet" description="Student uploads will appear here once they submit their work." />
        ) : (
          <ul className="space-y-4">
            {submissions.map((s) => (
              <li key={s.id} className="rounded-md border border-lightgray p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{s.students?.full_name ?? "Student"}</p>
                    <p className="font-mono text-xs text-muted">{s.students?.student_code ?? ""}</p>
                    <p className="mt-1 text-xs text-muted">Submitted {formatDateTime(s.submitted_at)}</p>
                  </div>
                  {s.file_url ? (
                    <Button variant="outline" size="sm" onClick={async () => {
                      try { await openPrivateFile("assignment-submissions", s.file_url); }
                      catch (e: any) { toast.error(e.message ?? "Could not open the file"); }
                    }}>Open file</Button>
                  ) : null}
                </div>
                {s.note ? <p className="mt-2 whitespace-pre-line rounded bg-offwhite p-2 text-sm">{s.note}</p> : null}
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-[12rem] flex-1">
                    <Field label="Feedback">
                      <Input value={feedback[s.id] ?? ""} onChange={(e) => setFeedback({ ...feedback, [s.id]: e.target.value })} placeholder="Well done — revise question 4" />
                    </Field>
                  </div>
                  <Button size="sm" onClick={() => saveFeedback.mutate({ id: s.id, value: feedback[s.id] ?? "" })} loading={saveFeedback.isPending}>
                    <Save className="h-3.5 w-3.5" aria-hidden /> Save
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
