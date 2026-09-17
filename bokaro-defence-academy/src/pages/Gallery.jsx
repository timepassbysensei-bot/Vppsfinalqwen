import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import { Image } from 'lucide-react'

const CATEGORIES = ['All', 'Ground Physical', 'Classroom & Library', 'Hostel & Mess']

export default function Gallery() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setImages(data || [])
    } catch (error) {
      console.error('Error fetching gallery:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredImages = filter === 'All' 
    ? images 
    : images.filter(img => img.category === filter)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-navy mb-4">Gallery</h1>
            <p className="text-cadet text-lg max-w-3xl mx-auto">
              A glimpse into life at Bokaro Defence Academy
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

          {/* Gallery Grid */}
          {loading ? (
            <LoadingState message="Loading gallery..." />
          ) : filteredImages.length === 0 ? (
            <EmptyState 
              title="No images found" 
              description="Check back later for new photos"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredImages.map((img) => (
                <div key={img.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gray-200 relative">
                    <img
                      src={img.image_url}
                      alt={img.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-medium text-khaki uppercase tracking-wide">
                      {img.category}
                    </span>
                    <h3 className="text-lg font-bold text-navy mt-1">{img.title}</h3>
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
