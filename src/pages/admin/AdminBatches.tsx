// Admin Batches: create batches under courses, assign faculty, manage status.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Users, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, StatusBadge, ConfirmDialog } from "@/components/ui";
import type { Batch, Course, Teacher } from "@/types/database";

export default function AdminBatches() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Batch | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Batch | null>(null);
  const [viewStudents, setViewStudents] = useState<Batch | null>(null);

  const { data: courses } = useQuery({
    queryKey: ["admin_courses_light"],
    queryFn: async () => (await supabase.from("courses").select("id,title").order("title")).data as Pick<Course, "id" | "title">[],
  });
  const { data: teachers } = useQuery({
    queryKey: ["admin_teachers_light"],
    queryFn: async () => (await supabase.from("teachers").select("id,full_name").eq("is_active", true).order("full_name")).data as Pick<Teacher, "id" | "full_name">[],
  });
  const { data: batches, isLoading } = useQuery({
    queryKey: ["admin_batches"],
    queryFn: async () => (await supabase.from("batches").select("*").order("course_id")).data as Batch[],
  });

  const byCourse = useMemo(() => {
    const map = new Map<string, Batch[]>();
    for (const b of batches ?? []) {
      const list = map.get(b.course_id) ?? [];
      list.push(b);
      map.set(b.course_id, list);
    }
    return map;
  }, [batches]);

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: any; id?: string }) => {
      const payload = {
        course_id: values.course_id,
        name: values.name,
        timing: values.timing || null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        capacity: values.capacity ? Number(values.capacity) : null,
        teacher_id: values.teacher_id || null,
        admission_status: values.admission_status,
      };
      const { error } = id
        ? await supabase.from("batches").update(payload).eq("id", id)
        : await supabase.from("batches").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_v, vars) => {
      toast.success(vars.id ? "Batch updated" : "Batch created");
      qc.invalidateQueries({ queryKey: ["admin_batches"] });
      setCreating(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (b: Batch) => {
      const { error } = await supabase.from("batches").update({ archived_at: new Date().toISOString() }).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Batch archived"); qc.invalidateQueries({ queryKey: ["admin_batches"] }); setConfirmDelete(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Batches</h1>
          <p className="mt-0.5 text-sm text-muted">Batches belong to courses and carry timings, faculty and capacity.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden /> New Batch</Button>
      </div>

      {isLoading ? <Spinner /> : !batches?.length ? (
        <EmptyState title="No batches yet" description="Create a batch under a course so students can be enrolled and tests can be conducted." action={<Button onClick={() => setCreating(true)}>New Batch</Button>} />
      ) : (
        <div className="space-y-6">
          {courses?.map((c) => {
            const list = byCourse.get(c.id) ?? [];
            if (!list.length) return null;
            return (
              <div key={c.id}>
                <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-muted">{c.title}</h2>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-offwhite">
                        <tr><th className="table-th">Batch</th><th className="table-th">Timing</th><th className="table-th">Starts</th><th className="table-th">Faculty</th><th className="table-th">Status</th><th className="table-th text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-lightgray">
                        {list.map((b) => (
                          <tr key={b.id} className={b.archived_at ? "opacity-60" : ""}>
                            <td className="table-td font-medium">{b.name}</td>
                            <td className="table-td">{b.timing ?? "—"}</td>
                            <td className="table-td">{formatDate(b.start_date)}</td>
                            <td className="table-td">{teachers?.find((t) => t.id === b.teacher_id)?.full_name ?? "—"}</td>
                            <td className="table-td">{b.archived_at ? <StatusBadge status="archived" /> : <StatusBadge status={b.admission_status === "open" ? "published" : "draft"} />}</td>
                            <td className="table-td">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setViewStudents(b)} aria-label={`View students in ${b.name}`}><Users className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditing(b)} aria-label={`Edit ${b.name}`}><Pencil className="h-4 w-4" /></Button>
                                {!b.archived_at ? (
                                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(b)} aria-label={`Archive ${b.name}`}><Trash2 className="h-4 w-4" /></Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <BatchModal
        open={creating || !!editing}
        batch={editing}
        courses={courses ?? []}
        teachers={teachers ?? []}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={(values: any) => save.mutate({ values, id: editing?.id })}
        saving={save.isPending}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
        title="Archive batch"
        message={`"${confirmDelete?.name}" will be archived. Enrollments are preserved; you can restore via support if needed.`}
        confirmLabel="Archive"
        danger
      />

      <BatchStudentsModal batch={viewStudents} onClose={() => setViewStudents(null)} />
    </div>
  );
}

function BatchModal({ open, batch, courses, teachers, onClose, onSave, saving }: any) {
  const [form, setForm] = useState<any>(null);
  const key = batch?.id ?? "new";
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && key !== lastKey) {
    setLastKey(key);
    setForm(batch ? {
      course_id: batch.course_id, name: batch.name, timing: batch.timing ?? "",
      start_date: batch.start_date ?? "", end_date: batch.end_date ?? "",
      capacity: batch.capacity ?? "", teacher_id: batch.teacher_id ?? "",
      admission_status: batch.admission_status,
    } : { course_id: courses[0]?.id ?? "", name: "", timing: "", start_date: "", end_date: "", capacity: "", teacher_id: "", admission_status: "open" });
  }
  if (!open || !form) return null;

  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title={batch ? "Edit Batch" : "New Batch"}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(form); }} noValidate>
        <Field label="Course" required>
          <Select value={form.course_id} onChange={set("course_id")} disabled={!!batch}>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
        </Field>
        <Field label="Batch Name" required>
          <Input value={form.name} onChange={set("name")} placeholder="e.g. Morning A" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Timing"><Input value={form.timing} onChange={set("timing")} placeholder="6:00–8:00 AM" /></Field>
          <Field label="Faculty"><Select value={form.teacher_id} onChange={set("teacher_id")}>
            <option value="">Unassigned</option>
            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </Select></Field>
          <Field label="Start Date"><Input type="date" value={form.start_date} onChange={set("start_date")} /></Field>
          <Field label="End Date"><Input type="date" value={form.end_date} onChange={set("end_date")} /></Field>
          <Field label="Capacity"><Input type="number" min={0} value={form.capacity} onChange={set("capacity")} /></Field>
          <Field label="Admission Status"><Select value={form.admission_status} onChange={set("admission_status")}>
            <option value="open">Open</option><option value="filling_fast">Filling Fast</option><option value="closed">Closed</option>
          </Select></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save Batch</Button>
        </div>
      </form>
    </Modal>
  );
}

function BatchStudentsModal({ batch, onClose }: { batch: Batch | null; onClose: () => void }) {
  const { data: students, isLoading } = useQuery({
    queryKey: ["batch_students", batch?.id],
    enabled: !!batch,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id,student_id,left_on,students(id,full_name,student_code,is_active)")
        .eq("batch_id", batch!.id);
      if (error) throw error;
      return data;
    },
  });

  if (!batch) return null;
  return (
    <Modal open onClose={onClose} title={`Students — ${batch.name}`} wide>
      {isLoading ? <Spinner /> : !students?.length ? (
        <EmptyState title="No students enrolled" description="Enroll students from the Students page." />
      ) : (
        <ul className="divide-y divide-lightgray">
          {students.map((e: any) => (
            <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-medium text-navy">{e.students.full_name}</span>
              <span className="text-xs text-muted">{e.students.student_code}{e.left_on ? " · left" : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
