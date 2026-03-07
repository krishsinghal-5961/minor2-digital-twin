import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import StatCard from '../components/StatCard'
import RiskBadge from '../components/RiskBadge'
import ScoreGauge from '../components/ScoreGauge'
import ConfidenceNote from '../components/ConfidenceNote'
import { PlusCircle, Sliders } from 'lucide-react'

const clusterInfo = {
  'Balanced & Efficient'    : { color:'text-risk-low',    desc:'Consistent habits, strong efficiency.' },
  'Extracurricular Focused' : { color:'text-risk-medium', desc:'Active beyond academics, watch burnout.' },
  'Overworked & Struggling' : { color:'text-risk-high',   desc:'High effort, low returns. Rebalance needed.' },
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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data?.latest) return (
    <div className="max-w-xl mx-auto text-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
        <PlusCircle size={28} className="text-accent" />
      </div>
      <h2 className="font-display font-bold text-2xl text-paper mb-3">No data yet</h2>
      <p className="text-paper/40 mb-8">Submit your first weekly log to activate your digital twin.</p>
      <button onClick={() => navigate('/app/log')} className="btn-primary">Submit first log</button>
    </div>
  )

  const l   = data.latest
  const ci  = clusterInfo[l.cluster_label] || { color:'text-paper', desc:'' }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="section-label">Dashboard</p>
          <h1 className="font-display font-bold text-3xl text-paper">
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-paper/40 font-body text-sm mt-1">
            {data.total_logs} log{data.total_logs !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/app/log')}      className="btn-primary flex items-center gap-2 text-sm"><PlusCircle size={15}/> Log entry</button>
          <button onClick={() => navigate('/app/simulate')} className="btn-ghost flex items-center gap-2 text-sm"><Sliders size={15}/> Simulate</button>
        </div>
      </div>

      <ConfidenceNote note={data.confidence_note} />

      {/* Top row — gauge + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Gauge */}
        <div className="card flex flex-col items-center justify-center lg:col-span-1 animate-fade-up" style={{animationDelay:'0ms',animationFillMode:'both',opacity:0}}>
          <ScoreGauge score={l.performance_score} label="Performance Score" />
          <p className="text-paper/30 text-xs font-mono mt-2">predicted · not a grade</p>
        </div>

        {/* Stats */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-5">
          <StatCard label="ML Pressure"   value={l.pressure_label}       badge={<RiskBadge label={l.pressure_label} />}        delay={100} />
          <StatCard label="Fuzzy Pressure" value={l.fuzzy_pressure_label} badge={<RiskBadge label={l.fuzzy_pressure_label} />}  delay={150} />
          <StatCard label="Goal Alignment" value={l.fuzzy_alignment_label} badge={<RiskBadge label={l.fuzzy_alignment_label} type="alignment" />} delay={200} />
          <StatCard label="Study Hours/day" value={`${l.study_hours_day}h`}   accent="text-accent-soft" delay={250} />
          <StatCard label="Sleep Hours/day" value={`${l.sleep_hours_day}h`}   accent={l.sleep_hours_day >= 7 ? 'text-risk-low' : 'text-risk-high'} delay={300} />
          <StatCard label="Screen Time/day" value={`${l.screen_time_day}h`}   accent={l.screen_time_day <= 2 ? 'text-risk-low' : 'text-risk-medium'} delay={350} />
        </div>
      </div>

      {/* Fuzzy scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card animate-fade-up" style={{animationDelay:'400ms',animationFillMode:'both',opacity:0}}>
          <p className="section-label mb-3">Fuzzy Pressure Score</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2.5 bg-ink rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width:`${l.fuzzy_pressure_score*100}%`,
                         background: l.fuzzy_pressure_score < 0.35 ? '#2DD4BF' : l.fuzzy_pressure_score < 0.65 ? '#F59E0B' : '#F43F5E' }} />
            </div>
            <span className="font-mono text-sm text-paper/60 shrink-0">{(l.fuzzy_pressure_score*100).toFixed(1)}%</span>
          </div>
          <p className="text-paper/30 text-xs font-body mt-2">Based on sleep, deadlines, screen time, habit stability</p>
        </div>

        <div className="card animate-fade-up" style={{animationDelay:'450ms',animationFillMode:'both',opacity:0}}>
          <p className="section-label mb-3">Goal Alignment Score</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2.5 bg-ink rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width:`${l.fuzzy_alignment_score*100}%`,
                         background: l.fuzzy_alignment_score < 0.4 ? '#F43F5E' : l.fuzzy_alignment_score < 0.66 ? '#F59E0B' : '#10B981' }} />
            </div>
            <span className="font-mono text-sm text-paper/60 shrink-0">{(l.fuzzy_alignment_score*100).toFixed(1)}%</span>
          </div>
          <p className="text-paper/30 text-xs font-body mt-2">Based on effort mismatch, study intensity, pressure level</p>
        </div>
      </div>

      {/* Cluster card */}
      <div className="card animate-fade-up" style={{animationDelay:'500ms',animationFillMode:'both',opacity:0}}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="section-label">Student Archetype</p>
            <h3 className={`font-display font-bold text-xl mt-1 ${ci.color}`}>{l.cluster_label}</h3>
            <p className="text-paper/40 font-body text-sm mt-1">{ci.desc}</p>
          </div>
          <div className="text-right">
            <p className="section-label">Attendance</p>
            <p className="font-display font-bold text-2xl text-paper mt-1">{l.attendance_pct}%</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-paper/20 text-xs font-mono text-center pb-4">
        All predictions are simulations only — not prescriptions, not diagnoses.
      </p>
    </div>
  )
}
