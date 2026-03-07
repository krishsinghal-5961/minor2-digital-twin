import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import { CheckCircle, Upload, Camera, X } from 'lucide-react'

// Goal-adaptive fields based on notebook goal_alignment logic
const baseFields = [
  { key:'sleep_hours_day',   label:'Sleep Hours / day',      min:0, max:12,  step:0.5, hint:'Average sleep per night this period' },
  { key:'screen_time_day',   label:'Screen Time / day',      min:0, max:16,  step:0.5, hint:'Non-study screen time (hrs)' },
  { key:'attendance_pct',    label:'Attendance %',           min:0, max:100, step:1,   hint:'This period\'s attendance' },
  { key:'deadline_count',    label:'Deadlines this period',  min:0, max:15,  step:1,   hint:'Assignments, tests, submissions due' },
  { key:'late_night_ratio',  label:'Late Night Study Ratio', min:0, max:1,   step:0.1, hint:'0 = never, 1 = always (after midnight)' },
  { key:'study_sessions',    label:'Study Sessions / day',   min:0, max:10,  step:1,   hint:'Number of distinct study sessions' },
  { key:'extra_hours',       label:'Extra-curricular Hours', min:0, max:10,  step:0.5, hint:'Clubs, sports, activities per day' },
]

// Goal-adaptive: CGPA goal → show per-subject effort; Balance → simpler
const goalAdaptiveFields = {
  cgpa_improvement: [
    { key:'study_hours_day', label:'Study Hours / day',        min:0, max:18, step:0.5, hint:'Total focused study time' },
    { key:'subject_split',   label:'Effort Distribution',      type:'select',
      options:['Balanced','Heavy on core subjects','Mixed — core + electives','Elective focused'],
      hint:'How are you splitting effort across subjects?' },
  ],
  workload_balance: [
    { key:'study_hours_day', label:'Total Study Hours / day',  min:0, max:18, step:0.5, hint:'Total study time' },
  ],
  placement_prep: [
    { key:'study_hours_day', label:'Total Study + Prep Hours', min:0, max:18, step:0.5, hint:'Academic + placement preparation combined' },
  ],
  skill_building: [
    { key:'study_hours_day', label:'Skill Practice Hours / day',min:0,max:18, step:0.5, hint:'Includes projects, practice, self-learning' },
  ],
}

export default function LogEntry() {
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const goal         = user?.goal || 'cgpa_improvement'
  const adaptFields  = goalAdaptiveFields[goal] || goalAdaptiveFields.cgpa_improvement

  const [form, setForm] = useState({
    study_hours_day:5, sleep_hours_day:7, screen_time_day:3,
    attendance_pct:80, deadline_count:2, late_night_ratio:0.2,
    study_sessions:3, extra_hours:1, notes:'', subject_split:'Balanced'
  })
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(null)
  const [error, setError]         = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [parsing, setParsing]     = useState(false)

  // Screenshot handler — in mock mode just auto-fills a plausible screen time
  const handleScreenshot = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScreenshot(file.name)
    setParsing(true)
    // Mock: simulate AI parsing
    await new Promise(r => setTimeout(r, 1200))
    const mockParsed = +(1.5 + Math.random()*3).toFixed(1)
    setForm(f => ({...f, screen_time_day: mockParsed}))
    setParsing(false)
  }

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.log(form)
      setSuccess(res)
    } catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const goalLabel = {
    cgpa_improvement:'CGPA Improvement', workload_balance:'Workload Balance',
    placement_prep:'Placement Prep', skill_building:'Skill Building'
  }[goal]

  if (success) return (
    <div className="max-w-lg mx-auto text-center py-20 animate-fade-up" style={{animationFillMode:'both',opacity:0}}>
      <div className="w-16 h-16 rounded-2xl bg-risk-low/10 flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={28} className="text-risk-low"/>
      </div>
      <h2 className="font-display font-bold text-2xl text-paper mb-3">Log saved!</h2>
      <p className="text-paper/40 mb-2 font-body">Your digital twin has been updated.</p>
      {success.predictions && (
        <div className="card mt-6 text-left space-y-2">
          <p className="section-label mb-3">Instant predictions</p>
          {[
            ['Performance',  success.predictions.performance_score?.toFixed(1)],
            ['Pressure',     success.predictions.pressure_label],
            ['Alignment',    success.predictions.fuzzy_alignment_label],
            ['Archetype',    success.predictions.cluster_label],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between text-sm font-mono">
              <span className="text-paper/50">{k}</span>
              <span className="text-paper">{v}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3 justify-center mt-8">
        <button onClick={() => navigate('/app')} className="btn-primary">Go to Dashboard</button>
        <button onClick={() => { setSuccess(null) }} className="btn-ghost">Log another</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <p className="section-label">Log Entry</p>
        <h1 className="font-display font-bold text-3xl text-paper">Update Your Twin</h1>
        <p className="text-paper/40 text-sm font-body mt-1">
          Log whenever you're comfortable — no fixed schedule required.
        </p>
      </div>

      {/* Goal-adaptive banner */}
      <div className="bg-accent/5 border border-accent/15 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent shrink-0"/>
        <p className="text-accent/80 text-sm font-body">
          Form adapted for your goal: <span className="font-semibold">{goalLabel}</span>
        </p>
      </div>

      {error && (
        <div className="bg-risk-high/10 border border-risk-high/20 rounded-xl px-4 py-3">
          <p className="text-risk-high text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handle} className="space-y-6">
        {/* Goal-adaptive fields */}
        <div className="card space-y-5">
          <p className="section-label">Goal-Specific Inputs</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {adaptFields.map(f => (
              <div key={f.key}>
                <label className="section-label block mb-1.5">{f.label}</label>
                {f.type === 'select' ? (
                  <select className="input-field" value={form[f.key]}
                    onChange={e => setForm(frm => ({...frm, [f.key]: e.target.value}))}>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type="number" min={f.min} max={f.max} step={f.step}
                    value={form[f.key]}
                    onChange={e => setForm(frm => ({...frm, [f.key]: parseFloat(e.target.value)||0}))}
                    className="input-field" required/>
                )}
                <p className="text-paper/25 text-xs font-body mt-1">{f.hint}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Screen time with screenshot upload */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="section-label">Screen Time</p>
            <label className="flex items-center gap-1.5 text-xs font-mono text-accent/70 hover:text-accent cursor-pointer transition-colors">
              <Camera size={12}/>
              {parsing ? 'Parsing...' : screenshot ? screenshot : 'Upload screenshot'}
              <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot}/>
            </label>
          </div>
          {screenshot && !parsing && (
            <div className="flex items-center gap-2 bg-risk-low/5 border border-risk-low/20 rounded-lg px-3 py-2">
              <CheckCircle size={12} className="text-risk-low"/>
              <p className="text-risk-low text-xs font-mono">Screen time auto-filled from screenshot: {form.screen_time_day}h</p>
              <button type="button" onClick={() => setScreenshot(null)} className="ml-auto text-paper/30 hover:text-paper/60">
                <X size={12}/>
              </button>
            </div>
          )}
          {parsing && (
            <div className="flex items-center gap-2 text-paper/40 text-xs font-mono">
              <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin"/>
              AI reading your Digital Wellbeing screenshot...
            </div>
          )}
          <div>
            <label className="section-label block mb-1.5">Screen Time / day (hrs)</label>
            <input type="number" min={0} max={16} step={0.5}
              value={form.screen_time_day}
              onChange={e => setForm(f => ({...f, screen_time_day: parseFloat(e.target.value)||0}))}
              className="input-field" required/>
            <p className="text-paper/25 text-xs font-body mt-1">
              Upload your Digital Wellbeing or Screen Time screenshot for auto-fill
            </p>
          </div>
        </div>

        {/* Base fields */}
        <div className="card space-y-5">
          <p className="section-label">Other Inputs</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {baseFields.filter(f => f.key !== 'screen_time_day').map(f => (
              <div key={f.key}>
                <label className="section-label block mb-1.5">{f.label}</label>
                <input type="number" min={f.min} max={f.max} step={f.step}
                  value={form[f.key]}
                  onChange={e => setForm(frm => ({...frm, [f.key]: parseFloat(e.target.value)||0}))}
                  className="input-field" required/>
                <p className="text-paper/25 text-xs font-body mt-1">{f.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <label className="section-label block mb-1.5">Notes (optional)</label>
          <textarea value={form.notes}
            onChange={e => setForm(f => ({...f, notes: e.target.value}))}
            placeholder="Anything notable — exams, events, illness..."
            className="input-field resize-none h-20"/>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'Saving...' : 'Save & predict'}
        </button>
      </form>

      <p className="text-paper/20 text-xs font-mono text-center">
        The user updates an academic snapshot, not a diary.
      </p>
    </div>
  )
}
