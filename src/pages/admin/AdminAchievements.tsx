// Admin Achievements: student results/selection highlights for the public site.
// Privacy rule enforced in the UI: an achievement can only be published once
// written consent is recorded. Names are shortened publicly when consent is missing.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Eye, EyeOff, Trash2, Trophy, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";
import type { Achievement, Course } from "@/types/database";

interface FormState {
  student_name: string;
  examination: string;
  rank_display: string;
  year: number;
  course_id: string;
  description: string;
  photo_url: string;
  is_featured: boolean;
  consent_recorded: boolean;
  status: Achievement["status"];
}

const EMPTY: FormState = {
  student_name: "", examination: "", rank_display: "", year: new Date().getFullYear(),
  course_id: "", description: "", photo_url: "", is_featured: false,
  consent_recorded: false, status: "draft",
};

export default function AdminAchievements() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Achievement | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin_achievements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("achievements").select("*").order("year", { ascending: false });
      if (error) throw error;
      return data as Achievement[];
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

  const courseName = useMemo(() => {
    const map = new Map((courses ?? []).map((c) => [c.id, c.title]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [courses]);

  function openCreate() { setForm(EMPTY); setError(""); setCreating(true); }
  function openEdit(a: Achievement) {
    setForm({
      student_name: a.student_name, examination: a.examination, rank_display: a.rank_display,
      year: a.year, course_id: a.course_id ?? "", description: a.description ?? "",
      photo_url: a.photo_url ?? "", is_featured: a.is_featured,
      consent_recorded: a.consent_recorded, status: a.status,
    });
    setError("");
    setEditing(a);
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormState; id?: string }) => {
      if (values.student_name.trim().length < 2) throw new Error("Enter the student's name");
      if (values.examination.trim().length < 2) throw new Error("Enter the examination or selection");
      if (values.rank_display.trim().length < 1) throw new Error("Enter the rank or result text as it should appear");
      if (values.status === "published" && !values.consent_recorded) {
        throw new Error("Record the student's written consent before publishing this achievement.");
      }
      const payload = {
        student_name: values.student_name.trim(),
        examination: values.examination.trim(),
        rank_display: values.rank_display.trim(),
        year: Number(values.year) || new Date().getFullYear(),
        course_id: values.course_id || null,
        description: values.description.trim() || null,
        photo_url: values.consent_recorded ? values.photo_url.trim() || null : null,
        is_featured: values.is_featured,
        consent_recorded: values.consent_recorded,
        status: values.status,
      };
      if (id) {
        const { error } = await supabase.from("achievements").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("achievements").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Achievement updated" : "Achievement added");
      qc.invalidateQueries({ queryKey: ["admin_achievements"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the achievement"),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from("achievements").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Achievement updated"); qc.invalidateQueries({ queryKey: ["admin_achievements"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (a: Achievement) => {
      const { error } = await supabase.from("achievements").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Achievement deleted"); qc.invalidateQueries({ queryKey: ["admin_achievements"] }); setConfirmDelete(null); },
    onError: (e: any) => { toast.error(e.message); setConfirmDelete(null); },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Achievements</h1>
          <p className="mt-0.5 text-sm text-muted">Publish verified selections and results — only with the student's consent.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> New Achievement</Button>
      </div>

      <Card className="border-saffron-200 bg-saffron-50 p-4">
        <p className="flex items-start gap-2 text-sm text-navy">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-saffron-600" aria-hidden />
          <span>
            Every achievement needs <strong>verified details</strong> and the student's <strong>written consent</strong> before it can be
            published. Without recorded consent, photographs are not shown and names are shortened to “First name L.” on the website.
          </span>
        </p>
      </Card>

      {isLoading ? (
        <Spinner label="Loading achievements…" />
      ) : !items?.length ? (
        <EmptyState
          title="No achievements recorded"
          description="Add a selection or result once it has been verified with the student and consent has been recorded."
          action={<Button onClick={openCreate}>New Achievement</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1.5 font-heading font-bold text-navy">
                    <Trophy className="h-4 w-4 text-saffron" aria-hidden />
                    {a.consent_recorded ? a.student_name : `${a.student_name.split(" ")[0]} ${a.student_name.split(" ").slice(-1)[0]?.[0] ?? ""}.`}
                  </h2>
                  <p className="text-xs text-muted">{a.examination} · {a.year}</p>
                </div>
                <Badge tone={a.status === "published" ? "green" : a.status === "draft" ? "amber" : "gray"}>{a.status}</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-navy">{a.rank_display}</p>
              <p className="mt-1 text-xs text-muted">{courseName(a.course_id)}</p>
              {a.description ? <p className="mt-2 flex-1 text-sm text-ink/90">{a.description}</p> : <div className="flex-1" />}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.consent_recorded ? <Badge tone="green">Consent recorded</Badge> : <Badge tone="red">No consent</Badge>}
                {a.is_featured ? <Badge tone="navy">Featured</Badge> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!a.consent_recorded && a.status !== "published"}
                  title={!a.consent_recorded && a.status !== "published" ? "Record consent first" : undefined}
                  onClick={() => patch.mutate({ id: a.id, values: { status: a.status === "published" ? "draft" : "published" } })}
                >
                  {a.status === "published" ? <><EyeOff className="h-3.5 w-3.5" aria-hidden /> Unpublish</> : <><Eye className="h-3.5 w-3.5" aria-hidden /> Publish</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(a)}><Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit Achievement" : "New Achievement"} wide>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ values: form, id: editing?.id }); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Student name" required><Input value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} /></Field>
            <Field label="Examination / selection" required hint="e.g. NDA 2025, CDS (IMA)"><Input value={form.examination} onChange={(e) => setForm({ ...form, examination: e.target.value })} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Result / rank text" required hint="Exactly how it should appear"><Input value={form.rank_display} onChange={(e) => setForm({ ...form, rank_display: e.target.value })} /></Field>
            <Field label="Year" required><Input type="number" min={2000} max={2100} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></Field>
            <Field label="Course">
              <Select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                <option value="">Not linked</option>
                {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description" hint="Optional short note about the achievement"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Photo URL" hint={form.consent_recorded ? "Shown on the website" : "Only stored once consent is recorded"}>
            <Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} disabled={!form.consent_recorded} />
          </Field>
          <div className="space-y-2 rounded-md border border-lightgray p-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-lightgray text-navy" checked={form.consent_recorded} onChange={(e) => setForm({ ...form, consent_recorded: e.target.checked, status: e.target.checked ? form.status : "draft", photo_url: e.target.checked ? form.photo_url : "" })} />
              <span>I have the student's (or guardian's) written consent to publish their name, result and photograph.</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
              Feature this achievement on the home page
            </label>
          </div>
          <Field label="Publish status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}>
              <option value="draft">Draft (never shown publicly)</option>
              <option value="published" disabled={!form.consent_recorded}>Published (requires consent)</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save Achievement</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
        title="Delete achievement"
        message={`Delete the achievement for ${confirmDelete?.student_name}? This removes it permanently from the website.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
