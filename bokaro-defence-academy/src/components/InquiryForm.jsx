import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CheckCircle, X, AlertCircle } from 'lucide-react'

export default function InquiryForm({ preselectedExam = null, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    target_exam: preselectedExam || 'Agniveer GD',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const examOptions = [
    'Agniveer GD',
    'SSC GD',
    'NDA',
    'Jharkhand Police',
  ]

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length >= 10 && cleaned.length <= 15
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Please enter your name')
      return
    }

    if (!validatePhone(formData.phone)) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('inquiries')
        .insert([
          {
            name: formData.name.trim(),
            phone: formData.phone.replace(/\D/g, ''),
            target_exam: formData.target_exam,
            message: formData.message.trim(),
            status: 'New',
          },
        ])

      if (error) throw error

      setSubmitted(true)
      setFormData({ name: '', phone: '', target_exam: preselectedExam || 'Agniveer GD', message: '' })
      
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Error submitting inquiry:', err)
      setError('Failed to submit. Please call us directly at +91 95259 73090')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-xl p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-green-800 mb-2">Thank You!</h3>
        <p className="text-green-700 mb-6">
          Your inquiry has been received. Manish Sir or our team will contact you within 24 hours.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="bg-navy text-white px-6 py-3 rounded-lg font-medium hover:bg-cadet transition-colors"
        >
          Submit Another Inquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-cadet mb-1">
          Full Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter your full name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
          required
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-cadet mb-1">
          Mobile Number *
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Enter 10-digit mobile number"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
          required
          maxLength={15}
        />
      </div>

      <div>
        <label htmlFor="target_exam" className="block text-sm font-medium text-cadet mb-1">
          Target Exam *
        </label>
        <select
          id="target_exam"
          value={formData.target_exam}
          onChange={(e) => setFormData({ ...formData, target_exam: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
        >
          {examOptions.map((exam) => (
            <option key={exam} value={exam}>
              {exam}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-cadet mb-1">
          Message (Optional)
        </label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Any specific questions or requirements?"
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-khaki text-navy font-bold py-4 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Submit Inquiry'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        By submitting, you agree to be contacted by Bokaro Defence Academy
      </p>
    </form>
  )
}
