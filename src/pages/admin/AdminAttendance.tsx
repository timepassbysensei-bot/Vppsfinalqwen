// Attendance: pick date + batch → load roster → mark present/absent/late/excused.
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCheck, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, EmptyState, Field, Input, Select, Badge, Textarea } from "@/components/ui";
import type { AttendanceMark } from "@/types/database";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { formatDate } from "@/lib/format";

type Mark = AttendanceMark;

export default function AdminAttendance() {
  const qc = useQueryClient();
  const { data: settings } = useSiteSettings();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [batchId, setBatchId] = useState("");
  const [marks, setMarks] = useState<Record<string, { status: Mark; note: string }>>({});
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);

  const { data: batches } = useQuery({
    queryKey: ["admin_batches_light4"],
    queryFn: async () => (await supabase.from("batches").select("id,name,courses(title)").is("archived_at", null).order("name")).data as any[],
  });

  const { data: session } = useQuery({
    queryKey: ["attendance_session", batchId, date],
    enabled: !!batchId,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("batch_id", batchId)
        .eq("session_date", date)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: existingRecords } = useQuery({
    queryKey: ["attendance_records", session?.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase.from("attendance_records").select("*").eq("session_id", session!.id);
      return (data ?? []) as any[];
    },
  });

  const { data: roster } = useQuery({
    queryKey: ["attendance_roster", batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("student_id,students(id,full_name,student_code,is_active)")
        .eq("batch_id", batchId)
        .is("left_on", null);
      if (error) throw error;
      return (data ?? []).map((e: any) => e.students).filter((s: any) => s.is_active);
    },
  });

  // Initialize marks when roster/records load
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!batchId || !roster) return;
    const key = `${batchId}-${date}`;
    if (loadedFor === key) return;
    setLoadedFor(key);
    setDirty(false);
    setMarks(Object.fromEntries(roster.map((s: any) => [s.id, { status: "present" as Mark, note: "" }])));
    setNotes(session?.notes ?? "");
    if (existingRecords?.length) {
      setMarks(Object.fromEntries(roster.map((s: any) => {
        const rec = existingRecords.find((r) => r.student_id === s.id);
        return [s.id, { status: (rec?.status ?? "present") as Mark, note: rec?.note ?? "" }];
      })));
    }
  }, [batchId, date, roster, existingRecords, session, loadedFor]);

  const save = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error("Select a batch");
      let sessionId = session?.id;
      if (!sessionId) {
        const { data, error } = await supabase
          .from("attendance_sessions")
          .insert({ batch_id: batchId, session_date: date, notes: notes || null })
          .select("id").single();
        if (error) throw error;
        sessionId = data.id;
      } else if (notes !== (session?.notes ?? "")) {
        await supabase.from("attendance_sessions").update({ notes: notes || null }).eq("id", sessionId);
      }
      const rows = Object.entries(marks).map(([studentId, m]) => ({
        session_id: sessionId!,
        student_id: studentId,
        status: m.status,
        note: m.note || null,
      }));
      const { error } = await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "session_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["attendance_records"] });
      qc.invalidateQueries({ queryKey: ["attendance_session"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const m of Object.values(marks)) c[m.status] += 1;
    return c;
  }, [marks]);

  const disabled = settings && settings.attendance_enabled === false;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Attendance</h1>
        <p className="mt-0.5 text-sm text-muted">
          {disabled ? "Attendance module is currently disabled in Site Settings." : "Mark daily attendance per batch. Students see only their own summary."}
        </p>
      </div>

      {disabled ? (
        <EmptyState title="Attendance is disabled" description="Enable it in Admin → Site Settings → Module Toggles." />
      ) : (
        <>
          <Card className="grid gap-3 p-4 sm:grid-cols-3">
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Batch">
              <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">Select batch…</option>
                {(batches ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name} · {b.courses?.title}</option>)}
              </Select>
            </Field>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => {
                setMarks((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, status: "present" as Mark }])));
                setDirty(true);
              }} disabled={!batchId}>
                <CheckCheck className="h-4 w-4" aria-hidden /> All Present
              </Button>
              <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!batchId || !dirty}>
                <Save className="h-4 w-4" aria-hidden /> Save
              </Button>
            </div>
          </Card>

          {batchId && roster ? (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge tone="green">Present: {counts.present}</Badge>
                <Badge tone="red">Absent: {counts.absent}</Badge>
                <Badge tone="amber">Late: {counts.late}</Badge>
                <Badge tone="gray">Excused: {counts.excused}</Badge>
                {session ? <Badge tone="navy">Editing saved session · {formatDate(date)}</Badge> : null}
              </div>

              <Field label="Session Notes (optional)">
                <Textarea rows={2} value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); }} placeholder="e.g. Extra drill session" />
              </Field>

              {!roster.length ? (
                <EmptyState title="No active students in this batch" description="Enroll students first from the Students page." />
              ) : (
                <div className="space-y-2">
                  {roster.map((s: any) => (
                    <Card key={s.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-navy">{s.full_name}</p>
                        <p className="font-mono text-[10px] text-muted">{s.student_code}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Attendance for ${s.full_name}`}>
                        {(["present", "absent", "late", "excused"] as Mark[]).map((m) => {
                          const active = marks[s.id]?.status === m;
                          const tone: Record<Mark, string> = {
                            present: "bg-success text-white",
                            absent: "bg-error text-white",
                            late: "bg-saffron text-white",
                            excused: "bg-navy-500 text-white",
                          };
                          return (
                            <button
                              key={m}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => { setMarks((mm) => ({ ...mm, [s.id]: { ...mm[s.id], status: m } })); setDirty(true); }}
                              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${active ? tone[m] : "bg-offwhite text-muted hover:bg-navy-50"}`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
