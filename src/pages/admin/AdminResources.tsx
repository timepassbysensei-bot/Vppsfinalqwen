// Admin Resources: study material shared with students. Files go to the private
// "student-resources" bucket inside a course-/batch- scoped folder, and the
// storage policy lets enrolled students read only their own material.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Archive, ArchiveRestore, Upload, Download, Link2, FileText, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadPrivate, openPrivateFile } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";
import type { Resource, Course, Batch, Subject } from "@/types/database";

const TYPES = [
  { value: "study_material", label: "Study material" },
  { value: "syllabus", label: "Syllabus" },
  { value: "notes", label: "Class notes" },
  { value: "practice_paper", label: "Practice paper" },
  { value: "video", label: "Video / link" },
  { value: "other", label: "Other" },
];

interface FormState {
  title: string;
  description: string;
  course_id: string;
  batch_id: string;
  subject_id: string;
  resource_type: string;
  file_url: string;
  file_path: string;
  external_link: string;
  visibility: Resource["visibility"];
}

const EMPTY: FormState = {
  title: "", description: "", course_id: "", batch_id: "", subject_id: "",
  resource_type: "study_material", file_url: "", file_path: "", external_link: "",
  visibility: "published",
};

export default function AdminResources() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<Resource | null>(null);

  const { data: resources, isLoading } = useQuery({
    queryKey: ["admin_resources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false }).limit(400);
      if (error) throw error;
      return data as Resource[];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin_courses_light"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id,title").order("title");
      if (error) throw error;
      return data as Pick<Course, "id" | "title">[];
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["admin_batches_light"],
    queryFn: async () => {
      const { data, error } = await supabase.from("batches").select("id,name,course_id").order("name");
      if (error) throw error;
      return data as Pick<Batch, "id" | "name" | "course_id">[];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["admin_subjects_light"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id,name,course_id").is("archived_at", null).order("name");
      if (error) throw error;
      return data as Pick<Subject, "id" | "name" | "course_id">[];
    },
  });

  const labels = useMemo(() => {
    const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
    const batchMap = new Map((batches ?? []).map((b) => [b.id, b.name]));
    return {
      course: (id: string | null) => (id ? courseMap.get(id) ?? "—" : "All courses"),
      batch: (id: string | null) => (id ? batchMap.get(id) ?? "—" : "All batches"),
    };
  }, [courses, batches]);

  const filtered = useMemo(() => (resources ?? []).filter((r) => {
    if (showArchived !== !!r.archived_at) return false;
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return r.title.toLowerCase().includes(t) || (r.description ?? "").toLowerCase().includes(t);
  }), [resources, q, showArchived]);

  function openCreate() { setForm(EMPTY); setError(""); setCreating(true); }
  function openEdit(r: Resource) {
    setForm({
      title: r.title, description: r.description ?? "", course_id: r.course_id ?? "",
      batch_id: r.batch_id ?? "", subject_id: r.subject_id ?? "", resource_type: r.resource_type,
      file_url: r.file_url ?? "", file_path: r.file_url ?? "", external_link: r.external_link ?? "",
      visibility: r.visibility,
    });
    setError("");
    setEditing(r);
  }

  async function onPickFile(file: File) {
    const folder = form.batch_id ? `batch-${form.batch_id}` : form.course_id ? `course-${form.course_id}` : "public";
    if (folder === "public") {
      toast.error("Choose a course or batch first so the file is scoped correctly.");
      return;
    }
    setUploading(true);
    try {
      const { path } = await uploadPrivate("student-resources", file, folder);
      setForm((f) => ({ ...f, file_path: path, file_url: path }));
      toast.success("File uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormState; id?: string }) => {
      if (values.title.trim().length < 2) throw new Error("Give the resource a title");
      if (!values.course_id && !values.batch_id) throw new Error("Choose at least a course so students can see this resource");
      if (!values.file_path && !values.external_link.trim()) throw new Error("Upload a file or provide an external link");
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        course_id: values.course_id || null,
        batch_id: values.batch_id || null,
        subject_id: values.subject_id || null,
        resource_type: values.resource_type,
        file_url: values.file_path || null,
        external_link: values.external_link.trim() || null,
        visibility: values.visibility,
      };
      if (id) {
        const { error } = await supabase.from("resources").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("resources").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Resource updated" : "Resource shared");
      qc.invalidateQueries({ queryKey: ["admin_resources"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the resource"),
  });

  const archive = useMutation({
    mutationFn: async ({ r, restore }: { r: Resource; restore?: boolean }) => {
      const { error } = await supabase.from("resources").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.restore ? "Resource restored" : "Resource archived");
      qc.invalidateQueries({ queryKey: ["admin_resources"] });
      setConfirmArchive(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function openFile(r: Resource) {
    if (r.external_link) { window.open(r.external_link, "_blank", "noopener,noreferrer"); return; }
    if (!r.file_url) { toast.error("This resource has no file or link."); return; }
    try {
      await openPrivateFile("student-resources", r.file_url);
    } catch (e: any) {
      toast.error(e.message ?? "Could not open the file");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Resources</h1>
          <p className="mt-0.5 text-sm text-muted">Study material, syllabi and practice papers for enrolled students.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> Share Resource</Button>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources…" aria-label="Search resources" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived only
        </label>
      </Card>

      {isLoading ? (
        <Spinner label="Loading resources…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived resources" : "No resources yet"}
          description="Upload a syllabus or practice paper and choose the course or batch that should see it."
          action={!showArchived ? <Button onClick={openCreate}>Share Resource</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <Card key={r.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1.5 font-heading font-bold text-navy">
                    {r.external_link ? <Link2 className="h-4 w-4 text-problue" aria-hidden /> : <FileText className="h-4 w-4 text-problue" aria-hidden />}
                    {r.title}
                  </h2>
                  <p className="text-xs text-muted">
                    {labels.course(r.course_id)} · {labels.batch(r.batch_id)} · {formatDate(r.created_at)}
                  </p>
                </div>
                <Badge tone={r.archived_at ? "gray" : r.visibility === "published" ? "green" : "amber"}>
                  {r.archived_at ? "Archived" : r.visibility}
                </Badge>
              </div>
              {r.description ? <p className="mt-2 flex-1 text-sm text-ink/90">{r.description}</p> : <div className="flex-1" />}
              <p className="mt-2 text-xs text-muted">
                {TYPES.find((t) => t.value === r.resource_type)?.label ?? r.resource_type}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                <Button variant="outline" size="sm" onClick={() => openFile(r)}><Download className="h-3.5 w-3.5" aria-hidden /> {r.external_link ? "Open link" : "View file"}</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(r)}>
                  {r.archived_at ? <><ArchiveRestore className="h-3.5 w-3.5" aria-hidden /> Restore</> : <><Archive className="h-3.5 w-3.5" aria-hidden /> Archive</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit Resource" : "Share a Resource"} wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ values: form, id: editing?.id }); }}>
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course" required hint="Students in this course will see the resource">
              <Select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value, batch_id: "" })}>
                <option value="">Select a course…</option>
                {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </Field>
            <Field label="Batch" hint="Optional — narrow it to one batch">
              <Select value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                <option value="">All batches in the course</option>
                {(batches ?? []).filter((b) => !form.course_id || b.course_id === form.course_id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject" hint="Optional">
              <Select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
                <option value="">Not subject-specific</option>
                {(subjects ?? []).filter((s) => !form.course_id || !s.course_id || s.course_id === form.course_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
          </div>

          <div className="rounded-md border border-lightgray p-3">
            <p className="label">File</p>
            {form.file_path ? (
              <p className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-problue" aria-hidden />
                <span className="truncate font-mono text-xs">{form.file_path}</span>
                <button type="button" onClick={() => setForm({ ...form, file_path: "", file_url: "" })} className="ml-auto rounded p-1 text-error" aria-label="Remove file">
                  <X className="h-4 w-4" />
                </button>
              </p>
            ) : (
              <label className={`btn-outline btn-sm ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
                <Upload className="h-3.5 w-3.5" aria-hidden /> {uploading ? "Uploading…" : "Upload file"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.target.value = ""; }}
                />
              </label>
            )}
            <p className="mt-2 text-xs text-muted">Files are stored privately — only enrolled students can open them.</p>
          </div>

          <Field label="External link" hint="Optional — use for videos or third-party material">
            <Input value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Visibility">
            <Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as FormState["visibility"] })}>
              <option value="published">Published — students can see it</option>
              <option value="draft">Draft — hidden from students</option>
            </Select>
          </Field>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save Resource</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => confirmArchive && archive.mutate({ r: confirmArchive, restore: !!confirmArchive.archived_at })}
        title={confirmArchive?.archived_at ? "Restore resource" : "Archive resource"}
        message={confirmArchive?.archived_at
          ? `“${confirmArchive?.title}” will be visible to its students again.`
          : `“${confirmArchive?.title}” will be hidden from students. The file is kept and can be restored.`}
        confirmLabel={confirmArchive?.archived_at ? "Restore" : "Archive"}
        danger={!confirmArchive?.archived_at}
      />
    </div>
  );
}
