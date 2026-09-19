// Student Attendance: own attendance history grouped by month, with a summary
// and per-session notes recorded by teachers.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Clock, XCircle, FileQuestion } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/format";
import { Card, EmptyState, Select, Spinner, Badge } from "@/components/ui";

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

const STATUS_TONE: Record<string, "green" | "red" | "amber" | "navy"> = {
  present: "green",
  absent: "red",
  late: "amber",
  excused: "navy",
};

export default function StudentAttendance() {
  const { user } = useAuth();
  const [batchFilter, setBatchFilter] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student_attendance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: student } = await supabase.from("students").select("id").eq("user_id", user!.id).maybeSingle();
      if (!student) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id,status,note,created_at,batch_id,attendance_sessions(session_date,batch_id,notes,batches(name))")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as any[];
    },
  });

  const batches = useMemo(() => {
    const map = new Map<string, string>();
    (data ?? []).forEach((r) => {
      const id = r.attendance_sessions?.batch_id;
      const name = r.attendance_sessions?.batches?.name;
      if (id && name) map.set(id, name);
    });
    return Array.from(map.entries());
  }, [data]);

  const filtered = useMemo(
    () => (data ?? []).filter((r) => !batchFilter || r.attendance_sessions?.batch_id === batchFilter),
    [data, batchFilter],
  );

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 } as Record<string, number>;
    filtered.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return counts;
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filtered.forEach((r) => {
      const d = r.attendance_sessions?.session_date ?? r.created_at?.slice(0, 10) ?? "Unknown";
      const key = d.slice(0, 7); // YYYY-MM
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const monthLabel = (key: string) => {
    if (key === "Unknown") return "Unknown date";
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  if (isLoading) return <Spinner label="Loading your attendance…" />;
  if (isError) return <div className="card p-5 text-sm text-error" role="alert">{(error as Error)?.message ?? "Could not load attendance."}</div>;

  const total = filtered.length;
  const presentRate = total ? Math.round(((summary.present + summary.late) / total) * 100) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">My Attendance</h1>
        <p className="mt-0.5 text-sm text-muted">Sessions recorded by your teachers.</p>
      </div>

      {!total ? (
        <EmptyState
          title="No attendance recorded yet"
          description="Once your teachers start marking daily attendance, your history appears here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Card className="p-4">
              <p className="text-xs text-muted">Attendance rate</p>
              <p className="font-heading text-2xl font-bold text-navy">{presentRate}%</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-1 text-xs text-muted"><CheckCircle2 className="h-3 w-3" aria-hidden /> Present</p>
              <p className="font-heading text-2xl font-bold text-success">{summary.present}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" aria-hidden /> Late</p>
              <p className="font-heading text-2xl font-bold text-saffron-700">{summary.late}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-1 text-xs text-muted"><XCircle className="h-3 w-3" aria-hidden /> Absent</p>
              <p className="font-heading text-2xl font-bold text-error">{summary.absent}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-1 text-xs text-muted"><FileQuestion className="h-3 w-3" aria-hidden /> Excused</p>
              <p className="font-heading text-2xl font-bold text-navy">{summary.excused}</p>
            </Card>
          </div>

          {batches.length > 1 ? (
            <Card className="p-4">
              <Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} aria-label="Filter by batch">
                <option value="">All batches</option>
                {batches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </Select>
            </Card>
          ) : null}

          <div className="space-y-4">
            {grouped.map(([month, records]) => (
              <Card key={month} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-lightgray bg-offwhite px-4 py-3">
                  <h2 className="font-heading font-semibold text-navy">{monthLabel(month)}</h2>
                  <span className="text-xs text-muted">{records.length} session(s)</span>
                </div>
                <ul className="divide-y divide-lightgray">
                  {records.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-navy">{formatDate(r.attendance_sessions?.session_date)}</p>
                        <p className="text-xs text-muted">{r.attendance_sessions?.batches?.name ?? "Batch"}</p>
                        {r.note ? <p className="mt-0.5 text-xs text-ink/70">Note: {r.note}</p> : null}
                      </div>
                      <Badge tone={STATUS_TONE[r.status] ?? "gray"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted">
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden /> If a record looks incorrect, please speak to your batch teacher.
          </p>
        </>
      )}
    </div>
  );
}
