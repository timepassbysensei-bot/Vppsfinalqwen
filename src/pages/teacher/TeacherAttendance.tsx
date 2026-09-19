// Teacher Attendance: pick one of your batches and a date, then mark every
// student present / absent / late / excused. Re-saving the same date updates the
// existing session instead of creating a duplicate.
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, CheckCheck, Save, Users, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { formatDate, formatDateTime } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Select, Spinner, Badge, Textarea } from "@/components/ui";
import type { AttendanceMark } from "@/types/database";

const MARK_OPTIONS: { value: AttendanceMark; label: string; tone: "green" | "red" | "amber" | "navy" }[] = [
  { value: "present", label: "Present", tone: "green" },
  { value: "absent", label: "Absent", tone: "red" },
  { value: "late", label: "Late", tone: "amber" },
  { value: "excused", label: "Excused", tone: "navy" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function TeacherAttendance() {
  const qc = useQueryClient();
  const { data: scope, isLoading: loadingScope } = useTeacherScope();
  const [batchId, setBatchId] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!batchId && scope?.batches.length) setBatchId(scope.batches[0].id);
  }, [batchId, scope?.batches]);

  const { data: roster, isLoading: loadingRoster } = useQuery({
    queryKey: ["attendance_roster", batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("student_id,students(id,full_name,student_code)")
        .eq("batch_id", batchId)
        .is("left_on", null);
      if (error) throw error;
      return (data ?? [])
        .map((e: any) => e.students)
        .filter(Boolean)
        .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)) as { id: string; full_name: string; student_code: string }[];
    },
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["attendance_session", batchId, date],
    enabled: !!batchId && !!date,
    queryFn: async () => {
      const { data: session, error } = await supabase
        .from("attendance_sessions")
        .select("id,notes")
        .eq("batch_id", batchId)
        .eq("session_date", date)
        .maybeSingle();
      if (error) throw error;
      if (!session) return { session: null, records: [] as { student_id: string; status: AttendanceMark }[] };
      const { data: records, error: rErr } = await supabase
        .from("attendance_records")
        .select("student_id,status")
        .eq("session_id", session.id);
      if (rErr) throw rErr;
      return { session, records: (records ?? []) as { student_id: string; status: AttendanceMark }[] };
    },
  });

  const { data: history } = useQuery({
    queryKey: ["attendance_history", batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("id,session_date,notes,attendance_records(status)")
        .eq("batch_id", batchId)
        .order("session_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
  });

  // Seed the grid when the roster or the existing session changes.
  useEffect(() => {
    if (!roster) return;
    const initial: Record<string, AttendanceMark> = {};
    roster.forEach((s) => {
      const found = existing?.records.find((r) => r.student_id === s.id);
      initial[s.id] = found?.status ?? "present";
    });
    setMarks(initial);
    setNote(existing?.session?.notes ?? "");
    setTouched(false);
  }, [roster, existing]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    Object.values(marks).forEach((m) => { c[m] = (c[m] ?? 0) + 1; });
    return c;
  }, [marks]);

  const save = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error("Select a batch first");
      if (!roster?.length) throw new Error("There are no students enrolled in this batch yet");
      const { data: session, error } = await supabase
        .from("attendance_sessions")
        .upsert({ batch_id: batchId, session_date: date, notes: note.trim() || null }, { onConflict: "batch_id,session_date" })
        .select("id")
        .single();
      if (error) throw error;

      const rows = roster.map((s) => ({
        session_id: session.id,
        student_id: s.id,
        status: marks[s.id] ?? "present",
      }));
      const { error: e2 } = await supabase.from("attendance_records").upsert(rows, { onConflict: "session_id,student_id" });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      setTouched(false);
      qc.invalidateQueries({ queryKey: ["attendance_session", batchId, date] });
      qc.invalidateQueries({ queryKey: ["attendance_history", batchId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save attendance"),
  });

  function setAll(status: AttendanceMark) {
    if (!roster) return;
    setMarks(Object.fromEntries(roster.map((s) => [s.id, status])));
    setTouched(true);
  }

  if (loadingScope) return <Spinner label="Loading your batches…" />;

  if (!scope?.teacher || !scope.batches.length) {
    return <EmptyState title="No batches assigned" description="You need an assigned batch before you can record attendance." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Attendance</h1>
        <p className="mt-0.5 text-sm text-muted">Mark attendance for your batches. Re-saving the same date updates that session.</p>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Batch" required>
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {scope.batches.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.courses?.title ?? ""}</option>)}
          </Select>
        </Field>
        <Field label="Date" required>
          <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="flex items-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setAll("present")}>All present</Button>
          <Button variant="outline" size="sm" onClick={() => setAll("absent")}>All absent</Button>
        </div>
      </Card>

      {existing?.session ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <CheckCheck className="h-3.5 w-3.5 text-success" aria-hidden />
          Attendance for {formatDate(date)} has already been recorded — editing will update it.
        </p>
      ) : null}

      {loadingRoster || loadingExisting ? (
        <Spinner label="Loading the class list…" />
      ) : !roster?.length ? (
        <EmptyState
          title="No students in this batch"
          description="Students appear here once they are enrolled into this batch by an administrator."
        />
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex items-center gap-1.5 text-sm text-muted">
              <Users className="h-4 w-4" aria-hidden /> {roster.length} students
            </span>
            <Badge tone="green">Present {counts.present}</Badge>
            <Badge tone="amber">Late {counts.late}</Badge>
            <Badge tone="red">Absent {counts.absent}</Badge>
            <Badge tone="navy">Excused {counts.excused}</Badge>
          </Card>

          <div className="space-y-3">
            {roster.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{s.full_name}</p>
                    <p className="font-mono text-xs text-muted">{s.student_code}</p>
                  </div>
                  <div role="radiogroup" aria-label={`Attendance for ${s.full_name}`} className="flex flex-wrap gap-1.5">
                    {MARK_OPTIONS.map((o) => {
                      const active = (marks[s.id] ?? "present") === o.value;
                      return (
                        <button
                          key={o.value}
                          role="radio"
                          aria-checked={active}
                          onClick={() => { setMarks({ ...marks, [s.id]: o.value }); setTouched(true); }}
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            active
                              ? o.tone === "green" ? "border-success bg-green-50 text-success"
                                : o.tone === "red" ? "border-error bg-red-50 text-error"
                                : o.tone === "amber" ? "border-saffron bg-saffron-50 text-saffron-700"
                                : "border-navy bg-navy-50 text-navy"
                              : "border-lightgray bg-white text-muted hover:border-navy-300"
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="space-y-4 p-4">
            <Field label="Session note" hint="Optional — e.g. “PT session, ground wet”">
              <Textarea rows={2} value={note} onChange={(e) => { setNote(e.target.value); setTouched(true); }} />
            </Field>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!touched && !!existing?.session} className="w-full sm:w-auto">
              <Save className="h-4 w-4" aria-hidden /> Save attendance for {formatDate(date)}
            </Button>
          </Card>
        </>
      )}

      {history?.length ? (
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-heading font-bold">
            <History className="h-4 w-4 text-problue" aria-hidden /> Recent sessions for this batch
          </h2>
          <ul className="mt-3 divide-y divide-lightgray">
            {history.map((h) => {
              const records = (h.attendance_records ?? []) as { status: string }[];
              const present = records.filter((r) => r.status === "present").length;
              return (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-navy">{formatDate(h.session_date)}</p>
                    {h.notes ? <p className="text-xs text-muted">{h.notes}</p> : null}
                  </div>
                  <div className="flex gap-1.5">
                    <Badge tone="gray">{records.length} marked</Badge>
                    <Badge tone="green">{present} present</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
            Last updated {history[0] ? formatDateTime(history[0].session_date) : "—"}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
