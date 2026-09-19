// Admin Notices: publish announcements to the public site or targeted audiences
// (all students, a course, a batch, teachers, admins) with optional expiry.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Pin, PinOff, Eye, EyeOff, Trash2, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";
import type { Notice, Course, Batch } from "@/types/database";

interface FormState {
  title: string;
  description: string;
  publish_date: string;
  expiry_date: string;
  audience: Notice["audience"];
  course_id: string;
  batch_id: string;
  attachment_url: string;
  is_pinned: boolean;
  status: "draft" | "published" | "archived";
}

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: FormState = {
  title: "", description: "", publish_date: today(), expiry_date: "",
  audience: "public", course_id: "", batch_id: "", attachment_url: "",
  is_pinned: false, status: "draft",
};

const AUDIENCE_LABEL: Record<string, string> = {
  public: "Public website", all_students: "All students", course: "Specific course",
  batch: "Specific batch", teachers: "Teachers", admins: "Admins",
};

export default function AdminNotices() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Notice | null>(null);

  const { data: notices, isLoading } = useQuery({
    queryKey: ["admin_notices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notices").select("*").order("publish_date", { ascending: false });
      if (error) throw error;
      return data as Notice[];
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

  const filtered = useMemo(() => {
    const list = notices ?? [];
    return statusFilter ? list.filter((n) => n.status === statusFilter) : list;
  }, [notices, statusFilter]);

  function openCreate() { setForm({ ...EMPTY, publish_date: today() }); setError(""); setCreating(true); }
  function openEdit(n: Notice) {
    setForm({
      title: n.title, description: n.description ?? "", publish_date: n.publish_date,
      expiry_date: n.expiry_date ?? "", audience: n.audience, course_id: n.course_id ?? "",
      batch_id: n.batch_id ?? "", attachment_url: n.attachment_url ?? "",
      is_pinned: n.is_pinned, status: n.status,
    });
    setError("");
    setEditing(n);
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormState; id?: string }) => {
      if (values.title.trim().length < 3) throw new Error("Give the notice a clear title");
      if (values.audience === "course" && !values.course_id) throw new Error("Select the course this notice targets");
      if (values.audience === "batch" && !values.batch_id) throw new Error("Select the batch this notice targets");
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        publish_date: values.publish_date || today(),
        expiry_date: values.expiry_date || null,
        audience: values.audience,
        course_id: values.audience === "course" ? values.course_id || null : null,
        batch_id: values.audience === "batch" ? values.batch_id || null : null,
        attachment_url: values.attachment_url.trim() || null,
        is_pinned: values.is_pinned,
        status: values.status,
      };
      if (id) {
        const { error } = await supabase.from("notices").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notices").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Notice updated" : "Notice created");
      qc.invalidateQueries({ queryKey: ["admin_notices"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the notice"),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from("notices").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Notice updated"); qc.invalidateQueries({ queryKey: ["admin_notices"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (n: Notice) => {
      const { error } = await supabase.from("notices").delete().eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Notice deleted"); qc.invalidateQueries({ queryKey: ["admin_notices"] }); setConfirmDelete(null); },
    onError: (e: any) => { toast.error(e.message); setConfirmDelete(null); },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Notices</h1>
          <p className="mt-0.5 text-sm text-muted">Announcements for the website, students, batches or staff.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> New Notice</Button>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-56" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
        <p className="text-xs text-muted">{filtered.length} notice(s)</p>
      </Card>

      {isLoading ? (
        <Spinner label="Loading notices…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No notices yet"
          description="Publish a notice to show it in the website notices feed or a student's dashboard."
          action={<Button onClick={openCreate}>New Notice</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const expired = n.expiry_date ? n.expiry_date < today() : false;
            return (
              <Card key={n.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 font-heading font-bold text-navy">
                      {n.is_pinned ? <Pin className="h-4 w-4 text-saffron" aria-hidden /> : null}
                      {n.title}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {AUDIENCE_LABEL[n.audience] ?? n.audience} · published {formatDate(n.publish_date)}
                      {n.expiry_date ? ` · expires ${formatDate(n.expiry_date)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={n.status === "published" ? "green" : n.status === "draft" ? "amber" : "gray"}>{n.status}</Badge>
                    {expired ? <Badge tone="red">Expired</Badge> : null}
                  </div>
                </div>
                {n.description ? <p className="mt-3 whitespace-pre-line text-sm text-ink/90">{n.description}</p> : null}
                {n.attachment_url ? (
                  <a href={n.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-problue underline">
                    Attachment (opens in new tab)
                  </a>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                  <Button variant="outline" size="sm" onClick={() => openEdit(n)}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => patch.mutate({ id: n.id, values: { is_pinned: !n.is_pinned } })}>
                    {n.is_pinned ? <><PinOff className="h-3.5 w-3.5" aria-hidden /> Unpin</> : <><Pin className="h-3.5 w-3.5" aria-hidden /> Pin</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => patch.mutate({ id: n.id, values: { status: n.status === "published" ? "draft" : "published" } })}>
                    {n.status === "published" ? <><EyeOff className="h-3.5 w-3.5" aria-hidden /> Unpublish</> : <><Eye className="h-3.5 w-3.5" aria-hidden /> Publish</>}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(n)}><Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit Notice" : "New Notice"} wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ values: form, id: editing?.id }); }}>
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Publish date" required><Input type="date" value={form.publish_date} onChange={(e) => setForm({ ...form, publish_date: e.target.value })} /></Field>
            <Field label="Expiry date" hint="Optional — notices hide themselves after this date">
              <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Audience">
              <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as FormState["audience"], course_id: "", batch_id: "" })}>
                {Object.entries(AUDIENCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}>
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
          </div>
          {form.audience === "course" ? (
            <Field label="Course" required>
              <Select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                <option value="">Select a course…</option>
                {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </Field>
          ) : null}
          {form.audience === "batch" ? (
            <Field label="Batch" required>
              <Select value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                <option value="">Select a batch…</option>
                {(batches ?? []).filter((b) => !form.course_id || b.course_id === form.course_id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Attachment URL" hint="Optional link to a PDF or notice file"><Input value={form.attachment_url} onChange={(e) => setForm({ ...form, attachment_url: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
            Pin to the top
          </label>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}><Megaphone className="h-4 w-4" aria-hidden /> Save Notice</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
        title="Delete notice"
        message={`Delete “${confirmDelete?.title}”? This cannot be undone. To hide it temporarily, unpublish instead.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
