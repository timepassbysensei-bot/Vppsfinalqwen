// Full student profile: details, enrollment + batch transfer, private notes, account invite.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, GraduationCap, ArrowRightLeft, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { Button, Card, Select, Spinner, Badge, Textarea, EmptyState } from "@/components/ui";
import type { Student } from "@/types/database";

export default function AdminStudentProfile() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<string | null>(null);
  const [transferBatch, setTransferBatch] = useState("");

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as Student | null;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["student_enrollments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id,batch_id,enrolled_on,left_on,batches(name,course_id,courses(title))")
        .eq("student_id", id!);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["admin_batches_light"],
    queryFn: async () => (await supabase.from("batches").select("id,name,courses(title)").is("archived_at", null)).data as any[],
  });

  const { data: attendance } = useQuery({
    queryKey: ["student_attendance_summary", id],
    enabled: !!id,
    queryFn: async () => {
      const { count } = await supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("student_id", id!);
      const { count: present } = await supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("student_id", id!)
        .in("status", ["present", "late"]);
      return { total: count ?? 0, present: present ?? 0 };
    },
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("students").update({ notes }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Notes saved"); qc.invalidateQueries({ queryKey: ["student", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const enroll = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase.from("enrollments").insert({ student_id: id!, batch_id: batchId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Student enrolled"); setTransferBatch(""); qc.invalidateQueries({ queryKey: ["student_enrollments", id] }); },
    onError: (e: any) => toast.error(e.code === "23505" ? "Already enrolled in this batch" : e.message),
  });

  const transfer = useMutation({
    mutationFn: async ({ enrollmentId, newBatchId }: { enrollmentId: string; newBatchId: string }) => {
      // Soft-transfer: mark old enrollment as left, create new one (prevents duplicate rows)
      const { error: e1 } = await supabase.from("enrollments").update({ left_on: new Date().toISOString().slice(0, 10) }).eq("id", enrollmentId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("enrollments").insert({ student_id: id!, batch_id: newBatchId });
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Student transferred to new batch"); qc.invalidateQueries({ queryKey: ["student_enrollments", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const invite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: student!.email, full_name: student!.full_name, role: "student", student_id: student!.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Invitation sent"),
    onError: (e: any) => toast.error(e.message ?? "Invite failed"),
  });

  if (isLoading) return <Spinner />;
  if (!student) return <EmptyState title="Student not found" action={<Link to="/admin/students" className="btn-outline">Back to Students</Link>} />;

  const activeEnrollment = enrollments?.find((e) => !e.left_on);

  return (
    <div className="space-y-5">
      <Link to="/admin/students" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Students
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">{student.full_name}</h1>
          <p className="mt-0.5 font-mono text-xs text-muted">{student.student_code}</p>
          <div className="mt-2 flex gap-2">
            {student.archived_at ? <Badge tone="gray">Archived</Badge> : student.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
          </div>
        </div>
        {student.email ? (
          <Button variant="outline" onClick={() => invite.mutate()} loading={invite.isPending}>
            <KeyRound className="h-4 w-4" aria-hidden /> {student.user_id ? "Resend Invitation" : "Send Portal Invite"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-heading font-bold">Details</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <dt className="text-muted">Email</dt><dd className="truncate">{student.email ?? "—"}</dd>
            <dt className="text-muted">Phone</dt><dd>{student.phone ?? "—"}</dd>
            <dt className="text-muted">City</dt><dd>{student.city ?? "—"}</dd>
            <dt className="text-muted">Joined</dt><dd>{formatDate(student.joined_on)}</dd>
            <dt className="text-muted">Guardian</dt><dd>{student.guardian_name ?? "—"}</dd>
            <dt className="text-muted">Guardian Phone</dt><dd>{student.guardian_phone ?? "—"}</dd>
            <dt className="text-muted">Emergency</dt><dd>{student.emergency_contact ?? "—"}</dd>
            <dt className="text-muted">Portal Account</dt><dd>{student.user_id ? <Badge tone="green">Linked</Badge> : <Badge tone="gray">Not created</Badge>}</dd>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-heading font-bold"><GraduationCap className="h-4 w-4 text-problue" aria-hidden /> Enrollment</h2>
          {enrollments?.length ? (
            <ul className="mt-3 space-y-2.5 text-sm">
              {enrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-offwhite px-3 py-2">
                  <div>
                    <p className="font-medium text-navy">{e.batches?.name}</p>
                    <p className="text-xs text-muted">{e.batches?.courses?.title} · since {formatDate(e.enrolled_on)}</p>
                  </div>
                  {e.left_on ? <Badge tone="gray">Left {formatDate(e.left_on)}</Badge> : (
                    <Button variant="ghost" size="sm" onClick={() => transfer.mutate({ enrollmentId: e.id, newBatchId: transferBatch })}
                      disabled={!transferBatch || transferBatch === e.batch_id} aria-label="Transfer batch">
                      <ArrowRightLeft className="h-4 w-4" aria-hidden /> Transfer
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Not enrolled in any batch yet.</p>
          )}
          <div className="mt-4 flex gap-2 border-t border-lightgray pt-4">
            <Select value={transferBatch} onChange={(e) => setTransferBatch(e.target.value)} aria-label="Select batch to enroll">
              <option value="">Select batch…</option>
              {(batches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name} · {b.courses?.title}</option>)}
            </Select>
            <Button onClick={() => transferBatch && enroll.mutate(transferBatch)} disabled={!transferBatch}>Enroll</Button>
          </div>
          {activeEnrollment ? (
            <p className="mt-2 text-xs text-muted">To transfer, use the Transfer button on the active enrollment above.</p>
          ) : null}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-heading font-bold">Attendance Summary</h2>
        <p className="mt-2 text-sm text-muted">
          {attendance ? `${attendance.present} of ${attendance.total} sessions present (including late)` : "Loading…"}
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-heading font-bold">Private Administrative Notes</h2>
        <p className="mt-1 text-xs text-muted">Visible to admins only — never shown to students or on the website.</p>
        <Textarea rows={4} className="mt-3" value={notes ?? student.notes ?? ""} onChange={(e) => setNotes(e.target.value)} aria-label="Private notes" />
        <Button className="mt-3" onClick={() => saveNotes.mutate()} loading={saveNotes.isPending}>
          <Save className="h-4 w-4" aria-hidden /> Save Notes
        </Button>
      </Card>
    </div>
  );
}
