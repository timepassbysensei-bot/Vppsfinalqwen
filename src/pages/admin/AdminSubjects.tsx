// Admin Subjects: subject catalogue per course, with soft delete (archive) + restore.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Archive, ArchiveRestore, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, ConfirmDialog } from "@/components/ui";
import type { Subject, Course } from "@/types/database";

interface FormState { name: string; code: string; course_id: string; display_order: number; }

const EMPTY: FormState = { name: "", code: "", course_id: "", display_order: 100 };

export default function AdminSubjects() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [confirmArchive, setConfirmArchive] = useState<Subject | null>(null);

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["admin_subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("display_order");
      if (error) throw error;
      return data as Subject[];
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
    return (id: string | null) => (id ? map.get(id) ?? "—" : "All courses");
  }, [courses]);

  const filtered = useMemo(() => {
    return (subjects ?? []).filter((s) => {
      if (!showArchived && s.archived_at) return false;
      if (showArchived && !s.archived_at) return false;
      if (courseFilter && s.course_id !== courseFilter) return false;
      if (q.trim()) {
        const t = q.trim().toLowerCase();
        return s.name.toLowerCase().includes(t) || (s.code ?? "").toLowerCase().includes(t);
      }
      return true;
    });
  }, [subjects, q, courseFilter, showArchived]);

  function openCreate() { setForm(EMPTY); setError(""); setCreating(true); }
  function openEdit(s: Subject) {
    setForm({ name: s.name, code: s.code ?? "", course_id: s.course_id ?? "", display_order: s.display_order });
    setError("");
    setEditing(s);
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormState; id?: string }) => {
      if (values.name.trim().length < 2) throw new Error("Enter a subject name");
      const payload = {
        name: values.name.trim(),
        code: values.code.trim() || null,
        course_id: values.course_id || null,
        display_order: Number(values.display_order) || 100,
      };
      if (id) {
        const { error } = await supabase.from("subjects").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subjects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Subject updated" : "Subject added");
      qc.invalidateQueries({ queryKey: ["admin_subjects"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the subject"),
  });

  const archive = useMutation({
    mutationFn: async ({ s, restore }: { s: Subject; restore?: boolean }) => {
      const { error } = await supabase.from("subjects").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.restore ? "Subject restored" : "Subject archived");
      qc.invalidateQueries({ queryKey: ["admin_subjects"] });
      setConfirmArchive(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Subjects</h1>
          <p className="mt-0.5 text-sm text-muted">Subjects are used when building tests, marks sheets and assignments.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> New Subject</Button>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subjects…" className="pl-9" aria-label="Search subjects" />
        </div>
        <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} aria-label="Filter by course">
          <option value="">All courses</option>
          {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived only
        </label>
      </Card>

      {isLoading ? (
        <Spinner label="Loading subjects…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived subjects" : "No subjects found"}
          description={showArchived ? "Archived subjects appear here and can be restored." : "Add the subjects you teach so tests and marks sheets can use them."}
          action={!showArchived ? <Button onClick={openCreate}>New Subject</Button> : undefined}
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-offwhite">
                <tr>
                  <th className="table-th">Subject</th>
                  <th className="table-th">Course</th>
                  <th className="table-th">Order</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lightgray">
                {filtered.map((s) => (
                  <tr key={s.id} className={s.archived_at ? "opacity-60" : ""}>
                    <td className="table-td">
                      <p className="font-medium text-navy">{s.name}</p>
                      {s.code ? <p className="font-mono text-xs text-muted">{s.code}</p> : null}
                    </td>
                    <td className="table-td">{courseName(s.course_id)}</td>
                    <td className="table-td">{s.display_order}</td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(s)} aria-label={`${s.archived_at ? "Restore" : "Archive"} ${s.name}`}>
                          {s.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{s.name}</p>
                    <p className="text-xs text-muted">{courseName(s.course_id)}</p>
                  </div>
                  {s.archived_at ? <Badge tone="gray">Archived</Badge> : null}
                </div>
                <div className="mt-3 flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmArchive(s)}>{s.archived_at ? "Restore" : "Archive"}</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit Subject" : "New Subject"}>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate({ values: form, id: editing?.id }); }}>
          <Field label="Subject name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Short code" hint="Optional, e.g. MATH"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Display order" hint="Lower numbers appear first"><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Course">
            <Select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
              <option value="">Applies to all courses</option>
              {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save Subject</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => confirmArchive && archive.mutate({ s: confirmArchive, restore: !!confirmArchive.archived_at })}
        title={confirmArchive?.archived_at ? "Restore subject" : "Archive subject"}
        message={confirmArchive?.archived_at
          ? `“${confirmArchive?.name}” will be available again when creating tests.`
          : `“${confirmArchive?.name}” will be hidden from new tests and assignments. Existing marks keep the subject name, so past results are unaffected.`}
        confirmLabel={confirmArchive?.archived_at ? "Restore" : "Archive"}
        danger={!confirmArchive?.archived_at}
      />
    </div>
  );
}
