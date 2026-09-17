import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X, MessageCircle, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AIChatModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Namaste! I'm the AI Front-Desk Receptionist of Bokaro Defence Academy. How can I help you with your defence career preparation today?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setError(null)

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-5),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.response || data.message }])
    } catch (err) {
      console.error('Chat error:', err)
      setError('Unable to connect right now. Please call us at +91 95259 73090.')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I apologize, but I\'m having trouble connecting. Please contact Manish Sir directly at +91 95259 73090 for immediate assistance.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[600px]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-navy text-white">
            <div>
              <h3 className="font-semibold text-lg">Bokaro Defence Academy</h3>
              <p className="text-xs text-khaki">AI Assistant • Online</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-cadet rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-khaki text-navy'
                      : 'bg-white text-cadet border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about courses, eligibility, admissions..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-khaki focus:border-transparent"
                disabled={loading}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-3 bg-signal-green text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              For admissions, call Manish Sir: +91 95259 73090
            </p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
