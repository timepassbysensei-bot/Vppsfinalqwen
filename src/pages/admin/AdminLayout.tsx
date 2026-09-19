// Admin dashboard shell: desktop sidebar + mobile drawer + topbar.
import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, CalendarRange, Layers, GraduationCap, UserCog,
  ClipboardList, FolderOpen, FileSpreadsheet, CalendarCheck, Inbox, MessagesSquare,
  Megaphone, Trophy, Quote, Images, LibraryBig, Presentation, HelpCircle,
  PanelsTopLeft, Settings, UserSquare2, ScrollText, LogOut, Menu, X, Plus, Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Input } from "@/components/ui";

const NAV_SECTIONS: { heading: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    heading: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
  {
    heading: "Academics",
    items: [
      { to: "/admin/courses", label: "Courses", icon: BookOpen },
      { to: "/admin/batches", label: "Batches", icon: Layers },
      { to: "/admin/sessions", label: "Academic Sessions", icon: CalendarRange },
      { to: "/admin/subjects", label: "Subjects", icon: BookOpen },
      { to: "/admin/teachers", label: "Teachers", icon: Presentation },
      { to: "/admin/students", label: "Students", icon: GraduationCap },
    ],
  },
  {
    heading: "Learning",
    items: [
      { to: "/admin/assignments", label: "Assignments", icon: ClipboardList },
      { to: "/admin/resources", label: "Resources", icon: FolderOpen },
      { to: "/admin/tests", label: "Tests & Marks", icon: FileSpreadsheet },
      { to: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
    ],
  },
  {
    heading: "Communication",
    items: [
      { to: "/admin/inquiries", label: "Inquiries", icon: Inbox },
      { to: "/admin/messages", label: "Messages", icon: MessagesSquare },
      { to: "/admin/notices", label: "Notices", icon: Megaphone },
    ],
  },
  {
    heading: "Website",
    items: [
      { to: "/admin/achievements", label: "Achievements", icon: Trophy },
      { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
      { to: "/admin/gallery", label: "Gallery", icon: Images },
      { to: "/admin/media", label: "Media Library", icon: LibraryBig },
      { to: "/admin/faculty", label: "Faculty Profiles", icon: UserCog },
      { to: "/admin/faqs", label: "FAQs & Chatbot", icon: HelpCircle },
      { to: "/admin/content", label: "Website Content", icon: PanelsTopLeft },
      { to: "/admin/settings", label: "Site Settings", icon: Settings },
    ],
  },
  {
    heading: "Administration",
    items: [
      { to: "/admin/users", label: "User Roles", icon: UserSquare2 },
    ],
  },
];

export default function AdminLayout() {
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");
  const { profile, signOut } = useAuth();
  const { data: settings } = useSiteSettings();
  const nav = useNavigate();

  function runSearch() {
    if (!q.trim()) return;
    nav(`/admin/students?q=${encodeURIComponent(q.trim())}`);
    setDrawer(false);
    setQ("");
  }

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    nav("/");
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-5" aria-label="Admin sections">
      {NAV_SECTIONS.map((sec) => (
        <div key={sec.heading}>
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{sec.heading}</p>
          <ul className="space-y-0.5">
            {sec.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/admin"}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium ${isActive ? "bg-navy text-white" : "text-ink/80 hover:bg-navy-50"}`
                  }
                  onClick={() => setDrawer(false)}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-offwhite">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-lightgray bg-white">
        <div className="flex h-14 items-center gap-3 px-4">
          <button className="rounded-md p-2 text-navy lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/admin" className="font-heading text-sm font-bold text-navy sm:text-base">
            {settings?.academy_name ?? "Bokaro Defence Academy"} <span className="text-muted">· Admin</span>
          </Link>
          <div className="relative ml-auto hidden max-w-xs flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Global search (students)…"
              aria-label="Global search"
              className="min-h-[38px] pl-9"
            />
          </div>
          <Link to="/" className="btn-ghost btn-sm hidden sm:inline-flex">View Site</Link>
          <button onClick={handleSignOut} className="btn-ghost btn-sm" aria-label="Sign out">
            <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-lightgray bg-white lg:block">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {drawer ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="absolute inset-0 bg-navy-dark/50" onClick={() => setDrawer(false)} aria-hidden />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-lift">
              <div className="flex items-center justify-between border-b border-lightgray px-4 py-3">
                <span className="font-heading text-sm font-bold text-navy">Menu</span>
                <button onClick={() => setDrawer(false)} className="rounded p-1.5 text-muted hover:bg-navy-50" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sidebar}
            </div>
          </div>
        ) : null}

        {/* Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
          <p className="mt-10 text-center text-xs text-muted">
            Signed in as {profile?.full_name || profile?.email || "staff"} ·{" "}
            <Link to="/" className="underline hover:text-navy">public website</Link>
          </p>
        </main>
      </div>

      {/* Quick add FAB (mobile) */}
      <Link
        to="/admin/students"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-saffron text-white shadow-lift lg:hidden"
        aria-label="Quick add student"
      >
        <Plus className="h-6 w-6" aria-hidden />
      </Link>
    </div>
  );
}
