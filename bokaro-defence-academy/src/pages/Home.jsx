import { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import EligibilityChecker from '../components/EligibilityChecker'
import InquiryForm from '../components/InquiryForm'
import AIChatModal from '../components/AIChatModal'
import { motion } from 'framer-motion'
import { ChevronRight, MapPin, Users, BookOpen, Trophy, Phone, MessageCircle } from 'lucide-react'

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false)

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onOpenChat={() => setChatOpen(true)} />
      
      {/* Hero Section */}
      <section className="relative bg-navy text-white py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-cadet to-navy opacity-90"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23D4AF37" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '60px 60px'
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Forging Tomorrow's<br />
              <span className="text-khaki">Warriors in Bokaro</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Disciplined written preparation and daily physical training for defence aspirants. 
              Join Bokaro Defence Academy and transform your dream into reality.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => scrollToSection('inquiry')}
                className="bg-khaki text-navy font-bold px-8 py-4 rounded-lg hover:bg-yellow-600 transition-colors text-lg inline-flex items-center justify-center gap-2"
              >
                Book Free Ground Trial
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => scrollToSection('eligibility')}
                className="border-2 border-white text-white font-bold px-8 py-4 rounded-lg hover:bg-white hover:text-navy transition-colors text-lg"
              >
                Check Eligibility
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Facilities Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">World-Class Facilities</h2>
            <p className="text-cadet text-lg">Everything you need to succeed in defence examinations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: MapPin,
                title: '1600m Running Ground',
                description: 'Daily morning physical training at 5:00 AM',
              },
              {
                icon: BookOpen,
                title: 'Classroom & Library',
                description: 'Modern classrooms with comprehensive study material',
              },
              {
                icon: Users,
                title: 'Hostel Facility',
                description: 'Safe accommodation for outstation students',
              },
              {
                icon: Trophy,
                title: 'Mess & Diet Support',
                description: 'Nutritious meals to support physical training',
              },
            ].map((facility, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 bg-khaki rounded-lg flex items-center justify-center mb-4">
                  <facility.icon className="h-7 w-7 text-navy" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">{facility.title}</h3>
                <p className="text-cadet">{facility.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Eligibility Checker */}
      <section id="eligibility" className="py-16 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <EligibilityChecker />
        </div>
      </section>

      {/* Inquiry Form */}
      <section id="inquiry" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
                Start Your Journey Today
              </h2>
              <p className="text-cadet text-lg mb-6">
                Fill out the form and our team will get back to you within 24 hours. 
                Or call us directly for immediate assistance.
              </p>
              
              <div className="space-y-4">
                <a
                  href="tel:+919525973090"
                  className="flex items-center gap-3 text-navy font-medium hover:text-khaki transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  +91 95259 73090 (Manish Sir)
                </a>
                <a
                  href="https://wa.me/919525973090"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-navy font-medium hover:text-signal-green transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6 md:p-8">
              <InquiryForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <AIChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
