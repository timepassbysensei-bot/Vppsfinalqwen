// Admin Courses: full CRUD with draft/publish/archive workflow and duplicate action.
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Copy, Eye, EyeOff, Archive, ArchiveRestore, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { courseFormSchema } from "@/lib/validation";
import { slugify } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Pagination, Select, Spinner, StatusBadge, Textarea, ConfirmDialog } from "@/components/ui";
import type { Course } from "@/types/database";
import z from "zod";

type FormVals = z.infer<typeof courseFormSchema>;
const PAGE_SIZE = 10;

export default function AdminCourses() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<Course | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<Course | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin_courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("display_order");
      if (error) throw error;
      return data as Course[];
    },
  });

  const filtered = useMemo(() => {
    let list = courses ?? [];
    if (q.trim()) list = list.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.slug.includes(q.toLowerCase()));
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    return list;
  }, [courses, q, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormVals; id?: string }) => {
      const payload = {
        title: values.title,
        slug: values.slug,
        short_description: values.short_description || null,
        full_description: values.full_description || null,
        eligibility: values.eligibility || null,
        age_criteria: values.age_criteria || null,
        duration: values.duration || null,
        subjects: (values.subjects_text ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        batch_timings: values.batch_timings || null,
        fee_display: values.fee_display || null,
        mode: values.mode,
        seats_total: values.seats_total ?? null,
        seats_available: values.seats_available ?? null,
        admission_status: values.admission_status,
        is_featured: values.is_featured,
        status: values.status,
      };
      if (id) {
        const { error } = await supabase.from("courses").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_v, vars) => {
      toast.success(vars.id ? "Course updated" : "Course created");
      qc.invalidateQueries({ queryKey: ["admin_courses"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const duplicate = useMutation({
    mutationFn: async (c: Course) => {
      const { id, created_at, updated_at, ...rest } = c;
      const { error } = await supabase.from("courses").insert({
        ...rest,
        title: `${c.title} (Copy)`,
        slug: `${c.slug}-copy-${Date.now().toString(36).slice(-4)}`,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Course duplicated as draft"); qc.invalidateQueries({ queryKey: ["admin_courses"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async (c: Course) => {
      const next = c.status === "published" ? "draft" : "published";
      const { error } = await supabase.from("courses").update({ status: next }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin_courses"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: async ({ c, restore }: { c: Course; restore?: boolean }) => {
      const { error } = await supabase.from("courses").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: (_v, vars) => { toast.success(vars.restore ? "Course restored" : "Course archived"); qc.invalidateQueries({ queryKey: ["admin_courses"] }); setConfirmArchive(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Courses</h1>
          <p className="mt-0.5 text-sm text-muted">Create, publish and archive course offerings.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden /> New Course</Button>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search courses…" className="pl-9" aria-label="Search courses" />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="sm:w-44" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </Card>

      {isLoading ? <Spinner /> : pageItems.length === 0 ? (
        <EmptyState title="No courses found" description="Create your first course to publish it on the website." action={<Button onClick={() => setCreating(true)}>New Course</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-offwhite">
                <tr>
                  <th className="table-th">Course</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Admission</th>
                  <th className="table-th">Fee</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lightgray">
                {pageItems.map((c) => (
                  <tr key={c.id} className={c.archived_at ? "opacity-60" : ""}>
                    <td className="table-td">
                      <p className="font-medium text-navy">{c.title}</p>
                      <p className="text-xs text-muted">/{c.slug} · {c.mode}</p>
                    </td>
                    <td className="table-td"><StatusBadge status={c.archived_at ? "archived" : c.status} /></td>
                    <td className="table-td">
                      <StatusBadge status={c.admission_status === "open" ? "published" : c.admission_status === "filling_fast" ? "draft" : "archived"} />
                    </td>
                    <td className="table-td">{c.fee_display ?? "—"}</td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.title}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicate.mutate(c)} aria-label={`Duplicate ${c.title}`}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => togglePublish.mutate(c)} aria-label={c.status === "published" ? `Unpublish ${c.title}` : `Publish ${c.title}`}>
                          {c.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(c)} aria-label={`Archive ${c.title}`}>
                          {c.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4"><Pagination page={page} pageCount={pageCount} onChange={setPage} /></div>
        </Card>
      )}

      <CourseFormModal
        open={creating || !!editing}
        course={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={(values) => save.mutate({ values, id: editing?.id })}
        saving={save.isPending}
      />

      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => confirmArchive && archive.mutate({ c: confirmArchive, restore: !!confirmArchive.archived_at })}
        title={confirmArchive?.archived_at ? "Restore course" : "Archive course"}
        message={confirmArchive?.archived_at
          ? "The course will become visible again in the admin list (with its previous publish status)."
          : `"${confirmArchive?.title}" will be hidden from the public site. Enrolled students and batches are kept. You can restore it later.`}
        confirmLabel={confirmArchive?.archived_at ? "Restore" : "Archive"}
        danger={!confirmArchive?.archived_at}
      />
    </div>
  );
}

function CourseFormModal({ open, course, onClose, onSave, saving }: {
  open: boolean; course: Course | null; onClose: () => void; onSave: (v: FormVals) => void; saving: boolean;
}) {
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormVals>({
    resolver: zodResolver(courseFormSchema),
  });

  // Reset form when opening for a different course
  const key = course?.id ?? "new";
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && key !== lastKey) {
    setLastKey(key);
    reset(course ? {
      title: course.title,
      slug: course.slug,
      short_description: course.short_description ?? "",
      full_description: course.full_description ?? "",
      eligibility: course.eligibility ?? "",
      age_criteria: course.age_criteria ?? "",
      duration: course.duration ?? "",
      subjects_text: (course.subjects ?? []).join(", "),
      batch_timings: course.batch_timings ?? "",
      fee_display: course.fee_display ?? "",
      mode: course.mode,
      seats_total: course.seats_total ?? undefined,
      seats_available: course.seats_available ?? undefined,
      admission_status: course.admission_status,
      is_featured: course.is_featured,
      status: course.status,
    } : {
      title: "", slug: "", short_description: "", full_description: "", eligibility: "",
      age_criteria: "", duration: "", subjects_text: "", batch_timings: "", fee_display: "",
      mode: "offline", admission_status: "open", is_featured: false, status: "draft",
    } as any);
  }

  return (
    <Modal open={open} onClose={onClose} title={course ? "Edit Course" : "New Course"} wide>
      <form onSubmit={handleSubmit((v) => onSave(v))} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required error={errors.title?.message}>
            <Input {...register("title")} onBlur={(e) => {
              const slugField = document.getElementsByName("slug")[0] as HTMLInputElement | undefined;
              if (slugField && !course && !slugField.value) {
                setValue("slug", slugify(e.target.value));
              }
            }} />
          </Field>
          <Field label="Slug (URL)" required error={errors.slug?.message} hint="lowercase-with-hyphens">
            <Input {...register("slug")} />
          </Field>
        </div>
        <Field label="Short Description" error={errors.short_description?.message}>
          <Textarea {...register("short_description")} rows={2} />
        </Field>
        <Field label="Full Description" error={errors.full_description?.message}>
          <Textarea {...register("full_description")} rows={5} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Eligibility" error={errors.eligibility?.message}><Input {...register("eligibility")} /></Field>
          <Field label="Age Criteria" error={errors.age_criteria?.message}><Input {...register("age_criteria")} /></Field>
          <Field label="Duration" error={errors.duration?.message}><Input {...register("duration")} /></Field>
        </div>
        <Field label="Subjects (comma-separated)" error={errors.subjects_text?.message}>
          <Input {...register("subjects_text")} placeholder="Mathematics, English, General Knowledge" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Batch Timings" error={errors.batch_timings?.message}><Input {...register("batch_timings")} /></Field>
          <Field label="Fee Display" error={errors.fee_display?.message} hint='e.g. "₹—/month" or "Contact for fee"'>
            <Input {...register("fee_display")} />
          </Field>
          <Field label="Mode" error={errors.mode?.message}>
            <Select {...register("mode")}><option value="offline">Offline</option><option value="online">Online</option><option value="hybrid">Hybrid</option></Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Seats Total" error={errors.seats_total?.message}><Input {...register("seats_total", { setValueAs: (v) => v === "" ? undefined : Number(v) })} type="number" min={0} /></Field>
          <Field label="Seats Available" error={errors.seats_available?.message}><Input {...register("seats_available", { setValueAs: (v) => v === "" ? undefined : Number(v) })} type="number" min={0} /></Field>
          <Field label="Admission Status" error={errors.admission_status?.message}>
            <Select {...register("admission_status")}><option value="open">Open</option><option value="filling_fast">Filling Fast</option><option value="closed">Closed</option></Select>
          </Field>
          <Field label="Publish Status" error={errors.status?.message}>
            <Select {...register("status")}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy focus:ring-problue" {...register("is_featured")} />
          Show as featured course
        </label>
        <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save Course</Button>
        </div>
      </form>
    </Modal>
  );
}
