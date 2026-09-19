// Teacher dashboard home: the batches this teacher looks after, what still needs
// marks entered, and a quick view of their open assignments.
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Layers, Users, FileSpreadsheet, ClipboardList, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { formatDate } from "@/lib/format";
import { Card, EmptyState, Spinner, Badge } from "@/components/ui";

export default function TeacherHome() {
  const { profile } = useAuth();
  const { data: scope, isLoading: loadingScope } = useTeacherScope();
  const allowedBatchIds = scope?.allowedBatchIds ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["teacher_home", allowedBatchIds.join(",")],
    enabled: !!scope,
    queryFn: async () => {
      if (!allowedBatchIds.length) return { roster: 0, assignments: [], draftTests: [], publishedTests: 0 };

      const [enrollments, assignments, tests] = await Promise.all([
        supabase.from("enrollments").select("student_id").in("batch_id", allowedBatchIds).is("left_on", null),
        supabase
          .from("assignments")
          .select("id,title,due_date,status,batches(name)")
          .in("batch_id", allowedBatchIds)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("tests")
          .select("id,name,test_date,status,batches(name)")
          .in("batch_id", allowedBatchIds)
          .order("test_date", { ascending: false })
          .limit(50),
      ]);

      const uniqueStudents = new Set((enrollments.data ?? []).map((e: any) => e.student_id));
      const allTests = (tests.data ?? []) as any[];

      return {
        roster: uniqueStudents.size,
        assignments: (assignments.data ?? []) as any[],
        draftTests: allTests.filter((t) => t.status === "draft"),
        publishedTests: allTests.filter((t) => t.status !== "draft").length,
      };
    },
  });

  if (loadingScope || isLoading) return <Spinner label="Loading your dashboard…" />;

  if (!scope?.teacher) {
    return (
      <EmptyState
        title="Faculty profile not linked"
        description="An administrator needs to link your login to your faculty profile before your batches appear here."
      />
    );
  }

  const cards = [
    { label: "My batches", value: scope.batches.length, icon: Layers, to: "/teacher/attendance" },
    { label: "Students in my batches", value: data?.roster ?? 0, icon: Users, to: "/teacher/attendance" },
    { label: "Open assignments", value: data?.assignments.filter((a) => a.status === "published").length ?? 0, icon: ClipboardList, to: "/teacher/assignments" },
    { label: "Tests awaiting marks", value: data?.draftTests.length ?? 0, icon: FileSpreadsheet, to: "/teacher/tests" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Welcome, {scope.teacher.full_name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">
          {scope.teacher.can_publish_results
            ? "You can publish results for your batches after review."
            : "Marks you save stay in draft until an administrator reviews and publishes them."}
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

      {!scope.batches.length ? (
        <EmptyState
          title="No batches assigned yet"
          description="Once an administrator assigns you a course or batch, it will appear here along with its students."
        />
      ) : (
        <Card className="p-5">
          <h2 className="font-heading font-bold">My batches</h2>
          <ul className="mt-3 divide-y divide-lightgray">
            {scope.batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-navy">{b.name}</p>
                  <p className="text-xs text-muted">{b.courses?.title ?? "Course"} · {b.timing ?? "Timing to be announced"}</p>
                </div>
                <div className="flex gap-1.5">
                  <Link to="/teacher/attendance" className="btn-outline btn-sm">Attendance</Link>
                  <Link to="/teacher/tests" className="btn-outline btn-sm">Tests</Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Tests awaiting marks */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading font-bold">
              <FileSpreadsheet className="h-4 w-4 text-saffron" aria-hidden /> Awaiting marks
            </h2>
            <Link to="/teacher/tests" className="text-xs font-semibold text-problue hover:underline">Open tests</Link>
          </div>
          {data?.draftTests.length ? (
            <ul className="mt-3 divide-y divide-lightgray">
              {data.draftTests.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy">{t.name}</p>
                    <p className="text-xs text-muted">{t.batches?.name} · {formatDate(t.test_date)}</p>
                  </div>
                  <Link to={`/teacher/tests/${t.id}`} className="btn-outline btn-sm shrink-0">
                    Enter marks <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <AlertTriangle className="h-4 w-4" aria-hidden /> Nothing pending — all tests have their marks entered.
            </p>
          )}
        </Card>

        {/* Recent assignments */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading font-bold">
              <ClipboardList className="h-4 w-4 text-problue" aria-hidden /> Recent assignments
            </h2>
            <Link to="/teacher/assignments" className="text-xs font-semibold text-problue hover:underline">Manage</Link>
          </div>
          {data?.assignments.length ? (
            <ul className="mt-3 divide-y divide-lightgray">
              {data.assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy">{a.title}</p>
                    <p className="text-xs text-muted">{a.batches?.name} · due {formatDate(a.due_date)}</p>
                  </div>
                  <Badge tone={a.status === "published" ? "green" : "amber"}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">You haven't created any assignments yet.</p>
          )}
        </Card>
      </div>

      <p className="text-center text-xs text-muted">Signed in as {profile?.email ?? "faculty"}</p>
    </div>
  );
}
