import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Courses from './pages/Courses'
import Gallery from './pages/Gallery'
import StudentLogin from './pages/StudentLogin'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentChat from './pages/student/StudentChat'
import AdminDashboard from './pages/admin/AdminDashboard'
import EnterMarks from './pages/admin/EnterMarks'
import ManageCourses from './pages/admin/ManageCourses'
import ManageStudents from './pages/admin/ManageStudents'
import ManageAssignments from './pages/admin/ManageAssignments'
import ManageGallery from './pages/admin/ManageGallery'
import ManageAchievements from './pages/admin/ManageAchievements'
import ManageInquiries from './pages/admin/ManageInquiries'
import ManageSettings from './pages/admin/ManageSettings'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/student-login" element={<StudentLogin />} />

          {/* Student Routes */}
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute requireStudent>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-chat"
            element={
              <ProtectedRoute requireStudent>
                <StudentChat />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/enter-marks"
            element={
              <ProtectedRoute requireAdmin>
                <EnterMarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-courses"
            element={
              <ProtectedRoute requireAdmin>
                <ManageCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-students"
            element={
              <ProtectedRoute requireAdmin>
                <ManageStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-assignments"
            element={
              <ProtectedRoute requireAdmin>
                <ManageAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-gallery"
            element={
              <ProtectedRoute requireAdmin>
                <ManageGallery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-achievements"
            element={
              <ProtectedRoute requireAdmin>
                <ManageAchievements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-inquiries"
            element={
              <ProtectedRoute requireAdmin>
                <ManageInquiries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-settings"
            element={
              <ProtectedRoute requireAdmin>
                <ManageSettings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
