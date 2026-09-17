import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react'

export default function ManageCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/admin-dashboard" className="inline-flex items-center gap-2 text-cadet hover:text-navy mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-navy mb-6">Manage Courses</h1>
          {loading ? <LoadingState /> : courses.length === 0 ? <EmptyState title="No courses" /> : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-navy text-white">
                  <tr>
                    <th className="text-left py-4 px-4">Title</th>
                    <th className="text-left py-4 px-4">Category</th>
                    <th className="text-left py-4 px-4">Status</th>
                    <th className="text-left py-4 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, idx) => (
                    <tr key={c.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-3 px-4">{c.title}</td>
                      <td className="py-3 px-4">{c.category}</td>
                      <td className="py-3 px-4">{c.is_active ? 'Active' : 'Archived'}</td>
                      <td className="py-3 px-4"><button className="text-khaki">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
