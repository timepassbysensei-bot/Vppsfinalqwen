// Teacher Resources: share study material with the teacher's own batches.
// Files go to the private "student-resources" bucket inside the batch folder,
// which the storage policy limits to enrolled students and staff.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Archive, ArchiveRestore, Upload, FileText, Link2, Download, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { uploadPrivate, openPrivateFile } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";

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
  batch_id: string;
  subject_id: string;
  resource_type: string;
  file_path: string;
  external_link: string;
  visibility: "draft" | "published" | "archived";
}

const EMPTY: FormState = {
  title: "", description: "", batch_id: "", subject_id: "", resource_type: "study_material",
  file_path: "", external_link: "", visibility: "published",
};

export default function TeacherResources() {
  const qc = useQueryClient();
  const { data: scope, isLoading: loadingScope } = useTeacherScope();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<any | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const allowedBatchIds = scope?.allowedBatchIds ?? [];

  const { data: subjects } = useQuery({
    queryKey: ["teacher_subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id,name,course_id").is("archived_at", null).order("name");
      if (error) throw error;
      return data as { id: string; name: string; course_id: string | null }[];
    },
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ["teacher_resources", allowedBatchIds.join(",")],
    enabled: !!scope,
    queryFn: async () => {
      if (!allowedBatchIds.length) return [];
      const { data, error } = await supabase
        .from("resources")
        .select("*,batches(name),subjects(name)")
        .in("batch_id", allowedBatchIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const batchCourse = useMemo(() => new Map((scope?.batches ?? []).map((b) => [b.id, b.course_id])), [scope?.batches]);

  const list = (resources ?? []).filter((r) => (showArchived ? !!r.archived_at : !r.archived_at));

  function openCreate() {
    setForm({ ...EMPTY, batch_id: scope?.batches[0]?.id ?? "" });
    setError("");
    setCreating(true);
  }

  function openEdit(r: any) {
    setForm({
      title: r.title, description: r.description ?? "", batch_id: r.batch_id ?? "",
      subject_id: r.subject_id ?? "", resource_type: r.resource_type,
      file_path: r.file_url ?? "", external_link: r.external_link ?? "", visibility: r.visibility,
    });
    setError("");
    setEditing(r);
  }

  async function onPickFile(file: File) {
    if (!form.batch_id) { toast.error("Choose a batch first so the file is stored in the right folder."); return; }
    setUploading(true);
    try {
      const { path } = await uploadPrivate("student-resources", file, `batch-${form.batch_id}`);
      setForm((f) => ({ ...f, file_path: path }));
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
      if (!values.batch_id) throw new Error("Select one of your batches");
      if (!values.file_path && !values.external_link.trim()) throw new Error("Upload a file or add an external link");
      const course_id = batchCourse.get(values.batch_id) ?? null;
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        course_id,
        batch_id: values.batch_id,
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
      toast.success(vars.id ? "Resource updated" : "Resource shared with your batch");
      qc.invalidateQueries({ queryKey: ["teacher_resources"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the resource"),
  });

  const archive = useMutation({
    mutationFn: async ({ r, restore }: { r: any; restore?: boolean }) => {
      const { error } = await supabase.from("resources").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.restore ? "Resource restored" : "Resource archived");
      qc.invalidateQueries({ queryKey: ["teacher_resources"] });
      setConfirmArchive(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function openFile(r: any) {
    if (r.external_link) { window.open(r.external_link, "_blank", "noopener,noreferrer"); return; }
    try { await openPrivateFile("student-resources", r.file_url); }
    catch (e: any) { toast.error(e.message ?? "Could not open the file"); }
  }

  if (loadingScope) return <Spinner label="Loading your batches…" />;

  if (!scope?.teacher || !scope.batches.length) {
    return <EmptyState title="No batches assigned" description="You need an assigned batch before you can share resources." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Resources</h1>
          <p className="mt-0.5 text-sm text-muted">Share notes, syllabi and practice papers with your batches.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> Share Resource</Button>
      </div>

      <Card className="p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived resources
        </label>
      </Card>

      {isLoading ? (
        <Spinner label="Loading resources…" />
      ) : !list.length ? (
        <EmptyState
          title={showArchived ? "No archived resources" : "No resources yet"}
          description="Upload a file or share a link for one of your batches."
          action={!showArchived ? <Button onClick={openCreate}>Share Resource</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <Card key={r.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="flex items-center gap-1.5 font-heading font-bold text-navy">
                  {r.external_link ? <Link2 className="h-4 w-4 text-problue" aria-hidden /> : <FileText className="h-4 w-4 text-problue" aria-hidden />}
                  {r.title}
                </h2>
                <Badge tone={r.archived_at ? "gray" : r.visibility === "published" ? "green" : "amber"}>
                  {r.archived_at ? "Archived" : r.visibility}
                </Badge>
              </div>
              {r.description ? <p className="mt-2 flex-1 text-sm text-ink/90">{r.description}</p> : <div className="flex-1" />}
              <p className="mt-2 text-xs text-muted">
                {r.batches?.name}{r.subjects?.name ? ` · ${r.subjects.name}` : ""} · {formatDate(r.created_at)}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                <Button variant="outline" size="sm" onClick={() => openFile(r)}><Download className="h-3.5 w-3.5" aria-hidden /> Open</Button>
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
            <Field label="Batch" required>
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
          <Field label="Type">
            <Select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <div className="rounded-md border border-lightgray p-3">
            <p className="label">File</p>
            {form.file_path ? (
              <p className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-problue" aria-hidden />
                <span className="truncate font-mono text-xs">{form.file_path}</span>
                <button type="button" onClick={() => setForm({ ...form, file_path: "" })} className="ml-auto rounded p-1 text-error" aria-label="Remove file"><X className="h-4 w-4" /></button>
              </p>
            ) : (
              <label className={`btn-outline btn-sm ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
                <Upload className="h-3.5 w-3.5" aria-hidden /> {uploading ? "Uploading…" : "Upload file"}
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.target.value = ""; }} />
              </label>
            )}
            <p className="mt-2 text-xs text-muted">Stored privately — only staff and students of this batch can open it.</p>
          </div>
          <Field label="External link" hint="Optional"><Input value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Visibility">
            <Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as FormState["visibility"] })}>
              <option value="published">Published — students can see it</option>
              <option value="draft">Draft — hidden</option>
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
          ? "Students will see this resource again."
          : "Students will no longer see this resource. The file is kept and you can restore it later."}
        confirmLabel={confirmArchive?.archived_at ? "Restore" : "Archive"}
        danger={!confirmArchive?.archived_at}
      />
    </div>
  );
}
