import { Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { useEffect } from "react";
import PublicLayout from "@/components/layouts/PublicLayout";
import SupabaseNotice from "@/components/site/SupabaseNotice";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui";

// ---------- Public pages ----------
import Home from "@/pages/public/Home";
import About from "@/pages/public/About";
import Courses from "@/pages/public/Courses";
import CourseDetail from "@/pages/public/CourseDetail";
import Admissions from "@/pages/public/Admissions";
import Results from "@/pages/public/Results";
import Gallery from "@/pages/public/Gallery";
import Notices from "@/pages/public/Notices";
import Resources from "@/pages/public/Resources";
import Contact from "@/pages/public/Contact";
import PrivacyPolicy from "@/pages/public/PrivacyPolicy";
import Terms from "@/pages/public/Terms";
import RefundPolicy from "@/pages/public/RefundPolicy";
import NotFound from "@/pages/public/NotFound";

// ---------- Auth ----------
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import Unauthorized from "@/pages/auth/Unauthorized";

// ---------- Dashboards ----------
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminCourses from "@/pages/admin/AdminCourses";
import AdminBatches from "@/pages/admin/AdminBatches";
import AdminSessions from "@/pages/admin/AdminSessions";
import AdminSubjects from "@/pages/admin/AdminSubjects";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminStudentProfile from "@/pages/admin/AdminStudentProfile";
import AdminTeachers from "@/pages/admin/AdminTeachers";
import AdminAssignments from "@/pages/admin/AdminAssignments";
import AdminResources from "@/pages/admin/AdminResources";
import AdminTests from "@/pages/admin/AdminTests";
import AdminTestMarks from "@/pages/admin/AdminTestMarks";
import AdminAttendance from "@/pages/admin/AdminAttendance";
import AdminInquiries from "@/pages/admin/AdminInquiries";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminNotices from "@/pages/admin/AdminNotices";
import AdminAchievements from "@/pages/admin/AdminAchievements";
import AdminTestimonials from "@/pages/admin/AdminTestimonials";
import AdminGallery from "@/pages/admin/AdminGallery";
import AdminMedia from "@/pages/admin/AdminMedia";
import AdminFaculty from "@/pages/admin/AdminFaculty";
import AdminFaqs from "@/pages/admin/AdminFaqs";
import AdminContent from "@/pages/admin/AdminContent";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";

import StudentLayout from "@/pages/student/StudentLayout";
import StudentHome from "@/pages/student/StudentHome";
import StudentAssignments from "@/pages/student/StudentAssignments";
import StudentResources from "@/pages/student/StudentResources";
import StudentResults from "@/pages/student/StudentResults";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentMessages from "@/pages/student/StudentMessages";
import StudentProfile from "@/pages/student/StudentProfile";

import TeacherLayout from "@/pages/teacher/TeacherLayout";
import TeacherHome from "@/pages/teacher/TeacherHome";
import TeacherAssignments from "@/pages/teacher/TeacherAssignments";
import TeacherResources from "@/pages/teacher/TeacherResources";
import TeacherTests from "@/pages/teacher/TeacherTests";
import TeacherAttendance from "@/pages/teacher/TeacherAttendance";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0 }), [pathname]);
  return null;
}

/** Waits for auth load; bounces signed-out users to /login preserving intent. */
function RequireAuth({ allow }: { allow: Array<"super_admin" | "admin" | "teacher" | "student"> }) {
  const { session, loading, roles } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner label="Checking your session…" /></div>;
  if (!session) return <Navigate to="/login" state={{ returnTo: loc.pathname + loc.search }} replace />;
  const ok = allow.some((r) => roles.includes(r));
  if (!ok) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <SupabaseNotice />
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/admissions" element={<Admissions />} />
          <Route path="/results" element={<Results />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Admin */}
        <Route element={<RequireAuth allow={["super_admin", "admin"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="batches" element={<AdminBatches />} />
            <Route path="sessions" element={<AdminSessions />} />
            <Route path="subjects" element={<AdminSubjects />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="students/:id" element={<AdminStudentProfile />} />
            <Route path="teachers" element={<AdminTeachers />} />
            <Route path="assignments" element={<AdminAssignments />} />
            <Route path="resources" element={<AdminResources />} />
            <Route path="tests" element={<AdminTests />} />
            <Route path="tests/:id" element={<AdminTestMarks />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="inquiries" element={<AdminInquiries />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="notices" element={<AdminNotices />} />
            <Route path="achievements" element={<AdminAchievements />} />
            <Route path="testimonials" element={<AdminTestimonials />} />
            <Route path="gallery" element={<AdminGallery />} />
            <Route path="media" element={<AdminMedia />} />
            <Route path="faculty" element={<AdminFaculty />} />
            <Route path="faqs" element={<AdminFaqs />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
          </Route>
        </Route>

        {/* Teacher */}
        <Route element={<RequireAuth allow={["teacher", "admin", "super_admin"]} />}>
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route index element={<TeacherHome />} />
            <Route path="assignments" element={<TeacherAssignments />} />
            <Route path="resources" element={<TeacherResources />} />
            <Route path="tests" element={<TeacherTests />} />
            <Route path="tests/:id" element={<AdminTestMarks />} />
            <Route path="attendance" element={<TeacherAttendance />} />
          </Route>
        </Route>

        {/* Student */}
        <Route element={<RequireAuth allow={["student"]} />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentHome />} />
            <Route path="assignments" element={<StudentAssignments />} />
            <Route path="resources" element={<StudentResources />} />
            <Route path="results" element={<StudentResults />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="messages" element={<StudentMessages />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
