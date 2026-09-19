// Student dashboard home: what's due, recent notices, attendance summary and the
// latest published results — all fetched under RLS so only own data is returned.
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ClipboardList, Megaphone, CalendarCheck, FileSpreadsheet, ArrowRight,
  BookOpen, Layers, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { formatDate } from "@/lib/format";
import { Card, EmptyState, Spinner, Badge } from "@/components/ui";

export default function StudentHome() {
  const { user, profile } = useAuth();
  const { data: settings } = useSiteSettings();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["student_home", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students")
        .select("id,full_name,student_code")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!student) {
        return { student: null, enrollments: [], assignments: [], notices: [], attendance: [], tests: [] };
      }

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id,batch_id,enrolled_on,batches(id,name,timing,course_id,courses(title,slug))")
        .eq("student_id", student.id)
        .is("left_on", null);

      const batchIds = (enrollments ?? []).map((e: any) => e.batch_id);

      const [assignments, notices, attendance, tests] = await Promise.all([
        batchIds.length
          ? supabase
              .from("assignments")
              .select("id,title,due_date,status,subject_id")
              .in("batch_id", batchIds)
              .eq("status", "published")
              .order("due_date", { ascending: true })
              .limit(20)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("notices")
          .select("id,title,description,publish_date,is_pinned,audience")
          .eq("status", "published")
          .order("is_pinned", { ascending: false })
          .order("publish_date", { ascending: false })
          .limit(5),
        supabase
          .from("attendance_records")
          .select("id,status,attendance_sessions!inner(session_date)")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(60),
        batchIds.length
          ? supabase
              .from("tests")
              .select("id,name,test_date,status,batch_id")
              .in("batch_id", batchIds)
              .in("status", ["published", "locked"])
              .order("test_date", { ascending: false })
              .limit(5)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      return {
        student,
        enrollments: enrollments ?? [],
        assignments: assignments.data ?? [],
        notices: notices.data ?? [],
        attendance: attendance.data ?? [],
        tests: tests.data ?? [],
      };
    },
  });

  if (isLoading) return <Spinner label="Loading your dashboard…" />;
  if (isError) return <div className="card p-5 text-sm text-error" role="alert">{(error as Error)?.message ?? "Could not load your dashboard."}</div>;

  if (!data?.student) {
    return (
      <EmptyState
        title="Your account is not linked to a student record yet"
        description="Ask the academy office to link your login to your student profile. Once linked, your batches, assignments, results and attendance will appear here."
      />
    );
  }

  const { student, enrollments, assignments, notices, attendance, tests } = data;

  const present = attendance.filter((a: any) => a.status === "present").length;
  const absent = attendance.filter((a: any) => a.status === "absent").length;
  const late = attendance.filter((a: any) => a.status === "late").length;
  const attendanceTotal = attendance.length;

  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = assignments.filter((a: any) => !a.due_date || a.due_date >= today).slice(0, 4);

  const cards = [
    { label: "My batches", value: enrollments.length, icon: Layers, to: "/student/profile" },
    { label: "Open assignments", value: assignments.length, icon: ClipboardList, to: "/student/assignments" },
    { label: "Present sessions", value: present, icon: CalendarCheck, to: "/student/attendance" },
    { label: "Published results", value: tests.length, icon: FileSpreadsheet, to: "/student/results" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">
          Welcome, {student.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {settings?.academy_name ?? "Bokaro Defence Academy"} · Student ID <span className="font-mono">{student.student_code}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card p-4 transition-shadow hover:shadow-lift">
            <c.icon className="h-5 w-5 text-problue" aria-hidden />
            <p className="mt-2 font-heading text-2xl font-bold text-navy">{c.value}</p>
            <p className="text-xs text-muted">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Due soon */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold">Assignments due soon</h2>
            <Link to="/student/assignments" className="text-xs font-semibold text-problue hover:underline">View all</Link>
          </div>
          {dueSoon.length ? (
            <ul className="mt-3 divide-y divide-lightgray">
              {dueSoon.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy">{a.title}</p>
                    <p className="text-xs text-muted">Due {formatDate(a.due_date)}</p>
                  </div>
                  <Link to="/student/assignments" className="btn-outline btn-sm shrink-0">Open</Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState title="Nothing due" description="Your teachers haven't published any new assignments." />
            </div>
          )}
        </Card>

        {/* Notices */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading font-bold">
              <Megaphone className="h-4 w-4 text-saffron" aria-hidden /> Notices
            </h2>
          </div>
          {notices.length ? (
            <ul className="mt-3 divide-y divide-lightgray">
              {notices.map((n: any) => (
                <li key={n.id} className="py-2.5">
                  <p className="flex items-center gap-2 text-sm font-medium text-navy">
                    {n.is_pinned ? <Badge tone="amber">Pinned</Badge> : null}
                    {n.title}
                  </p>
                  <p className="text-xs text-muted">{formatDate(n.publish_date)}</p>
                  {n.description ? <p className="mt-1 line-clamp-2 text-sm text-ink/80">{n.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState title="No notices" description="Academy announcements will appear here." />
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* My batches */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-heading font-bold">
            <BookOpen className="h-4 w-4 text-problue" aria-hidden /> My batches
          </h2>
          {enrollments.length ? (
            <ul className="mt-3 divide-y divide-lightgray">
              {enrollments.map((e: any) => (
                <li key={e.id} className="py-2.5">
                  <p className="text-sm font-medium text-navy">{e.batches?.name}</p>
                  <p className="text-xs text-muted">
                    {e.batches?.courses?.title ?? "Course"} · {e.batches?.timing ?? "Timing to be announced"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">You are not enrolled in a batch yet. Contact the office if this looks wrong.</p>
          )}
        </Card>

        {/* Attendance summary */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold">Attendance summary</h2>
            <Link to="/student/attendance" className="text-xs font-semibold text-problue hover:underline">Details</Link>
          </div>
          {attendanceTotal ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-green-50 p-3">
                  <p className="font-heading text-xl font-bold text-success">{present}</p>
                  <p className="text-xs text-muted">Present</p>
                </div>
                <div className="rounded-md bg-amber-50 p-3">
                  <p className="font-heading text-xl font-bold text-saffron-700">{late}</p>
                  <p className="text-xs text-muted">Late</p>
                </div>
                <div className="rounded-md bg-red-50 p-3">
                  <p className="font-heading text-xl font-bold text-error">{absent}</p>
                  <p className="text-xs text-muted">Absent</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">
                Based on the {attendanceTotal} most recent recorded sessions.
              </p>
            </>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> No attendance has been recorded yet.
            </p>
          )}
        </Card>
      </div>

      {/* Recent results */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold">Recent published results</h2>
          <Link to="/student/results" className="text-xs font-semibold text-problue hover:underline">All results</Link>
        </div>
        {tests.length ? (
          <ul className="mt-3 divide-y divide-lightgray">
            {tests.map((t: any) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-navy">{t.name}</p>
                  <p className="text-xs text-muted">{formatDate(t.test_date)}</p>
                </div>
                <Link to={`/student/results?test=${t.id}`} className="btn-outline btn-sm">
                  View <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState title="No published results yet" description="Results appear here once your teacher publishes them." />
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-muted">
        Signed in as {profile?.email ?? "student"} · Need help? Contact the academy office.
      </p>
    </div>
  );
}
