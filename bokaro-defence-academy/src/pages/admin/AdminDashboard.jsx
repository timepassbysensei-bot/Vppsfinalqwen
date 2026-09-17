import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import LoadingState from '../../components/LoadingState'
import { Users, FileText, MessageSquare, TrendingUp, PlusCircle, BookOpen, Image, Award, Settings, ClipboardList } from 'lucide-react'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [stats, setStats] = useState({
    totalStudents: 0,
    newInquiriesToday: 0,
    pendingFees: 0,
    recentInquiries: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Total students
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      // Pending fees
      const { count: pendingCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .neq('fee_status', 'Paid')

      // New inquiries today
      const today = new Date().toISOString().split('T')[0]
      const { data: inquiries } = await supabase
        .from('inquiries')
        .select('*')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalStudents: studentCount || 0,
        newInquiriesToday: inquiries?.length || 0,
        pendingFees: pendingCount || 0,
        recentInquiries: inquiries || [],
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    { to: '/admin/enter-marks', icon: ClipboardList, label: 'Enter Marks', color: 'bg-signal-green' },
    { to: '/admin/manage-students', icon: Users, label: 'Manage Students', color: 'bg-blue-600' },
    { to: '/admin/manage-courses', icon: BookOpen, label: 'Manage Courses', color: 'bg-purple-600' },
    { to: '/admin/manage-assignments', icon: FileText, label: 'Assignments', color: 'bg-orange-600' },
    { to: '/admin/manage-inquiries', icon: MessageSquare, label: 'Inquiries', color: 'bg-green-600' },
    { to: '/admin/manage-gallery', icon: Image, label: 'Gallery', color: 'bg-pink-600' },
    { to: '/admin/manage-achievements', icon: Award, label: 'Achievements', color: 'bg-yellow-600' },
    { to: '/admin/manage-settings', icon: Settings, label: 'Settings', color: 'bg-gray-600' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-12"><LoadingState message="Loading dashboard..." /></main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-navy">Admin Dashboard</h1>
              <p className="text-cadet">Welcome back, {profile?.full_name || 'Admin'}</p>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 border border-gray-300 text-cadet rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-khaki" />
                <h3 className="font-semibold text-cadet">Total Students</h3>
              </div>
              <p className="text-3xl font-bold text-navy">{stats.totalStudents}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="h-5 w-5 text-khaki" />
                <h3 className="font-semibold text-cadet">New Inquiries Today</h3>
              </div>
              <p className="text-3xl font-bold text-navy">{stats.newInquiriesToday}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-khaki" />
                <h3 className="font-semibold text-cadet">Pending Fees</h3>
              </div>
              <p className="text-3xl font-bold text-navy">{stats.pendingFees}</p>
            </div>

            <Link
              to="/admin/enter-marks"
              className="bg-khaki rounded-xl shadow-sm p-6 flex flex-col justify-center hover:bg-yellow-600 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <PlusCircle className="h-5 w-5 text-navy" />
                <h3 className="font-semibold text-navy">Quick Action</h3>
              </div>
              <p className="text-navy font-bold">Enter Marks →</p>
            </Link>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow group"
              >
                <div className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-navy group-hover:text-khaki transition-colors">
                  {item.label}
                </h3>
              </Link>
            ))}
          </div>

          {/* Recent Inquiries */}
          <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy">Recent Inquiries</h2>
              <Link to="/admin/manage-inquiries" className="text-khaki font-medium hover:underline text-sm">
                View All →
              </Link>
            </div>
            {stats.recentInquiries.length === 0 ? (
              <p className="text-cadet text-sm">No new inquiries today</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-cadet">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-cadet">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold text-cadet">Target Exam</th>
                      <th className="text-left py-3 px-4 font-semibold text-cadet">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentInquiries.map((inq) => (
                      <tr key={inq.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-navy">{inq.name}</td>
                        <td className="py-3 px-4 text-cadet">+91 {inq.phone}</td>
                        <td className="py-3 px-4 text-navy">{inq.target_exam}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            inq.status === 'New' ? 'bg-green-100 text-green-800' :
                            inq.status === 'Contacted' ? 'bg-blue-100 text-blue-800' :
                            inq.status === 'Enrolled' ? 'bg-khaki text-navy' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {inq.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
