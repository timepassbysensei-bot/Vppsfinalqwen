import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import LoadingState from '../../components/LoadingState'
import { ArrowLeft, Save, User } from 'lucide-react'

const RECORD_TYPES = ['Written Mock', '1600m Running', 'Physical Standard']
const BATCHES = ['Agniveer GD', 'SSC GD', 'NDA', 'Jharkhand Police']

export default function EnterMarks() {
  const [batch, setBatch] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [recordType, setRecordType] = useState('Written Mock')
  const [eventTitle, setEventTitle] = useState('')
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [existingRecords, setExistingRecords] = useState([])

  useEffect(() => {
    if (batch) {
      fetchStudents()
    }
  }, [batch])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, enrolled_batch')
        .eq('role', 'student')
        .eq('enrolled_batch', batch)
        .order('full_name')

      if (error) throw error
      setStudents(data || [])
      setMarks({})
      setExistingRecords([])
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkExistingRecords = async () => {
    if (!students.length || !date || !recordType || !eventTitle) return
    
    const studentIds = students.map(s => s.id)
    
    try {
      const { data, error } = await supabase
        .from('performance_records')
        .select('*')
        .in('student_id', studentIds)
        .eq('record_date', date)
        .eq('record_type', recordType)
        .eq('subject_or_event', eventTitle)

      if (error) throw error
      setExistingRecords(data || [])
    } catch (error) {
      console.error('Error checking existing records:', error)
    }
  }

  useEffect(() => {
    if (students.length > 0 && date && recordType && eventTitle) {
      checkExistingRecords()
    }
  }, [date, recordType, eventTitle])

  const handleMarkChange = (studentId, field, value) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }))
  }

  const getPlaceholder = () => {
    switch (recordType) {
      case '1600m Running':
        return '5 min 32 sec'
      case 'Written Mock':
        return '45/50'
      case 'Physical Standard':
        return '10 pull-ups'
      default:
        return 'Score'
    }
  }

  const handleSaveAll = async () => {
    if (!batch || !date || !recordType || !eventTitle) {
      alert('Please fill in all required fields')
      return
    }

    if (existingRecords.length > 0) {
      const confirmed = window.confirm(
        `${existingRecords.length} matching record(s) already exist. Do you want to update them?`
      )
      if (!confirmed) return
    }

    const entriesToSave = students
      .filter(s => marks[s.id]?.score?.trim())
      .map(s => ({
        student_id: s.id,
        record_date: date,
        record_type: recordType,
        subject_or_event: eventTitle,
        score_obtained: marks[s.id].score.trim(),
        remarks: marks[s.id]?.remarks?.trim() || null,
      }))

    if (entriesToSave.length === 0) {
      alert('Please enter at least one score')
      return
    }

    setSaving(true)
    try {
      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from('performance_records')
        .upsert(entriesToSave, {
          onConflict: 'student_id,record_date,record_type,subject_or_event',
        })

      if (error) throw error
      
      alert(`Successfully saved ${entriesToSave.length} record(s)!`)
      setMarks({})
      setExistingRecords([])
      setEventTitle('')
    } catch (error) {
      console.error('Error saving marks:', error)
      alert('Failed to save marks. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const openStudentHistory = async (studentId, studentName) => {
    try {
      const { data, error } = await supabase
        .from('performance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('record_date', { ascending: false })
        .limit(20)

      if (error) throw error

      const historyText = data
        .map(r => `${r.record_date}: ${r.record_type} - ${r.subject_or_event} = ${r.score_obtained}${r.remarks ? ` (${r.remarks})` : ''}`)
        .join('\n')

      alert(`${studentName}\n\nRecent Performance:\n${historyText || 'No records yet'}`)
    } catch (error) {
      console.error('Error fetching history:', error)
      alert('Unable to load history')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/admin-dashboard"
              className="inline-flex items-center gap-2 text-cadet hover:text-navy mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-navy">Enter Marks</h1>
            <p className="text-cadet">Record test results for your batch</p>
          </div>

          {/* Form Controls */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-cadet mb-1">Batch *</label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
                >
                  <option value="">Select Batch</option>
                  {BATCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cadet mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cadet mb-1">Record Type *</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
                >
                  {RECORD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cadet mb-1">Test/Event Title *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g., Weekly Mock #4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
                />
              </div>
            </div>

            {existingRecords.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 text-sm">
                  ⚠️ {existingRecords.length} existing record(s) found for this date and event. They will be updated.
                </p>
              </div>
            )}
          </div>

          {/* Student Roster */}
          {loading ? (
            <LoadingState message="Loading students..." />
          ) : students.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <p className="text-cadet">Select a batch to view students</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-navy text-white">
                    <tr>
                      <th className="text-left py-4 px-4 font-semibold">Student</th>
                      <th className="text-left py-4 px-4 font-semibold">Score</th>
                      <th className="text-left py-4 px-4 font-semibold">Remarks</th>
                      <th className="text-left py-4 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => (
                      <tr key={student.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-khaki rounded-full flex items-center justify-center text-navy font-bold">
                              {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-navy">{student.full_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="text"
                            value={marks[student.id]?.score || ''}
                            onChange={(e) => handleMarkChange(student.id, 'score', e.target.value)}
                            placeholder={getPlaceholder()}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="text"
                            value={marks[student.id]?.remarks || ''}
                            onChange={(e) => handleMarkChange(student.id, 'remarks', e.target.value)}
                            placeholder="Optional notes"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => openStudentHistory(student.id, student.full_name)}
                            className="text-khaki hover:text-navy font-medium text-sm"
                          >
                            View History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 mb-6">
                {students.map((student) => (
                  <div key={student.id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-khaki rounded-full flex items-center justify-center text-navy font-bold">
                        {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-navy">{student.full_name}</h3>
                        <button
                          onClick={() => openStudentHistory(student.id, student.full_name)}
                          className="text-khaki hover:text-navy font-medium text-sm"
                        >
                          View History →
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-cadet mb-1">Score *</label>
                        <input
                          type="text"
                          value={marks[student.id]?.score || ''}
                          onChange={(e) => handleMarkChange(student.id, 'score', e.target.value)}
                          placeholder={getPlaceholder()}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-cadet mb-1">Remarks</label>
                        <input
                          type="text"
                          value={marks[student.id]?.remarks || ''}
                          onChange={(e) => handleMarkChange(student.id, 'remarks', e.target.value)}
                          placeholder="Optional"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-khaki focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="bg-white rounded-xl shadow-sm p-6 sticky bottom-4">
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="w-full bg-signal-green text-white font-bold py-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Saving...' : 'Save All Marks in 1 Click'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
