import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Youtube, Instagram, Facebook, MapPin, Phone, Mail, MessageCircle } from 'lucide-react'

export default function Footer() {
  const [settings, setSettings] = useState({})

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
      
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

  const socialLinks = [
    { 
      key: 'youtube_url', 
      icon: Youtube, 
      label: 'YouTube',
      default: '#'
    },
    { 
      key: 'instagram_url', 
      icon: Instagram, 
      label: 'Instagram',
      default: '#'
    },
    { 
      key: 'facebook_url', 
      icon: Facebook, 
      label: 'Facebook',
      default: '#'
    },
    { 
      key: 'whatsapp_number', 
      icon: MessageCircle, 
      label: 'WhatsApp',
      prefix: 'https://wa.me/91',
      default: '#'
    },
  ]

  const googleMapsUrl = settings.address 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`
    : '#'

  return (
    <footer className="bg-navy text-white pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Academy Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-khaki rounded-lg flex items-center justify-center">
                <span className="text-navy font-bold text-xl">BDA</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Bokaro Defence Academy</h3>
                <p className="text-xs text-gray-300">Forging Tomorrow's Warriors</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Premier defence coaching academy in Bokaro Steel City. Disciplined training for Agniveer, SSC GD, NDA, and Police aspirants.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-khaki">Contact Us</h4>
            <div className="space-y-3">
              {settings.phone_primary && (
                <a 
                  href={`tel:+91${settings.phone_primary.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 text-sm hover:text-khaki transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  +91 {settings.phone_primary}
                </a>
              )}
              {settings.phone_secondary && (
                <a 
                  href={`tel:+91${settings.phone_secondary.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 text-sm hover:text-khaki transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  +91 {settings.phone_secondary}
                </a>
              )}
              {settings.email && (
                <a 
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-3 text-sm hover:text-khaki transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {settings.email}
                </a>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-khaki">Visit Us</h4>
            {settings.address && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-sm hover:text-khaki transition-colors group"
              >
                <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="group-hover:underline">{settings.address}</span>
              </a>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Near RN Sharma Building (Scope Classes building), Chas
            </p>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-khaki">Follow Us</h4>
            <div className="flex gap-3 flex-wrap">
              {socialLinks.map((social) => {
                const Icon = social.icon
                const url = social.prefix 
                  ? `${social.prefix}${(settings[social.key] || '').replace(/\D/g, '')}`
                  : (settings[social.key] || social.default)
                
                return (
                  <a
                    key={social.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-cadet rounded-lg flex items-center justify-center hover:bg-khaki hover:text-navy transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Bokaro Defence Academy. All rights reserved.</p>
          <p className="mt-2 text-xs">
            Director: Manish Sir | Gujarat Colony, Chas, Bokaro Steel City, Jharkhand - 827013
          </p>
        </div>
      </div>
    </footer>
  )
}
