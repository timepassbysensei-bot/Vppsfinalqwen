import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import { Filter } from 'lucide-react'

const CATEGORIES = ['All', 'Armed Forces', 'Paramilitary', 'State Police']

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = filter === 'All' 
    ? courses 
    : courses.filter(c => c.category === filter)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-navy mb-4">Our Courses</h1>
            <p className="text-cadet text-lg max-w-3xl mx-auto">
              Comprehensive preparation programs for various defence and police examinations
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === cat
                    ? 'bg-khaki text-navy'
                    : 'bg-white text-cadet hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Course Grid */}
          {loading ? (
            <LoadingState message="Loading courses..." />
          ) : filteredCourses.length === 0 ? (
            <EmptyState 
              title="No courses found" 
              description="Check back later for new courses"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        course.category === 'Armed Forces' ? 'bg-blue-100 text-blue-800' :
                        course.category === 'Paramilitary' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {course.category}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-navy mb-2">{course.title}</h3>
                    <p className="text-cadet text-sm mb-4 line-clamp-3">{course.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-cadet">Duration:</span>
                        <span className="text-navy">{course.duration}</span>
                      </div>
                      {course.fee_info && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-cadet">Fee:</span>
                          <span className="text-navy">{course.fee_info}</span>
                        </div>
                      )}
                    </div>

                    {course.features && course.features.length > 0 && (
                      <ul className="space-y-1 mb-4">
                        {course.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="text-sm text-cadet flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-khaki rounded-full"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    <a
                      href="/#inquiry"
                      className="block w-full bg-navy text-white text-center py-3 rounded-lg font-medium hover:bg-cadet transition-colors"
                    >
                      Enquire Now
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
