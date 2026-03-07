import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { CheckCircle } from 'lucide-react'

const fields = [
  { key:'study_hours_day',   label:'Study Hours / day',     type:'number', min:0,   max:18,  step:0.5, hint:'Total hours spent studying' },
  { key:'sleep_hours_day',   label:'Sleep Hours / day',     type:'number', min:0,   max:12,  step:0.5, hint:'Average sleep per night' },
  { key:'screen_time_day',   label:'Screen Time / day',     type:'number', min:0,   max:16,  step:0.5, hint:'Non-study screen time (hrs)' },
  { key:'attendance_pct',    label:'Attendance %',          type:'number', min:0,   max:100, step:1,   hint:'This week\'s attendance percentage' },
  { key:'deadline_count',    label:'Deadlines This Week',   type:'number', min:0,   max:15,  step:1,   hint:'Assignments, tests, submissions due' },
  { key:'late_night_ratio',  label:'Late Night Study Ratio',type:'number', min:0,   max:1,   step:0.1, hint:'0 = never, 1 = always (after midnight)' },
  { key:'study_sessions',    label:'Study Sessions / day',  type:'number', min:0,   max:10,  step:1,   hint:'Number of distinct study sessions' },
  { key:'extra_hours',       label:'Extra-curricular Hours',type:'number', min:0,   max:10,  step:0.5, hint:'Clubs, sports, activities per day' },
]

export default function LogEntry() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    study_hours_day:5, sleep_hours_day:7, screen_time_day:3,
    attendance_pct:80, deadline_count:2, late_night_ratio:0.2,
    study_sessions:3, extra_hours:1, notes:''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError]     = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.log(form)
      setSuccess(res)
    } catch(err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  if (success) return (
    <div className="max-w-lg mx-auto text-center py-20 animate-fade-up" style={{animationFillMode:'both',opacity:0}}>
      <div className="w-16 h-16 rounded-2xl bg-risk-low/10 flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={28} className="text-risk-low" />
      </div>
      <h2 className="font-display font-bold text-2xl text-paper mb-3">Log saved!</h2>
      <p className="text-paper/40 mb-2 font-body">Your digital twin has been updated.</p>
      {success.predictions && (
        <div className="card mt-6 text-left space-y-2">
          <p className="section-label mb-3">Instant predictions</p>
          <div className="flex justify-between text-sm font-mono">
            <span className="text-paper/50">Performance</span>
            <span className="text-paper">{success.predictions.performance_score?.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-sm font-mono">
            <span className="text-paper/50">Pressure</span>
            <span className="text-paper">{success.predictions.pressure_label}</span>
          </div>
          <div className="flex justify-between text-sm font-mono">
            <span className="text-paper/50">Alignment</span>
            <span className="text-paper">{success.predictions.fuzzy_alignment_label}</span>
          </div>
        </div>
      )}
      <div className="flex gap-3 justify-center mt-8">
        <button onClick={() => navigate('/app')}       className="btn-primary">Go to Dashboard</button>
        <button onClick={() => { setSuccess(null); setForm({ study_hours_day:5, sleep_hours_day:7, screen_time_day:3, attendance_pct:80, deadline_count:2, late_night_ratio:0.2, study_sessions:3, extra_hours:1, notes:'' }) }}
          className="btn-ghost">Log another</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <p className="section-label">Log Entry</p>
        <h1 className="font-display font-bold text-3xl text-paper">Update Your Twin</h1>
        <p className="text-paper/40 text-sm font-body mt-1">
          Log whenever you're comfortable — daily, weekly, or whenever something changes.
        </p>
      </div>

      {error && (
        <div className="bg-risk-high/10 border border-risk-high/20 rounded-xl px-4 py-3">
          <p className="text-risk-high text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handle} className="card space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fields.map(f => (
            <div key={f.key}>
              <label className="section-label block mb-1.5">{f.label}</label>
              <input
                type={f.type} min={f.min} max={f.max} step={f.step}
                value={form[f.key]}
                onChange={e => setForm(frm => ({ ...frm, [f.key]: parseFloat(e.target.value) || 0 }))}
                className="input-field"
                required
              />
              <p className="text-paper/25 text-xs font-body mt-1">{f.hint}</p>
            </div>
          ))}
        </div>

        <div>
          <label className="section-label block mb-1.5">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Anything notable this week — exams, events, illness..."
            className="input-field resize-none h-24"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'Saving...' : 'Save & predict'}
        </button>
      </form>

      <p className="text-paper/20 text-xs font-mono text-center">
        You control how often you log. No fixed schedule required.
      </p>
    </div>
  )
}
