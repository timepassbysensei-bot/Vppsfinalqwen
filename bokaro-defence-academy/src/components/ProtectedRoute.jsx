import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingState from './LoadingState'

export default function ProtectedRoute({ children, requireAdmin = false, requireStudent = false }) {
  const { user, profile, loading, isAdmin, isStudent } = useAuth()

  if (loading) {
    return <LoadingState message="Verifying access..." />
  }

  if (!user) {
    return <Navigate to="/student-login" replace />
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/student-dashboard" replace />
  }

  if (requireStudent && !isStudent()) {
    return <Navigate to="/admin-dashboard" replace />
  }

  return children
}
