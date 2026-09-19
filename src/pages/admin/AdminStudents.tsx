// Admin Students: search/filter/paginate, add/edit, archive/restore, CSV import/export,
// account invite (creates auth user server-side via edge function or admin RPC).
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Search, Archive, ArchiveRestore, Upload, Download, KeyRound, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { studentFormSchema } from "@/lib/validation";
import { readableStudentCode, downloadText, toCsv, formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Pagination, Select, Spinner, Badge, ConfirmDialog, Textarea } from "@/components/ui";
import type { Student } from "@/types/database";
import { z } from "zod";

type FormVals = z.infer<typeof studentFormSchema>;
const PAGE_SIZE = 12;

export default function AdminStudents() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [statusFilter, setStatusFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Student | null>(null);
  const [importing, setImporting] = useState(false);
  const [inviting, setInviting] = useState<Student | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: batches } = useQuery({
    queryKey: ["admin_batches_light"],
    queryFn: async () => {
      const { data } = await supabase.from("batches").select("id,name,course_id,courses(title)").order("name");
      return (data ?? []) as any[];
    },
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ["admin_students", debouncedQ, statusFilter, batchFilter],
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (debouncedQ.trim()) {
        const term = debouncedQ.trim();
        query = query.or(`full_name.ilike.%${term}%,student_code.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%`);
      }
      if (statusFilter === "active") query = query.eq("is_active", true).is("archived_at", null);
      if (statusFilter === "inactive") query = query.eq("is_active", false).is("archived_at", null);
      if (statusFilter === "archived") query = query.not("archived_at", "is", null);
      const { data, error } = await query;
      if (error) throw error;

      if (batchFilter) {
        const { data: enr } = await supabase.from("enrollments").select("student_id").eq("batch_id", batchFilter).is("left_on", null);
        const ids = new Set((enr ?? []).map((e: any) => e.student_id));
        return (data as Student[]).filter((s) => ids.has(s.id));
      }
      return data as Student[];
    },
  });

  const filtered = students ?? [];
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormVals; id?: string }) => {
      const payload: any = {
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        guardian_name: values.guardian_name || null,
        guardian_phone: values.guardian_phone || null,
        emergency_contact: values.emergency_contact || null,
        city: values.city || null,
        address: values.address || null,
      };
      if (id) {
        const { error } = await supabase.from("students").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        payload.student_code = readableStudentCode();
        payload.joined_on = new Date().toISOString().slice(0, 10);
        const { error } = await supabase.from("students").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_v, vars) => {
      toast.success(vars.id ? "Student updated" : "Student added");
      qc.invalidateQueries({ queryKey: ["admin_students"] });
      setCreating(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const archive = useMutation({
    mutationFn: async ({ s, restore }: { s: Student; restore?: boolean }) => {
      const payload: any = { archived_at: restore ? null : new Date().toISOString(), is_active: restore ? s.is_active : false };
      const { error } = await supabase.from("students").update(payload).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: (_v, vars) => {
      toast.success(vars.restore ? "Student restored" : "Student archived");
      qc.invalidateQueries({ queryKey: ["admin_students"] });
      setConfirmArchive(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (s: Student) => {
      const { error } = await supabase.from("students").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: (_v, s) => { toast.success(s.is_active ? "Account deactivated" : "Account activated"); qc.invalidateQueries({ queryKey: ["admin_students"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const exportCsv = useCallback(() => {
    const rows = filtered.map((s) => [
      s.student_code, s.full_name, s.email ?? "", s.phone ?? "", s.city ?? "",
      s.guardian_name ?? "", s.guardian_phone ?? "", s.is_active ? "active" : "inactive",
      s.archived_at ? "archived" : "", formatDate(s.joined_on),
    ]);
    downloadText(`students-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(["Student ID", "Name", "Email", "Phone", "City", "Guardian", "Guardian Phone", "Status", "Archived", "Joined"], rows));
    toast.success("CSV exported");
  }, [filtered]);

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("CSV needs a header row and at least one student row");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const idx = (name: string) => headers.indexOf(name);
      const rows = lines.slice(1).map((line) => {
        // naive CSV split (no quoted commas expected in this import format)
        const cols = line.split(",");
        return {
          student_code: idx("student id") >= 0 ? cols[idx("student id")]?.trim() || readableStudentCode() : readableStudentCode(),
          full_name: (cols[idx("name")] ?? "").trim(),
          email: (cols[idx("email")] ?? "").trim() || null,
          phone: (cols[idx("phone")] ?? "").trim() || null,
          city: (cols[idx("city")] ?? "").trim() || null,
          guardian_name: (cols[idx("guardian")] ?? "").trim() || null,
          guardian_phone: (cols[idx("guardian phone")] ?? "").trim() || null,
          joined_on: new Date().toISOString().slice(0, 10),
        };
      }).filter((r) => r.full_name);
      if (!rows.length) throw new Error("No valid rows found — make sure there is a 'Name' column");
      const { error } = await supabase.from("students").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} students`);
      qc.invalidateQueries({ queryKey: ["admin_students"] });
      setImporting(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Import failed"),
  });

  const invite = useMutation({
    mutationFn: async (s: Student) => {
      if (!s.email) throw new Error("This student has no email address. Add one first.");
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: s.email, full_name: s.full_name, role: "student", student_id: s.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Invitation sent — the student will receive an email to set a password."); setInviting(null); },
    onError: (e: any) => toast.error(e.message ?? "Invite failed. Has the invite-user function been deployed?"),
  });

  const templateCsv = () => {
    downloadText("students-template.csv", toCsv(
      ["Name", "Email", "Phone", "City", "Guardian", "Guardian Phone"],
      [["Sample Student", "student@example.com", "9876543210", "Bokaro", "Guardian Name", "9876543211"]],
    ));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Students</h1>
          <p className="mt-0.5 text-sm text-muted">Add students, manage enrollment and account access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="file" accept=".csv" id="csv-import" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv.mutate(f); }} />
          <Button variant="outline" onClick={() => setImporting(true)}><Upload className="h-4 w-4" aria-hidden /> Import CSV</Button>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" aria-hidden /> Export CSV</Button>
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden /> Add Student</Button>
        </div>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, email, phone…" className="pl-9" aria-label="Search students" />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </Select>
        <Select value={batchFilter} onChange={(e) => { setBatchFilter(e.target.value); setPage(1); }} aria-label="Filter by batch">
          <option value="">All batches</option>
          {(batches ?? []).map((b: any) => (
            <option key={b.id} value={b.id}>{b.name} · {b.courses?.title ?? ""}</option>
          ))}
        </Select>
      </Card>

      {isLoading ? <Spinner /> : pageItems.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Add a student manually or import a CSV. Students appear here with their enrollment status."
          action={<Button onClick={() => setCreating(true)}>Add Student</Button>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-offwhite">
                <tr><th className="table-th">Student</th><th className="table-th">ID</th><th className="table-th">Contact</th><th className="table-th">Status</th><th className="table-th text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-lightgray">
                {pageItems.map((s) => (
                  <tr key={s.id} className={s.archived_at ? "opacity-60" : ""}>
                    <td className="table-td">
                      <Link to={`/admin/students/${s.id}`} className="font-medium text-navy hover:underline">{s.full_name}</Link>
                      <p className="text-xs text-muted">{s.city ?? "—"}</p>
                    </td>
                    <td className="table-td font-mono text-xs">{s.student_code}</td>
                    <td className="table-td">
                      <p>{s.phone ?? s.email ?? "—"}</p>
                      <p className="text-xs text-muted">{s.email && s.phone ? s.email : ""}</p>
                    </td>
                    <td className="table-td">
                      {s.archived_at ? <Badge tone="gray">Archived</Badge> : s.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
                    </td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        <Link to={`/admin/students/${s.id}`} className="btn-ghost btn-sm" aria-label={`View ${s.full_name}`}><Eye className="h-4 w-4" /></Link>
                        {!s.archived_at && s.email ? (
                          <Button variant="ghost" size="sm" onClick={() => setInviting(s)} aria-label={`Invite ${s.full_name}`}><KeyRound className="h-4 w-4" /></Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate(s)} aria-label={s.is_active ? `Deactivate ${s.full_name}` : `Activate ${s.full_name}`}>
                          <span className="text-xs font-semibold">{s.is_active ? "Deactivate" : "Activate"}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(s)} aria-label={`Edit ${s.full_name}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(s)} aria-label={`${s.archived_at ? "Restore" : "Archive"} ${s.full_name}`}>
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
            {pageItems.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/admin/students/${s.id}`} className="font-semibold text-navy hover:underline">{s.full_name}</Link>
                    <p className="font-mono text-xs text-muted">{s.student_code}</p>
                    <p className="mt-1 text-sm text-muted">{s.phone ?? s.email ?? "—"}</p>
                  </div>
                  {s.archived_at ? <Badge tone="gray">Archived</Badge> : s.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Link to={`/admin/students/${s.id}`} className="btn-outline btn-sm">Profile</Link>
                  <Button variant="outline" size="sm" onClick={() => setEditing(s)}>Edit</Button>
                  {!s.archived_at && s.email ? <Button variant="outline" size="sm" onClick={() => setInviting(s)}>Invite</Button> : null}
                  <Button variant="outline" size="sm" onClick={() => toggleActive.mutate(s)}>{s.is_active ? "Deactivate" : "Activate"}</Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmArchive(s)}>{s.archived_at ? "Restore" : "Archive"}</Button>
                </div>
              </Card>
            ))}
          </div>

          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </>
      )}

      <StudentFormModal
        open={creating || !!editing}
        student={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={(values) => save.mutate({ values, id: editing?.id })}
        saving={save.isPending}
      />

      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => confirmArchive && archive.mutate({ s: confirmArchive, restore: !!confirmArchive.archived_at })}
        title={confirmArchive?.archived_at ? "Restore student" : "Archive student"}
        message={confirmArchive?.archived_at
          ? `${confirmArchive.full_name} will be restored to the active list.`
          : `Archive ${confirmArchive?.full_name}? Their marks, attendance and enrollment history are preserved (soft delete), but they are hidden from active lists.`}
        confirmLabel={confirmArchive?.archived_at ? "Restore" : "Archive"}
        danger={!confirmArchive?.archived_at}
      />

      <Modal open={importing} onClose={() => setImporting(false)} title="Import Students from CSV">
        <div className="space-y-4 text-sm">
          <p className="text-muted">
            Required column: <strong>Name</strong>. Optional: Student ID, Email, Phone, City, Guardian, Guardian Phone.
            Download the template to see the format.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={templateCsv}><Download className="h-4 w-4" aria-hidden /> Template</Button>
            <Button onClick={() => document.getElementById("csv-import")?.click()} loading={importCsv.isPending}>
              <Upload className="h-4 w-4" aria-hidden /> Choose CSV…
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!inviting}
        onClose={() => setInviting(null)}
        onConfirm={() => inviting && invite.mutate(inviting)}
        title="Send account invitation"
        message={`Send an email invitation to ${inviting?.email}? The student will set their own password via a secure link. Their role is assigned server-side as "student".`}
        confirmLabel="Send Invite"
      />
    </div>
  );
}

function StudentFormModal({ open, student, onClose, onSave, saving }: {
  open: boolean; student: Student | null; onClose: () => void; onSave: (v: FormVals) => void; saving: boolean;
}) {
  const [form, setForm] = useState<FormVals | null>(null);
  const key = student?.id ?? "new";
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && key !== lastKey) {
    setLastKey(key);
    setForm(student ? {
      full_name: student.full_name,
      email: student.email ?? "",
      phone: student.phone ?? "",
      date_of_birth: student.date_of_birth ?? "",
      gender: (student.gender as any) ?? "",
      guardian_name: student.guardian_name ?? "",
      guardian_phone: student.guardian_phone ?? "",
      emergency_contact: student.emergency_contact ?? "",
      city: student.city ?? "",
      address: student.address ?? "",
    } : {
      full_name: "", email: "", phone: "", date_of_birth: "", gender: "",
      guardian_name: "", guardian_phone: "", emergency_contact: "", city: "", address: "",
    });
  }
  if (!open || !form) return null;
  const set = (k: keyof FormVals) => (e: any) => setForm((f) => ({ ...f!, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title={student ? "Edit Student" : "Add Student"} wide>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(form); }} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required><Input value={form.full_name} onChange={set("full_name")} /></Field>
          <Field label="Email" hint="Needed to invite the student to the portal"><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Phone"><Input type="tel" value={form.phone} onChange={set("phone")} /></Field>
          <Field label="City"><Input value={form.city} onChange={set("city")} /></Field>
          <Field label="Date of Birth"><Input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={set("gender")}>
              <option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Guardian Name"><Input value={form.guardian_name} onChange={set("guardian_name")} /></Field>
          <Field label="Guardian Phone"><Input type="tel" value={form.guardian_phone} onChange={set("guardian_phone")} /></Field>
          <Field label="Emergency Contact"><Input value={form.emergency_contact} onChange={set("emergency_contact")} /></Field>
        </div>
        <Field label="Address"><Textarea rows={2} value={form.address} onChange={set("address")} /></Field>
        {student ? (
          <div className="rounded-md bg-offwhite p-3 text-xs text-muted">
            Student ID: <span className="font-mono">{student.student_code}</span> · Joined: {formatDate(student.joined_on)}
            <br />Private admin notes and enrollment are managed on the student profile page.
          </div>
        ) : (
          <p className="rounded-md bg-navy-50 p-3 text-xs text-navy">
            A readable Student ID (e.g. BDA-2026-1234) is generated automatically. Enrollment into batches is done after saving.
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save Student</Button>
        </div>
      </form>
    </Modal>
  );
}
