import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Phone, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar({ onOpenChat }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [settings, setSettings] = useState(null)
  const location = useLocation()

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['phone_primary', 'whatsapp_number'])
      
      if (data) {
        const settingsObj = {}
        data.forEach(row => {
          settingsObj[row.key] = row.value
        })
        setSettings(settingsObj)
      }
    }

    fetchSettings()
  }, [])

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/courses', label: 'Courses' },
    { to: '/gallery', label: 'Gallery' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-navy text-white sticky top-0 z-40 shadow-lg">
      {/* Notice Ticker */}
      <NoticeTicker />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-khaki rounded-lg flex items-center justify-center">
              <span className="text-navy font-bold text-lg md:text-xl">BDA</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg md:text-xl leading-tight">Bokaro Defence Academy</h1>
              <p className="text-xs text-gray-300">Forging Tomorrow's Warriors</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-medium transition-colors ${
                  isActive(link.to) ? 'text-khaki' : 'text-white hover:text-khaki'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {settings?.phone_primary && (
              <a
                href={`tel:+91${settings.phone_primary.replace(/\D/g, '')}`}
                className="flex items-center gap-2 bg-signal-green px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Call Now
              </a>
            )}

            <Link
              to="/student-login"
              className="bg-khaki text-navy px-5 py-2 rounded-lg font-bold hover:bg-yellow-600 transition-colors"
            >
              Student Login
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-cadet transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-cadet border-t border-gray-700 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium ${
                    isActive(link.to) ? 'bg-khaki text-navy' : 'text-white hover:bg-navy'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              {settings?.phone_primary && (
                <a
                  href={`tel:+91${settings.phone_primary.replace(/\D/g, '')}`}
                  className="flex items-center gap-2 bg-signal-green px-4 py-3 rounded-lg font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Phone className="h-5 w-5" />
                  Call: +91 {settings.phone_primary}
                </a>
              )}

              {settings?.whatsapp_number && (
                <a
                  href={`https://wa.me/91${settings.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-600 px-4 py-3 rounded-lg font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp Us
                </a>
              )}

              <Link
                to="/student-login"
                onClick={() => setMobileMenuOpen(false)}
                className="block bg-khaki text-navy px-4 py-3 rounded-lg font-bold text-center"
              >
                Student Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

// Notice Ticker Component
function NoticeTicker() {
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const fetchNotice = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'notice_ticker')
        .single()
      
      if (data?.value) {
        setNotice(data.value)
      }
    }

    fetchNotice()
  }, [])

  if (!notice) return null

  return (
    <div className="bg-khaki text-navy py-2 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap">
        <span className="mx-4 font-medium">📢 {notice}</span>
        <span className="mx-4 font-medium">📢 {notice}</span>
        <span className="mx-4 font-medium">📢 {notice}</span>
      </div>
    </div>
  )
}
