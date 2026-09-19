// Admin Teachers: profiles, invitations, course/batch/subject assignments,
// result-publishing permission, activate/deactivate.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ShieldCheck, LinkIcon, Trash2, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Badge, Textarea, ConfirmDialog } from "@/components/ui";
import type { Teacher, Course, Batch, Subject } from "@/types/database";

export default function AdminTeachers() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<Teacher | null>(null);
  const [inviting, setInviting] = useState<Teacher | null>(null);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["admin_teachers"],
    queryFn: async () => (await supabase.from("teachers").select("*").order("full_name")).data as Teacher[],
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
    queryKey: ["admin_batches_light2"],
    queryFn: async () => {
      const { data, error } = await supabase.from("batches").select("id,name").order("name");
      if (error) throw error;
      return data as Pick<Batch, "id" | "name">[];
    },
  });
  const { data: subjects } = useQuery({
    queryKey: ["admin_subjects_light"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id,name").order("name");
      if (error) throw error;
      return data as Pick<Subject, "id" | "name">[];
    },
  });
  const { data: assignments } = useQuery({
    queryKey: ["admin_teacher_assignments"],
    queryFn: async () => (await supabase.from("teacher_assignments").select("*,teachers(full_name),courses(title),batches(name),subjects(name)")).data as any[],
  });

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: any; id?: string }) => {
      if (id) {
        const { error } = await supabase.from("teachers").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teachers").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: (_v, vars) => {
      toast.success(vars.id ? "Teacher updated" : "Teacher added");
      qc.invalidateQueries({ queryKey: ["admin_teachers"] });
      setCreating(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setPublish = useMutation({
    mutationFn: async ({ t, allowed }: { t: Teacher; allowed: boolean }) => {
      const { error } = await supabase.rpc("admin_set_publish_permission", { p_teacher_id: t.id, p_allowed: allowed });
      if (error) throw error;
    },
    onSuccess: (_v, vars) => {
      toast.success(vars.allowed ? "Publishing permission granted" : "Publishing permission revoked");
      qc.invalidateQueries({ queryKey: ["admin_teachers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const invite = useMutation({
    mutationFn: async (t: Teacher) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: t.email, full_name: t.full_name, role: "teacher", teacher_id: t.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Invitation sent — the teacher will receive an email to set a password."); setInviting(null); },
    onError: (e: any) => toast.error(e.message ?? "Invite failed. Has the invite-user function been deployed?"),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Teachers</h1>
          <p className="mt-0.5 text-sm text-muted">Faculty profiles, assignments and account access.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden /> Add Teacher</Button>
      </div>

      {isLoading ? <Spinner /> : !teachers?.length ? (
        <EmptyState title="No teachers yet" description="Add teacher profiles, then assign their courses, batches and subjects." action={<Button onClick={() => setCreating(true)}>Add Teacher</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teachers.map((t) => (
            <Card key={t.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-heading font-bold text-navy">{t.full_name}</h2>
                  <p className="text-xs text-muted">{t.specialization ?? "Faculty"}</p>
                </div>
                {t.archived_at ? <Badge tone="gray">Archived</Badge> : t.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
              </div>
              <p className="mt-2 text-sm text-muted">{t.email ?? "No email"}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.can_publish_results ? <Badge tone="amber"><ShieldCheck className="h-3 w-3" aria-hidden /> Can publish results</Badge> : null}
                {t.user_id ? <Badge tone="green">Account linked</Badge> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-4">
                <Button variant="outline" size="sm" onClick={() => setEditing(t)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => setAssigning(t)}><LinkIcon className="h-3.5 w-3.5" aria-hidden /> Assign</Button>
                {t.email && !t.user_id ? (
                  <Button variant="outline" size="sm" onClick={() => setInviting(t)}><KeyRound className="h-3.5 w-3.5" aria-hidden /> Invite</Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setPublish.mutate({ t, allowed: !t.can_publish_results })}>
                  {t.can_publish_results ? "Revoke publish" : "Allow publish"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => save.mutate({ values: { is_active: !t.is_active }, id: t.id })}>
                  {t.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assignments list */}
      {assignments?.length ? (
        <Card className="p-5">
          <h2 className="font-heading font-bold">Teacher Assignments</h2>
          <ul className="mt-3 divide-y divide-lightgray text-sm">
            {assignments.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <strong className="text-navy">{a.teachers?.full_name}</strong>
                  {" — "}{[a.courses?.title, a.batches?.name, a.subjects?.name].filter(Boolean).join(" · ") || "All courses"}
                </span>
                <Button variant="ghost" size="sm" aria-label="Remove assignment"
                  onClick={async () => {
                    const { error } = await supabase.from("teacher_assignments").delete().eq("id", a.id);
                    if (error) toast.error(error.message);
                    else { toast.success("Assignment removed"); qc.invalidateQueries({ queryKey: ["admin_teacher_assignments"] }); }
                  }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <TeacherFormModal open={creating || !!editing} teacher={editing} onClose={() => { setCreating(false); setEditing(null); }}
        onSave={(values: any) => save.mutate({ values, id: editing?.id })} saving={save.isPending} />

      <AssignModal teacher={assigning} courses={courses ?? []} batches={batches ?? []} subjects={subjects ?? []} onClose={() => setAssigning(null)} />

      <ConfirmDialog
        open={!!inviting}
        onClose={() => setInviting(null)}
        onConfirm={() => inviting && invite.mutate(inviting)}
        title="Send account invitation"
        message={`Send an email invitation to ${inviting?.email}? The teacher sets their own password via a secure link and receives the "teacher" role server-side.`}
        confirmLabel="Send Invite"
      />
    </div>
  );
}

function TeacherFormModal({ open, teacher, onClose, onSave, saving }: any) {
  const [form, setForm] = useState<any>(null);
  const key = teacher?.id ?? "new";
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && key !== lastKey) {
    setLastKey(key);
    setForm(teacher ? {
      full_name: teacher.full_name, email: teacher.email ?? "", phone: teacher.phone ?? "",
      specialization: teacher.specialization ?? "", bio: teacher.bio ?? "",
    } : { full_name: "", email: "", phone: "", specialization: "", bio: "" });
  }
  if (!open || !form) return null;
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal open={open} onClose={onClose} title={teacher ? "Edit Teacher" : "Add Teacher"}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(form); }} noValidate>
        <Field label="Full Name" required><Input value={form.full_name} onChange={set("full_name")} /></Field>
        <Field label="Email" hint="Needed to invite the teacher to the portal"><Input type="email" value={form.email} onChange={set("email")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Specialization"><Input value={form.specialization} onChange={set("specialization")} placeholder="e.g. Mathematics" /></Field>
        </div>
        <Field label="Bio"><Textarea rows={3} value={form.bio} onChange={set("bio")} /></Field>
        <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save Teacher</Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignModal({ teacher, courses, batches, subjects, onClose }: any) {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("teacher_assignments").insert({
        teacher_id: teacher.id,
        course_id: courseId || null,
        batch_id: batchId || null,
        subject_id: subjectId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment added");
      qc.invalidateQueries({ queryKey: ["admin_teacher_assignments"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!teacher) return null;
  return (
    <Modal open onClose={onClose} title={`Assign ${teacher.full_name}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Choose what this teacher can access. Leave a field as "All" to grant course-wide or academy-wide scope for that dimension.
        </p>
        <Field label="Course">
          <Select value={courseId} onChange={(e) => { setCourseId(e.target.value); setBatchId(""); }}>
            <option value="">All courses</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
        </Field>
        <Field label="Batch">
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">All batches{courseId ? " of selected course" : ""}</option>
            {batches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <Field label="Subject">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>Add Assignment</Button>
        </div>
      </div>
    </Modal>
  );
}
