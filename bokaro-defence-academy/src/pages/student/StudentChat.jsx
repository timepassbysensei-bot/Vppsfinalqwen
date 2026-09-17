import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import LoadingState from '../../components/LoadingState'
import { Send, ArrowLeft } from 'lucide-react'

export default function StudentChat() {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (user) {
      fetchMessages()
      
      // Subscribe to new messages
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `student_id=eq.${user.id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new])
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Mark as read
      const unreadIds = data.filter(m => !m.is_read && m.sender_role === 'admin').map(m => m.id)
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds)
      }
      
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    setSending(true)
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            student_id: user.id,
            sender_role: 'student',
            message_text: input.trim(),
            is_read: false,
          },
        ])

      if (error) throw error
      
      setInput('')
      fetchMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-12"><LoadingState message="Loading messages..." /></main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      
      <main className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '600px' }}>
            {/* Header */}
            <div className="bg-navy text-white p-4">
              <div className="flex items-center gap-3">
                <Link
                  to="/student-dashboard"
                  className="p-2 hover:bg-cadet rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="font-bold text-lg">Message Manish Sir</h1>
                  <p className="text-xs text-khaki">Online • Bokaro Defence Academy</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-cadet">No messages yet</p>
                  <p className="text-sm text-gray-500 mt-2">Send a message to Manish Sir</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_role === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.sender_role === 'student'
                          ? 'bg-khaki text-navy'
                          : 'bg-white text-cadet border border-gray-200'
                      }`}
                    >
                      <p className="text-sm">{msg.message_text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_role === 'student' ? 'text-navy/70' : 'text-gray-400'
                      }`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-khaki focus:border-transparent"
                  disabled={sending}
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="px-4 py-3 bg-signal-green text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
