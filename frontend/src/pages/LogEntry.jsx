import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import { CheckCircle, Camera, X } from 'lucide-react'

const BASE_FIELDS = [
  { key:'sleep_hours_day',  label:'Sleep Hours / day',      min:0,   max:12,  step:0.5, hint:'Average sleep per night this period' },
  { key:'attendance_pct',   label:'Attendance %',           min:0,   max:100, step:1,   hint:"This period's attendance" },
  { key:'deadline_count',   label:'Deadlines this period',  min:0,   max:15,  step:1,   hint:'Assignments, tests, submissions due' },
  { key:'late_night_ratio', label:'Late Night Study Ratio', min:0,   max:1,   step:0.1, hint:'0 = never, 1 = always (after midnight)' },
  { key:'study_sessions',   label:'Study Sessions / day',   min:0,   max:10,  step:1,   hint:'Number of distinct study sessions' },
  { key:'extra_hours',      label:'Extra-curricular Hours', min:0,   max:10,  step:0.5, hint:'Clubs, sports, activities per day' },
]

const GOAL_FIELDS = {
  cgpa_improvement: [
    { key:'study_hours_day', label:'Study Hours / day',         min:0, max:18, step:0.5, hint:'Total focused study time' },
    { key:'subject_split',   label:'Effort Distribution',       type:'select',
      options:['Balanced','Heavy on core subjects','Mixed — core + electives','Elective focused'],
      hint:'How you split effort across subjects' },
  ],
  workload_balance:  [{ key:'study_hours_day', label:'Total Study Hours / day',  min:0, max:18, step:0.5, hint:'Total study time' }],
  placement_prep:    [{ key:'study_hours_day', label:'Study + Prep Hours / day',  min:0, max:18, step:0.5, hint:'Academic + placement preparation' }],
  skill_building:    [{ key:'study_hours_day', label:'Skill Practice Hours / day',min:0, max:18, step:0.5, hint:'Projects, practice, self-learning' }],
}

const GOAL_LABELS = {
  cgpa_improvement:'CGPA Improvement', workload_balance:'Workload Balance',
  placement_prep:'Placement Prep', skill_building:'Skill Building',
}

function Field({ f, value, onChange }) {
  return (
    <div>
      <label style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.65rem',textTransform:'uppercase',
        letterSpacing:'0.08em',color:'#5B4FE8',opacity:0.7,display:'block',marginBottom:6}}>
        {f.label}
      </label>
      {f.type === 'select' ? (
        <select className="input-field" value={value} onChange={e=>onChange(e.target.value)}>
          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type="number" min={f.min} max={f.max} step={f.step}
          value={value}
          onChange={e=>onChange(parseFloat(e.target.value)||0)}
          className="input-field" required/>
      )}
      <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.72rem',color:'var(--color-muted)',marginTop:4,opacity:0.7}}>
        {f.hint}
      </p>
    </div>
  )
}

export default function LogEntry() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const goal        = user?.goal || 'cgpa_improvement'
  const adaptFields = GOAL_FIELDS[goal] || GOAL_FIELDS.cgpa_improvement

  const [form, setForm] = useState({
    study_hours_day:5, sleep_hours_day:7, screen_time_day:3,
    attendance_pct:80, deadline_count:2, late_night_ratio:0.2,
    study_sessions:3,  extra_hours:1,     notes:'', subject_split:'Balanced',
  })
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(null)
  const [error,      setError]      = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [parsing,    setParsing]    = useState(false)

  const setField = (key, val) => setForm(f => ({...f, [key]:val}))

  const handleScreenshot = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScreenshot(file.name)
    setParsing(true)
    setError('')
    try {
      const result = await api.parseScreenshot(file)
      setField('screen_time_day', result.screen_time_hours)
    } catch (err) {
      setError(err.message || 'Could not read screenshot. Please type your screen time manually.')
      setScreenshot(null)
    } finally {
      setParsing(false)
    }
  }

  const handle = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try { setSuccess(await api.log(form)) }
    catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (success) return (
    <div style={{maxWidth:480,margin:'0 auto',textAlign:'center',padding:'5rem 1rem',animation:'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards'}}>
      <div style={{width:56,height:56,borderRadius:14,background:'rgba(5,150,105,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
        <CheckCircle size={26} style={{color:'#059669'}}/>
      </div>
      <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.5rem',color:'var(--color-paper)',marginBottom:8}}>Log saved!</h2>
      <p style={{fontFamily:'DM Sans,sans-serif',color:'var(--color-muted)',marginBottom:6}}>Your digital twin has been updated.</p>

      {success.predictions && (
        <div className="card" style={{marginTop:20,textAlign:'left'}}>
          <p className="section-label" style={{marginBottom:12}}>Instant predictions</p>
          {[
            ['Performance',  success.predictions.performance_score?.toFixed(1)],
            ['Pressure',     success.predictions.pressure_label],
            ['Alignment',    success.predictions.fuzzy_alignment_label],
            ['Archetype',    success.predictions.cluster_label],
          ].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--color-border)'}}>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.75rem',color:'var(--color-muted)'}}>{k}</span>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.75rem',color:'var(--color-paper)',fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{display:'flex',gap:10,justifyContent:'center',marginTop:24}}>
        <button onClick={()=>navigate('/app')} className="btn-primary">Go to Dashboard</button>
        <button onClick={()=>setSuccess(null)} className="btn-ghost">Log another</button>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )

  return (
    <div style={{maxWidth:680,margin:'0 auto',display:'flex',flexDirection:'column',gap:20}}>
      <div>
        <p className="section-label">Log Entry</p>
        <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.75rem',color:'var(--color-paper)',marginTop:4}}>
          Update Your Twin
        </h1>
        <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'var(--color-muted)',marginTop:4}}>
          Log whenever you're comfortable — no fixed schedule required.
        </p>
      </div>

      {/* Goal banner */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,
        background:'rgba(91,79,232,0.05)',border:'1px solid rgba(91,79,232,0.15)'}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:'#5B4FE8',flexShrink:0}}/>
        <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'#5B4FE8'}}>
          Form adapted for your goal: <strong>{GOAL_LABELS[goal]}</strong>
        </p>
      </div>

      {error && (
        <div style={{padding:'10px 14px',background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8}}>
          <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'#DC2626'}}>{error}</p>
        </div>
      )}

      <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:16}}>
        {/* Goal-adaptive fields */}
        <div className="card">
          <p className="section-label" style={{marginBottom:14}}>Goal-Specific Inputs</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {adaptFields.map(f => (
              <Field key={f.key} f={f} value={form[f.key]} onChange={v=>setField(f.key,v)}/>
            ))}
          </div>
        </div>

        {/* Screen time + screenshot */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <p className="section-label" style={{marginBottom:0}}>Screen Time</p>
            <label style={{
              display:'flex',alignItems:'center',gap:6,cursor:'pointer',
              fontFamily:'JetBrains Mono,monospace',fontSize:'0.7rem',
              color:'#5B4FE8',opacity:0.8,
              padding:'4px 10px',borderRadius:7,
              border:'1px solid rgba(91,79,232,0.2)',
              background:'rgba(91,79,232,0.05)',
              transition:'opacity 0.15s',
            }}>
              <Camera size={11}/>
              {parsing ? 'Parsing...' : screenshot || 'Upload screenshot'}
              <input type="file" accept="image/*" style={{display:'none'}} onChange={handleScreenshot}/>
            </label>
          </div>

          {screenshot && !parsing && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
              background:'rgba(5,150,105,0.06)',border:'1px solid rgba(5,150,105,0.2)',
              borderRadius:8,marginBottom:12}}>\n              <CheckCircle size={12} style={{color:'#059669'}}/>
              <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.7rem',color:'#059669',flex:1}}>
                Screen time auto-filled from screenshot: <strong>{form.screen_time_day}h</strong>
              </p>
              <button type="button" onClick={()=>{setScreenshot(null); setField('screen_time_day',3)}}
                style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-muted)'}}>
                <X size={12}/>
              </button>
            </div>
          )}

          {parsing && (
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <div style={{width:12,height:12,borderRadius:'50%',border:'1.5px solid rgba(91,79,232,0.2)',borderTopColor:'#5B4FE8',animation:'spin 0.7s linear infinite'}}/>
              <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.7rem',color:'var(--color-muted)'}}>
                AI reading your Digital Wellbeing screenshot...
              </p>
            </div>
          )}

          <Field f={{key:'screen_time_day',label:'Screen Time / day (hrs)',min:0,max:16,step:0.5,
            hint:'Upload your Digital Wellbeing or Screen Time screenshot for auto-fill'}}
            value={form.screen_time_day} onChange={v=>setField('screen_time_day',v)}/>
        </div>

        {/* Base fields */}
        <div className="card">
          <p className="section-label" style={{marginBottom:14}}>Other Inputs</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {BASE_FIELDS.map(f => (
              <Field key={f.key} f={f} value={form[f.key]} onChange={v=>setField(f.key,v)}/>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <label className="section-label" style={{display:'block',marginBottom:8}}>Notes (optional)</label>
          <textarea value={form.notes} onChange={e=>setField('notes',e.target.value)}
            placeholder="Anything notable — exams, events, illness..."
            className="input-field" style={{resize:'none',height:72}}/>
        </div>

        <button type="submit" disabled={loading} className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'12px'}}>
          {loading ? 'Saving...' : 'Save & predict'}
        </button>

        <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',textAlign:'center',opacity:0.5}}>
          You're updating an academic snapshot — not a diary.
        </p>
      </form>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
