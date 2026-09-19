// Teacher dashboard shell: desktop sidebar, mobile drawer and bottom tab bar.
import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, FolderOpen, FileSpreadsheet, CalendarCheck,
  LogOut, Menu, X, Presentation, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useTeacherScope } from "@/hooks/useTeacherScope";

const NAV = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/teacher/resources", label: "Resources", icon: FolderOpen },
  { to: "/teacher/tests", label: "Tests & Marks", icon: FileSpreadsheet },
  { to: "/teacher/attendance", label: "Attendance", icon: CalendarCheck },
];

export default function TeacherLayout() {
  const [drawer, setDrawer] = useState(false);
  const { profile, signOut } = useAuth();
  const { data: settings } = useSiteSettings();
  const { data: scope } = useTeacherScope();
  const nav = useNavigate();

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    nav("/");
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 px-3 py-5" aria-label="Teacher sections">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setDrawer(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium ${isActive ? "bg-navy text-white" : "text-ink/80 hover:bg-navy-50"}`
          }
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden />
          {item.label}
        </NavLink>
      ))}
      <button onClick={handleSignOut} className="mt-2 flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium text-ink/80 hover:bg-navy-50">
        <LogOut className="h-4 w-4 shrink-0" aria-hidden /> Sign out
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-offwhite">
      <header className="sticky top-0 z-40 border-b border-lightgray bg-white">
        <div className="flex h-14 items-center gap-3 px-4">
          <button className="rounded-md p-2 text-navy lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/teacher" className="flex items-center gap-2 font-heading text-sm font-bold text-navy sm:text-base">
            <Presentation className="h-5 w-5 text-problue" aria-hidden />
            {settings?.academy_name ?? "Bokaro Defence Academy"} <span className="text-muted">· Faculty</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted sm:block">{scope?.teacher?.full_name || profile?.full_name || profile?.email}</span>
            <Link to="/" className="btn-ghost btn-sm">View Site</Link>
            <button onClick={handleSignOut} className="btn-ghost btn-sm" aria-label="Sign out">
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-lightgray bg-white lg:block">
          {sidebar}
        </aside>

        {drawer ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Teacher menu">
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

        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:pb-6">
          {scope && !scope.teacher ? (
            <div className="mb-5 card border-saffron-200 bg-saffron-50 p-4 text-sm text-navy" role="alert">
              <ShieldAlert className="mr-1.5 inline h-4 w-4 text-saffron-600" aria-hidden />
              Your login is not linked to a faculty profile yet, so you may not see your batches. Please contact an administrator.
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-lightgray bg-white lg:hidden" aria-label="Faculty quick navigation">
        <ul className="grid grid-cols-5">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium ${isActive ? "text-problue" : "text-muted"}`
                }
              >
                <item.icon className="h-5 w-5" aria-hidden />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
