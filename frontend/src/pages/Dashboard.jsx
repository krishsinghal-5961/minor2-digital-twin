import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import RiskBadge from '../components/RiskBadge'
import ScoreGauge from '../components/ScoreGauge'
import ConfidenceNote from '../components/ConfidenceNote'
import GenAIExplanation from '../components/GenAIExplanation'
import ConsistencyCard from '../components/ConsistencyCard'
import { PlusCircle, Sliders, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const clusterDesc = {
  'Balanced & Efficient'    : 'Your habits are consistent. Effort is translating well.',
  'Extracurricular Focused' : 'Active beyond academics — monitor for burnout.',
  'Overworked & Struggling' : 'High effort, low recovery. Prioritise sleep.',
}
const clusterColor = {
  'Balanced & Efficient'    : '#059669',
  'Extracurricular Focused' : '#D97706',
  'Overworked & Struggling' : '#DC2626',
}

function TrendArrow({ logs, field }) {
  if (!logs || logs.length < 3) return null
  const last = logs.slice(-3).map(l => l[field])
  const delta = last[2] - last[0]
  if (Math.abs(delta) < 0.5) return <Minus size={11} style={{color:'var(--color-muted)'}}/>
  return delta > 0
    ? <TrendingUp  size={11} style={{color:'#059669'}}/>
    : <TrendingDown size={11} style={{color:'#DC2626'}}/>
}

function FuzzyBar({ label, score, colorFn }) {
  const pct   = Math.round(score * 100)
  const color = colorFn(score)
  return (
    <div style={{padding:'14px 16px', borderRadius:12, border:'1px solid var(--color-border)', background:'var(--color-surface)'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-muted)'}}>{label}</p>
        <span style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.75rem', fontWeight:600, color}}>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{width:`${pct}%`, background:color}}/>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user }          = useAuth()
  const navigate          = useNavigate()
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:280}}>
      <div style={{width:32, height:32, borderRadius:'50%', border:'2.5px solid rgba(91,79,232,0.2)', borderTopColor:'#5B4FE8', animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!data?.latest) return (
    <div style={{maxWidth:440, margin:'0 auto', textAlign:'center', padding:'6rem 1rem'}}>
      <div style={{width:56, height:56, borderRadius:14, background:'rgba(91,79,232,0.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px'}}>
        <PlusCircle size={24} color="#5B4FE8" style={{opacity:0.7}}/>
      </div>
      <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1.375rem', color:'var(--color-paper)', marginBottom:8}}>
        No data yet
      </h2>
      <p style={{fontFamily:'DM Sans,sans-serif', color:'var(--color-muted)', fontSize:'0.875rem', marginBottom:28, lineHeight:1.6}}>
        Submit your first weekly log to activate your digital twin and start receiving predictions.
      </p>
      <button onClick={() => navigate('/app/log')} className="btn-primary">Submit first log</button>
    </div>
  )

  const l  = data.latest
  const logs = data.logs || []
  const cc = clusterColor[l.cluster_label] || 'var(--color-paper)'

  return (
    <div style={{display:'flex', flexDirection:'column', gap:20}}>
      {/* Header */}
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12}}>
        <div>
          <p className="section-label">Dashboard</p>
          <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.75rem', color:'var(--color-paper)', lineHeight:1.1, marginTop:2}}>
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'var(--color-muted)', marginTop:4}}>
            {data.total_logs} log{data.total_logs !== 1 ? 's' : ''} recorded · predictions update on each log
          </p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={() => navigate('/app/log')}      className="btn-primary"><PlusCircle size={13}/> Log entry</button>
          <button onClick={() => navigate('/app/simulate')} className="btn-ghost"><Sliders size={13}/> Simulate</button>
        </div>
      </div>

      <ConfidenceNote note={data.confidence_note}/>

      {/* Top row — gauge + 6 stats */}
      <div style={{display:'grid', gridTemplateColumns:'auto 1fr', gap:16, alignItems:'start'}} className="flex-wrap">
        <div className="card" style={{display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 24px'}}>
          <ScoreGauge score={l.performance_score} label="Performance Score"/>
          <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.6rem', color:'var(--color-muted)', marginTop:4, textAlign:'center'}}>
            predicted · not a grade
          </p>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10}}>
          {[
            { label:'ML Pressure',     v: l.pressure_label,        badge: <RiskBadge label={l.pressure_label}/>, delay:80 },
            { label:'Fuzzy Pressure',  v: l.fuzzy_pressure_label,  badge: <RiskBadge label={l.fuzzy_pressure_label}/>, delay:120 },
            { label:'Goal Alignment',  v: l.fuzzy_alignment_label, badge: <RiskBadge label={l.fuzzy_alignment_label} type="alignment"/>, delay:160 },
            { label:'Study / day',     v: `${l.study_hours_day}h`, trend:<TrendArrow logs={logs} field="study_hours_day"/>, delay:200 },
            { label:'Sleep / day',     v: `${l.sleep_hours_day}h`, trend:<TrendArrow logs={logs} field="sleep_hours_day"/>, delay:240,
              accent: l.sleep_hours_day >= 7 ? '#059669' : l.sleep_hours_day >= 6 ? '#D97706' : '#DC2626' },
            { label:'Screen / day',    v: `${l.screen_time_day}h`, trend:<TrendArrow logs={logs} field="screen_time_day"/>, delay:280,
              accent: l.screen_time_day <= 2 ? '#059669' : l.screen_time_day <= 4 ? '#D97706' : '#DC2626' },
          ].map(s => (
            <div key={s.label} className="card-hover animate-fade-up"
              style={{animationDelay:`${s.delay}ms`, animationFillMode:'both', opacity:0, padding:'14px 16px'}}>
              <p className="section-label">{s.label}</p>
              <div style={{display:'flex', alignItems:'center', gap:6, marginTop:4}}>
                <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1.25rem', color: s.accent || 'var(--color-paper)', lineHeight:1}}>
                  {s.v}
                </p>
                {s.trend}
              </div>
              {s.badge && <div style={{marginTop:8}}>{s.badge}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Fuzzy score bars */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        <FuzzyBar label="Workload Pressure (Fuzzy Module 1)" score={l.fuzzy_pressure_score}
          colorFn={s => s < 0.35 ? '#0D9488' : s < 0.65 ? '#D97706' : '#DC2626'}/>
        <FuzzyBar label="Goal Alignment (Fuzzy Module 2)" score={l.fuzzy_alignment_score}
          colorFn={s => s < 0.4 ? '#DC2626' : s < 0.66 ? '#D97706' : '#059669'}/>
      </div>

      {/* Cluster + Consistency */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          <p className="section-label">Student Archetype</p>
          <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1.1rem', color:cc, marginTop:6, lineHeight:1.2}}>
            {l.cluster_label}
          </p>
          <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'var(--color-muted)', marginTop:4, lineHeight:1.5}}>
            {clusterDesc[l.cluster_label] || ''}
          </p>
          <div style={{marginTop:12, paddingTop:12, borderTop:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between'}}>
            <div>
              <p className="section-label">Attendance</p>
              <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1.25rem', color:'var(--color-paper)', marginTop:2}}>{l.attendance_pct}%</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p className="section-label">Study Sessions</p>
              <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1.25rem', color:'var(--color-paper)', marginTop:2}}>{l.study_sessions}/day</p>
            </div>
          </div>
        </div>
        <ConsistencyCard score={data.consistency_score} logs={logs}/>
      </div>

      {/* GenAI Explanation */}
      <GenAIExplanation data={l}/>

      <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.625rem', color:'var(--color-muted)', textAlign:'center', opacity:0.5, paddingBottom:8}}>
        All outputs are simulations only — not prescriptions, not diagnoses.
      </p>
    </div>
  )
}
