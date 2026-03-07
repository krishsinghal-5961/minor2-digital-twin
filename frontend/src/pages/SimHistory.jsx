import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import RiskBadge from '../components/RiskBadge'
import { Clock, Sliders } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Mock simulation history — mirrors simulations table in Supabase
const MOCK_SIM_HISTORY = [
  {
    id:'sim-1', created_at: new Date(2025,1,1).toISOString(),
    scenario_name:'Improve Sleep',
    changes:{ sleep_hours_day:8.0 },
    before:{ performance_score:54.2, pressure_label:'High',   fuzzy_alignment_label:'Partial' },
    after :{ performance_score:57.1, pressure_label:'Medium', fuzzy_alignment_label:'Partial' },
    deltas:{ performance_score:2.9 }
  },
  {
    id:'sim-2', created_at: new Date(2025,1,8).toISOString(),
    scenario_name:'Reduce Screen Time',
    changes:{ screen_time_day:1.5 },
    before:{ performance_score:54.2, pressure_label:'Medium', fuzzy_alignment_label:'Partial' },
    after :{ performance_score:55.8, pressure_label:'Medium', fuzzy_alignment_label:'Partial' },
    deltas:{ performance_score:1.6 }
  },
  {
    id:'sim-3', created_at: new Date(2025,1,15).toISOString(),
    scenario_name:'Balanced Boost',
    changes:{ study_hours_day:7.0, sleep_hours_day:7.5, screen_time_day:1.5 },
    before:{ performance_score:58.4, pressure_label:'Medium', fuzzy_alignment_label:'Partial' },
    after :{ performance_score:63.2, pressure_label:'Low',    fuzzy_alignment_label:'Aligned' },
    deltas:{ performance_score:4.8 }
  },
]

export default function SimHistory() {
  const navigate = useNavigate()
  const [sims, setSims] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.simHistory()
      .then(res => setSims(res.simulations?.length ? res.simulations : MOCK_SIM_HISTORY))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="section-label">Reflection Log</p>
          <h1 className="font-display font-bold text-3xl text-paper">Simulation History</h1>
          <p className="text-paper/40 text-sm font-body mt-1">Track how your simulations evolved over time</p>
        </div>
        <button onClick={() => navigate('/app/simulate')}
          className="btn-ghost flex items-center gap-2 text-sm">
          <Sliders size={14}/> New simulation
        </button>
      </div>

      {sims.length === 0 ? (
        <div className="card text-center py-16">
          <Clock size={36} className="text-paper/10 mx-auto mb-4"/>
          <p className="text-paper/40">No simulations yet. Run your first What-If scenario.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sims.map((s,i) => (
            <div key={s.id||i} className="card hover:border-accent/20 transition-all duration-200">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <p className="font-display font-semibold text-paper">{s.scenario_name}</p>
                  <p className="text-paper/30 text-xs font-mono mt-0.5">
                    {new Date(s.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.deltas?.performance_score > 0
                    ? <span className="text-risk-low text-sm font-mono font-semibold">+{s.deltas.performance_score} perf</span>
                    : <span className="text-risk-high text-sm font-mono font-semibold">{s.deltas?.performance_score} perf</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(s.changes).map(([k,v]) => (
                  <span key={k} className="bg-accent/5 border border-accent/15 rounded-lg px-2.5 py-1 text-xs font-mono text-accent/70">
                    {k.replace(/_/g,' ')} → {v}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label:'Performance', bv:s.before.performance_score, av:s.after.performance_score },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-paper/30 text-xs font-mono mb-1">{r.label}</p>
                    <p className="font-mono text-sm">
                      <span className="text-paper/50">{r.bv?.toFixed(1)}</span>
                      <span className="text-paper/20 mx-1">→</span>
                      <span className="text-paper">{r.av?.toFixed(1)}</span>
                    </p>
                  </div>
                ))}
                <div>
                  <p className="text-paper/30 text-xs font-mono mb-1">Pressure Before</p>
                  <RiskBadge label={s.before.pressure_label}/>
                </div>
                <div>
                  <p className="text-paper/30 text-xs font-mono mb-1">Pressure After</p>
                  <RiskBadge label={s.after.pressure_label}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
