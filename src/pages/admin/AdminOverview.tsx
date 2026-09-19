import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, Users, Inbox, FileSpreadsheet, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateTime, telLink, waLink } from "@/lib/format";
import { Card, EmptyState, Spinner } from "@/components/ui";

export default function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin_overview"],
    queryFn: async () => {
      const [courses, students, teachers, inquiries, tests, newInquiries, recentAudit] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }).is("archived_at", null),
        supabase.from("students").select("id", { count: "exact", head: true }).is("archived_at", null),
        supabase.from("teachers").select("id", { count: "exact", head: true }).is("archived_at", null),
        supabase.from("inquiries").select("id", { count: "exact", head: true }),
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("inquiries").select("*").eq("status", "new").order("created_at", { ascending: false }).limit(5),
        supabase.from("audit_logs").select("id,action,entity,created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      return {
        courses: courses.count ?? 0,
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        inquiries: inquiries.count ?? 0,
        tests: tests.count ?? 0,
        newInquiries: newInquiries.data ?? [],
        audit: recentAudit.data ?? [],
      };
    },
  });

  if (isLoading) return <Spinner label="Loading dashboard…" />;

  const cards = [
    { label: "Courses", value: data?.courses ?? 0, icon: BookOpen, to: "/admin/courses" },
    { label: "Students", value: data?.students ?? 0, icon: GraduationCap, to: "/admin/students" },
    { label: "Teachers", value: data?.teachers ?? 0, icon: Users, to: "/admin/teachers" },
    { label: "Total Inquiries", value: data?.inquiries ?? 0, icon: Inbox, to: "/admin/inquiries" },
    { label: "Tests Created", value: data?.tests ?? 0, icon: FileSpreadsheet, to: "/admin/tests" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Quick summary of the academy.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card p-4 transition-shadow hover:shadow-lift">
            <c.icon className="h-5 w-5 text-problue" aria-hidden />
            <p className="mt-2 font-heading text-2xl font-bold text-navy">{c.value}</p>
            <p className="text-xs text-muted">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* New inquiries */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold">New Inquiries</h2>
            <Link to="/admin/inquiries" className="text-xs font-semibold text-problue hover:underline">View all</Link>
          </div>
          {data?.newInquiries.length ? (
            <ul className="mt-3 divide-y divide-lightgray">
              {data.newInquiries.map((i: any) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy">{i.name}</p>
                    <p className="text-xs text-muted">{i.interested_course ?? "General inquiry"} · {formatDateTime(i.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <a href={telLink(i.phone)} className="btn-outline btn-sm" aria-label={`Call ${i.name}`}>Call</a>
                    <a href={waLink(i.phone)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm" aria-label={`WhatsApp ${i.name}`}>Chat</a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4"><EmptyState title="No new inquiries" description="Public form submissions will appear here." /></div>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold">Recent Activity</h2>
            <TrendingUp className="h-4 w-4 text-muted" aria-hidden />
          </div>
          {data?.audit.length ? (
            <ul className="mt-3 space-y-2.5">
              {data.audit.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink/90">
                    <span className="font-medium">{a.action}</span> <span className="text-muted">on {a.entity}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{formatDateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">Activity will appear here as staff make changes.</p>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="p-5">
        <h2 className="font-heading font-bold">Quick Actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/admin/students" className="btn-outline btn-sm">Add Student</Link>
          <Link to="/admin/tests" className="btn-outline btn-sm">Create Test</Link>
          <Link to="/admin/attendance" className="btn-outline btn-sm">Take Attendance</Link>
          <Link to="/admin/notices" className="btn-outline btn-sm">Publish Notice</Link>
          <Link to="/admin/content" className="btn-outline btn-sm">Edit Website</Link>
        </div>
      </Card>
    </div>
  );
}
