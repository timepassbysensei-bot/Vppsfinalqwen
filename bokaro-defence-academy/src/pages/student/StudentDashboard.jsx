import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'
import { MessageSquare, FileText, Download, TrendingUp, Activity, User } from 'lucide-react'

export default function StudentDashboard() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [performance, setPerformance] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchPerformance()
      fetchAssignments()
    }
  }, [profile])

  const fetchPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_records')
        .select('*')
        .eq('student_id', user.id)
        .order('record_date', { ascending: false })
        .limit(10)

      if (error) throw error
      setPerformance(data || [])
    } catch (error) {
      console.error('Error fetching performance:', error)
    }
  }

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .or(`target_batch.eq.All,target_batch.eq.${profile?.enrolled_batch || ''}`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (assignment) => {
    try {
      // Generate signed URL for private bucket
      const filePath = assignment.file_url.replace('/study_materials/', '')
      const { data, error } = await supabase.storage
        .from('study_materials')
        .createSignedUrl(filePath, 300) // 5 minutes

      if (error) throw error
      
      window.open(data.signedUrl, '_blank')
    } catch (error) {
      console.error('Error generating download URL:', error)
      alert('Unable to generate download link. Please contact admin.')
    }
  }

  const getLatestRecord = (type) => {
    return performance.find(p => p.record_type === type)
  }

  const latest1600m = getLatestRecord('1600m Running')
  const latestWritten = getLatestRecord('Written Mock')
  const latestRemarks = performance.find(p => p.remarks)?.remarks

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
          {/* Welcome Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-navy mb-1">
                  Welcome, {profile?.full_name || 'Cadet'}
                </h1>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="px-3 py-1 bg-khaki/20 text-khaki rounded-full font-medium">
                    {profile?.enrolled_batch || 'N/A'}
                  </span>
                  <span className={`px-3 py-1 rounded-full font-medium ${
                    profile?.fee_status === 'Paid' ? 'bg-green-100 text-green-800' :
                    profile?.fee_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Fee: {profile?.fee_status || 'Pending'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/student-chat"
                  className="flex items-center gap-2 px-4 py-2 bg-signal-green text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message Manish Sir
                </Link>
                <button
                  onClick={signOut}
                  className="px-4 py-2 border border-gray-300 text-cadet rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-5 w-5 text-khaki" />
                <h3 className="font-semibold text-cadet">Latest 1600m</h3>
              </div>
              {latest1600m ? (
                <p className="text-2xl font-bold text-navy">{latest1600m.score_obtained}</p>
              ) : (
                <p className="text-cadet text-sm">No record yet</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-khaki" />
                <h3 className="font-semibold text-cadet">Latest Written</h3>
              </div>
              {latestWritten ? (
                <p className="text-2xl font-bold text-navy">{latestWritten.score_obtained}</p>
              ) : (
                <p className="text-cadet text-sm">No record yet</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-khaki" />
                <h3 className="font-semibold text-cadet">Teacher Remarks</h3>
              </div>
              {latestRemarks ? (
                <p className="text-sm text-navy line-clamp-2">{latestRemarks}</p>
              ) : (
                <p className="text-cadet text-sm">No remarks yet</p>
              )}
            </div>
          </div>

          {/* Assignments */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Center
            </h2>
            {assignments.length === 0 ? (
              <EmptyState title="No assignments" description="Check back later" />
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-navy">{assignment.title}</h3>
                      <p className="text-sm text-cadet">
                        Target: {assignment.target_batch}
                        {assignment.due_date && ` • Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
                      </p>
                      {assignment.instructions && (
                        <p className="text-xs text-gray-500 mt-1">{assignment.instructions}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownload(assignment)}
                      className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-cadet transition-colors"
                    >
                      Download PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance History */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Recent Performance
            </h2>
            {performance.length === 0 ? (
              <EmptyState title="No performance records" description="Your test results will appear here" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-cadet">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-cadet">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-cadet">Event</th>
                      <th className="text-left py-3 px-4 font-semibold text-cadet">Score</th>
                      <th className="text-left py-3 px-4 font-semibold text-cadet">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-navy">
                          {new Date(record.record_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-cadet">{record.record_type}</td>
                        <td className="py-3 px-4 text-navy">{record.subject_or_event}</td>
                        <td className="py-3 px-4 font-semibold text-khaki">{record.score_obtained}</td>
                        <td className="py-3 px-4 text-cadet text-xs">{record.remarks || '-'}</td>
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
