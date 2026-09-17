import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Share2 } from 'lucide-react'
import { checkEligibility, generateWhatsAppMessage, EXAMS, GENDERS } from '../lib/eligibilityRules'

export default function EligibilityChecker() {
  const [formData, setFormData] = useState({
    dob: '',
    gender: '',
    height: '',
    targetExam: EXAMS.AGNIVEER_GD,
  })
  const [result, setResult] = useState(null)
  const [checked, setChecked] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.dob || !formData.gender || !formData.height) {
      alert('Please fill in all fields')
      return
    }

    const eligibilityResult = checkEligibility({
      dob: formData.dob,
      gender: formData.gender,
      height: parseFloat(formData.height),
      targetExam: formData.targetExam,
    })

    setResult(eligibilityResult)
    setChecked(true)
  }

  const handleShareWhatsApp = () => {
    if (!result) return
    
    const message = generateWhatsAppMessage(result, formData.targetExam)
    const whatsappNumber = '919525973090' // Manish Sir's number
    const url = `https://wa.me/${whatsappNumber}?text=${message}`
    
    window.open(url, '_blank')
  }

  const resetForm = () => {
    setFormData({
      dob: '',
      gender: '',
      height: '',
      targetExam: EXAMS.AGNIVEER_GD,
    })
    setResult(null)
    setChecked(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <h2 className="text-2xl font-bold text-navy mb-2">Check Your Eligibility</h2>
      <p className="text-cadet mb-6">Find out if you meet the basic requirements for defence services</p>

      {!checked ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-cadet mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              id="dob"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-cadet mb-1">
              Gender *
            </label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
              required
            >
              <option value="">Select Gender</option>
              <option value={GENDERS.MALE}>{GENDERS.MALE}</option>
              <option value={GENDERS.FEMALE}>{GENDERS.FEMALE}</option>
            </select>
          </div>

          <div>
            <label htmlFor="height" className="block text-sm font-medium text-cadet mb-1">
              Height (cm) *
            </label>
            <input
              type="number"
              id="height"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              placeholder="e.g., 165"
              min="100"
              max="250"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="targetExam" className="block text-sm font-medium text-cadet mb-1">
              Target Exam *
            </label>
            <select
              id="targetExam"
              value={formData.targetExam}
              onChange={(e) => setFormData({ ...formData, targetExam: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
            >
              {Object.values(EXAMS).map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-khaki text-navy font-bold py-4 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Check Eligibility
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {result.valid ? (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <h3 className="text-xl font-bold text-green-800">You're Eligible!</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-green-700">Age:</p>
                  <p className="font-semibold text-green-900">{result.ageExact} years</p>
                </div>
                <div>
                  <p className="text-green-700">Height:</p>
                  <p className="font-semibold text-green-900">{result.heightEntered} cm ✓</p>
                </div>
                <div>
                  <p className="text-green-700">Required Age:</p>
                  <p className="font-semibold text-green-900">{result.ageRange}</p>
                </div>
                <div>
                  <p className="text-green-700">Min Height:</p>
                  <p className="font-semibold text-green-900">{result.heightRequired} cm</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
                <h3 className="text-xl font-bold text-red-800">Eligibility Concerns</h3>
              </div>
              <ul className="space-y-2 mb-4">
                {result.errors.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
              {result.age && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-red-700">Your Age:</p>
                    <p className="font-semibold text-red-900">{result.ageExact} years</p>
                  </div>
                  <div>
                    <p className="text-red-700">Required:</p>
                    <p className="font-semibold text-red-900">{result.ageRange}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 italic">
              ⚠️ {result.disclaimer}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 bg-signal-green text-white font-medium py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="h-5 w-5" />
              Share on WhatsApp
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-3 border-2 border-navy text-navy font-medium rounded-lg hover:bg-navy hover:text-white transition-colors"
            >
              Check Again
            </button>
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-cadet mb-2">Ready to start your preparation?</p>
            <a
              href="tel:+919525973090"
              className="inline-block bg-khaki text-navy font-bold px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Call Manish Sir: +91 95259 73090
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
