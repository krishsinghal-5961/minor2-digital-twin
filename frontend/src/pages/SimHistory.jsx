import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import RiskBadge from '../components/RiskBadge'
import { Clock, Sliders, TrendingUp, TrendingDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MOCK = [
  {
    id:'sim-1', created_at: new Date(2025,1,1).toISOString(),
    scenario_name:'Improve Sleep',
    changes:{ sleep_hours_day:8.0 },
    before:{ performance_score:54.2, pressure_label:'High',   fuzzy_alignment_label:'Partial' },
    after :{ performance_score:57.1, pressure_label:'Medium', fuzzy_alignment_label:'Partial' },
    deltas:{ performance_score:2.9 },
  },
  {
    id:'sim-2', created_at: new Date(2025,1,8).toISOString(),
    scenario_name:'Reduce Screen Time',
    changes:{ screen_time_day:1.5 },
    before:{ performance_score:54.2, pressure_label:'Medium', fuzzy_alignment_label:'Partial' },
    after :{ performance_score:55.8, pressure_label:'Medium', fuzzy_alignment_label:'Partial' },
    deltas:{ performance_score:1.6 },
  },
  {
    id:'sim-3', created_at: new Date(2025,1,15).toISOString(),
    scenario_name:'Balanced Boost',
    changes:{ study_hours_day:7.0, sleep_hours_day:7.5, screen_time_day:1.5 },
    before:{ performance_score:58.4, pressure_label:'Medium', fuzzy_alignment_label:'Partial' },
    after :{ performance_score:63.2, pressure_label:'Low',    fuzzy_alignment_label:'Aligned' },
    deltas:{ performance_score:4.8 },
  },
]

export default function SimHistory() {
  const navigate     = useNavigate()
  const [sims, setSims]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.simHistory()
      .then(res => setSims(res.simulations ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(91,79,232,0.15)',borderTopColor:'#5B4FE8',animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <p className="section-label">Reflection Log</p>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.75rem',color:'var(--color-paper)',marginTop:4}}>
            Simulation History
          </h1>
          <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'var(--color-muted)',marginTop:4}}>
            Track how your What-If explorations evolved over time
          </p>
        </div>
        <button onClick={()=>navigate('/app/simulate')} className="btn-ghost" style={{display:'flex',alignItems:'center',gap:8}}>
          <Sliders size={13}/> New simulation
        </button>
      </div>

      {sims.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'4rem 2rem',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <Clock size={32} style={{color:'var(--color-border)'}}/>
          <p style={{fontFamily:'DM Sans,sans-serif',color:'var(--color-muted)'}}>No simulations yet. Run your first What-If scenario.</p>
          <button onClick={()=>navigate('/app/simulate')} className="btn-primary" style={{marginTop:4}}>
            Run a simulation
          </button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {sims.map((s,i) => {
            const delta = s.deltas?.performance_score
            const positive = delta > 0
            return (
              <div key={s.id||i} className="card-hover" style={{padding:'18px 20px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:14}}>
                  <div>
                    <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1rem',color:'var(--color-paper)'}}>
                      {s.scenario_name}
                    </p>
                    <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.65rem',color:'var(--color-muted)',marginTop:3}}>
                      {new Date(s.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                    </p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,
                    padding:'4px 12px',borderRadius:99,
                    background: positive ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
                    border: positive ? '1px solid rgba(5,150,105,0.2)' : '1px solid rgba(220,38,38,0.2)',
                  }}>
                    {positive
                      ? <TrendingUp size={12} style={{color:'#059669'}}/>
                      : <TrendingDown size={12} style={{color:'#DC2626'}}/>}
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.75rem',fontWeight:700,
                      color: positive ? '#059669' : '#DC2626'}}>
                      {positive ? '+' : ''}{delta} perf pts
                    </span>
                  </div>
                </div>

                {/* Changes */}
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
                  {Object.entries(s.changes).map(([k,v]) => (
                    <span key={k} style={{
                      padding:'3px 10px',borderRadius:6,fontSize:'0.7rem',
                      fontFamily:'JetBrains Mono,monospace',
                      background:'rgba(91,79,232,0.06)',border:'1px solid rgba(91,79,232,0.15)',
                      color:'#5B4FE8',
                    }}>
                      {k.replace(/_/g,' ')} → {v}
                    </span>
                  ))}
                </div>

                {/* Before / After */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,
                  paddingTop:12,borderTop:'1px solid var(--color-border)'}}>
                  <div>
                    <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',marginBottom:4}}>Performance</p>
                    <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.8rem',color:'var(--color-muted)'}}>
                      {s.before.performance_score?.toFixed(1)}
                      <span style={{color:'var(--color-muted)',margin:'0 6px',opacity:0.4}}>→</span>
                      <span style={{color:'var(--color-paper)',fontWeight:700}}>{s.after.performance_score?.toFixed(1)}</span>
                    </p>
                  </div>
                  <div>
                    <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',marginBottom:4}}>Pressure Before</p>
                    <RiskBadge label={s.before.pressure_label}/>
                  </div>
                  <div>
                    <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',marginBottom:4}}>Pressure After</p>
                    <RiskBadge label={s.after.pressure_label}/>
                  </div>
                  <div>
                    <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',marginBottom:4}}>Alignment After</p>
                    <RiskBadge label={s.after.fuzzy_alignment_label} type="alignment"/>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
