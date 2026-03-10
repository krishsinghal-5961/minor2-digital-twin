import { useState } from 'react'
import { api } from '../utils/api'
import RiskBadge from '../components/RiskBadge'
import { Sliders, Play, RotateCcw, ArrowRight, Target } from 'lucide-react'

const PRESETS = [
  { name:'Improve Sleep',      changes:{ sleep_hours_day:8.0 } },
  { name:'Reduce Screen',      changes:{ screen_time_day:1.5 } },
  { name:'Balanced Boost',     changes:{ study_hours_day:7.0, sleep_hours_day:7.5, screen_time_day:1.5 } },
  { name:'Exam Week Stress',   changes:{ deadline_count:6, sleep_hours_day:5.0, screen_time_day:4.5 } },
]

const SLIDERS = [
  { key:'study_hours_day', label:'Study Hours / day',   min:0, max:12, step:0.5, unit:'h' },
  { key:'sleep_hours_day', label:'Sleep Hours / day',   min:3, max:10, step:0.5, unit:'h' },
  { key:'screen_time_day', label:'Screen Time / day',   min:0, max:10, step:0.5, unit:'h' },
  { key:'deadline_count',  label:'Deadlines this week', min:0, max:10, step:1,   unit:''  },
]

const GOALS = [
  { value:'cgpa_improvement', label:'CGPA Improvement', desc:'Weights study intensity + efficiency' },
  { value:'workload_balance',  label:'Workload Balance',  desc:'Balances effort with recovery' },
  { value:'placement_prep',    label:'Placement Prep',    desc:'Study + skill-building hours' },
  { value:'skill_building',    label:'Skill Building',    desc:'Project & practice hours' },
]

function Delta({ val, unit='' }) {
  if (!val && val !== 0) return <span style={{color:'var(--color-muted)',fontFamily:'JetBrains Mono,monospace',fontSize:'0.8rem'}}>—</span>
  const pos = val > 0
  return (
    <span style={{
      fontFamily:'JetBrains Mono,monospace', fontSize:'0.8rem', fontWeight:600,
      color: pos ? '#0D9488' : '#DC2626',
    }}>
      {pos ? '+' : ''}{val}{unit}
    </span>
  )
}

export default function Simulate() {
  const [tab,           setTab]         = useState('whatif')
  const [changes,       setChanges]     = useState({ study_hours_day:6, sleep_hours_day:7, screen_time_day:3, deadline_count:2 })
  const [result,        setResult]      = useState(null)
  const [loading,       setLoading]     = useState(false)
  const [scenarioName,  setScenario]    = useState('Custom Scenario')
  const [goalResult,    setGoalResult]  = useState(null)
  const [selectedGoal,  setSelectedGoal]= useState('cgpa_improvement')
  const [goalLoading,   setGoalLoading] = useState(false)

  const runSim = async () => {
    setLoading(true)
    try { setResult(await api.simulate({ changes, scenario_name: scenarioName })) }
    finally { setLoading(false) }
  }

  const runGoal = async (goal) => {
    setSelectedGoal(goal); setGoalLoading(true)
    try { setGoalResult(await api.goalSensitivity(goal)) }
    finally { setGoalLoading(false) }
  }

  const applyPreset = p => { setChanges(c=>({...c,...p.changes})); setScenario(p.name); setResult(null) }
  const reset = () => { setChanges({ study_hours_day:6, sleep_hours_day:7, screen_time_day:3, deadline_count:2 }); setResult(null) }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      <div>
        <p className="section-label">Simulation</p>
        <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.75rem',color:'var(--color-paper)',marginTop:4}}>
          What-If Engine
        </h1>
        <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'var(--color-muted)',marginTop:4}}>
          Explore how habit changes shift your predicted outcomes
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{display:'flex',gap:6}}>
        {[['whatif','What-If Sim'],['goal','Goal Explorer']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)}
            style={{
              padding:'6px 16px', borderRadius:10, fontSize:'0.8rem',
              fontFamily:'JetBrains Mono,monospace', cursor:'pointer', transition:'all 0.15s',
              border: tab===k ? '1px solid rgba(91,79,232,0.35)' : '1px solid var(--color-border)',
              background: tab===k ? 'rgba(91,79,232,0.1)' : 'transparent',
              color: tab===k ? '#5B4FE8' : 'var(--color-muted)',
            }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'whatif' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
          {/* Controls */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {/* Quick presets */}
            <div className="card">
              <p className="section-label" style={{marginBottom:10}}>Quick Presets</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {PRESETS.map(p => (
                  <button key={p.name} onClick={()=>applyPreset(p)}
                    style={{
                      textAlign:'left', padding:'9px 12px', borderRadius:9, cursor:'pointer',
                      border:'1px solid var(--color-border)', background:'var(--color-surface)',
                      fontFamily:'JetBrains Mono,monospace', fontSize:'0.7rem', color:'var(--color-muted)',
                      transition:'all 0.15s',
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(91,79,232,0.3)';e.currentTarget.style.color='var(--color-paper)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--color-border)';e.currentTarget.style.color='var(--color-muted)'}}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="card" style={{display:'flex',flexDirection:'column',gap:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <p className="section-label" style={{marginBottom:0}}>Adjust Variables</p>
                <button onClick={reset}
                  style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'none',cursor:'pointer',
                    fontFamily:'JetBrains Mono,monospace',fontSize:'0.7rem',color:'var(--color-muted)',transition:'color 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.color='var(--color-paper)'}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--color-muted)'}>
                  <RotateCcw size={10}/> reset
                </button>
              </div>

              {SLIDERS.map(s => (
                <div key={s.key}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <label style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'var(--color-muted)'}}>{s.label}</label>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.875rem',color:'#5B4FE8',fontWeight:600}}>
                      {changes[s.key]}{s.unit}
                    </span>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step}
                    value={changes[s.key]}
                    onChange={e=>setChanges(c=>({...c,[s.key]:parseFloat(e.target.value)}))}
                    style={{width:'100%'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',opacity:0.5}}>{s.min}{s.unit}</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',opacity:0.5}}>{s.max}{s.unit}</span>
                  </div>
                </div>
              ))}

              <div>
                <label className="section-label" style={{display:'block',marginBottom:6}}>Scenario Name</label>
                <input type="text" value={scenarioName} onChange={e=>setScenario(e.target.value)} className="input-field" style={{fontSize:'0.875rem'}}/>
              </div>

              <button onClick={runSim} disabled={loading} className="btn-primary" style={{width:'100%',justifyContent:'center'}}>
                {loading
                  ? <><div style={{width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',animation:'spin 0.7s linear infinite',marginRight:6}}/>Running...</>
                  : <><Play size={14} style={{marginRight:6}}/> Run Simulation</>}
              </button>
            </div>
          </div>

          {/* Results */}
          <div>
            {!result ? (
              <div className="card" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'3rem 2rem',textAlign:'center',minHeight:360}}>
                <Sliders size={36} style={{color:'var(--color-border)',marginBottom:12}}/>
                <p style={{fontFamily:'DM Sans,sans-serif',color:'var(--color-muted)',fontSize:'0.875rem',lineHeight:1.6}}>
                  Adjust sliders and run simulation to see before/after predictions.
                </p>
              </div>
            ) : (
              <div className="card" style={{animation:'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards'}}>
                <p className="section-label">{result.scenario_name}</p>
                <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.65rem',color:'var(--color-muted)',margin:'4px 0 16px',lineHeight:1.5}}>
                  {Object.entries(result.changes).map(([k,v])=>`${k.replace(/_/g,' ')} → ${v}`).join(' · ')}
                </p>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid var(--color-border)`}}>
                      {['Metric','Before','','After','Δ'].map((h,i) => (
                        <th key={i} style={{
                          padding:'0 8px 10px',textAlign:i===0?'left':i===2?'center':'right',
                          fontFamily:'JetBrains Mono,monospace',fontWeight:500,
                          color:'var(--color-muted)',opacity:0.7,fontSize:'0.7rem',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label:'Performance', bv:result.before.performance_score, av:result.after.performance_score,
                        d: result.deltas.performance_score, unit:'', fmt:v=>v?.toFixed(1) },
                      { label:'Fuzzy Pressure', bv:result.before.fuzzy_pressure_score?.toFixed(3), av:result.after.fuzzy_pressure_score?.toFixed(3),
                        d: +(result.deltas.fuzzy_pressure_score*100).toFixed(1), unit:'%' },
                      { label:'Fuzzy Alignment', bv:null, av:null, badge:true,
                        bb:result.before.fuzzy_alignment_label, ab:result.after.fuzzy_alignment_label,
                        d: +(result.deltas.fuzzy_alignment_score*100).toFixed(1), unit:'%' },
                      { label:'ML Pressure', bv:null, av:null, badge:true, pressure:true,
                        bb:result.before.pressure_label, ab:result.after.pressure_label },
                      { label:'Archetype', bv:result.before.cluster_label, av:result.after.cluster_label,
                        small:true },
                    ].map((r,i) => (
                      <tr key={r.label} style={{borderBottom:`1px solid var(--color-border)`}}>
                        <td style={{padding:'9px 8px 9px 0',fontFamily:'DM Sans,sans-serif',fontSize:'0.75rem',color:'var(--color-muted)'}}>{r.label}</td>
                        <td style={{padding:'9px 8px',textAlign:'right',fontFamily:'JetBrains Mono,monospace',fontSize:r.small?'0.65rem':'0.8rem',color:'var(--color-muted)'}}>
                          {r.badge ? <RiskBadge label={r.bb} type={!r.pressure?'alignment':undefined}/> : r.bv}
                        </td>
                        <td style={{padding:'9px 4px',textAlign:'center',color:'var(--color-muted)',fontSize:'0.75rem'}}>→</td>
                        <td style={{padding:'9px 8px',textAlign:'right',fontFamily:'JetBrains Mono,monospace',fontSize:r.small?'0.65rem':'0.8rem',color:'var(--color-paper)'}}>
                          {r.badge ? <RiskBadge label={r.ab} type={!r.pressure?'alignment':undefined}/> : r.av}
                        </td>
                        <td style={{padding:'9px 0 9px 8px',textAlign:'right'}}>
                          {r.d !== undefined && <Delta val={r.d} unit={r.unit}/>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',marginTop:12,textAlign:'center',opacity:0.5}}>
                  Simulation only · not a prescription
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'goal' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <p className="section-label" style={{marginBottom:4}}>Goal Sensitivity Explorer</p>
            <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'var(--color-muted)',marginBottom:16,lineHeight:1.6}}>
              Toggle your goal to see how predictions shift. Different goals weight different habits and change how effort_mismatch is computed.
            </p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
              {GOALS.map(g => (
                <button key={g.value} onClick={()=>runGoal(g.value)}
                  style={{
                    padding:'12px 14px', borderRadius:10, textAlign:'left', cursor:'pointer',
                    border: selectedGoal===g.value ? '1px solid rgba(91,79,232,0.4)' : '1px solid var(--color-border)',
                    background: selectedGoal===g.value ? 'rgba(91,79,232,0.07)' : 'var(--color-surface)',
                    transition:'all 0.15s',
                  }}>
                  <Target size={12} style={{color: selectedGoal===g.value ? '#5B4FE8' : 'var(--color-muted)',marginBottom:6}}/>
                  <p style={{fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'0.8125rem',
                    color: selectedGoal===g.value ? '#5B4FE8' : 'var(--color-paper)'}}>
                    {g.label}
                  </p>
                  <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.7rem',color:'var(--color-muted)',marginTop:2,lineHeight:1.4}}>
                    {g.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {goalLoading && (
            <div style={{display:'flex',justifyContent:'center',padding:'1.5rem'}}>
              <div style={{width:20,height:20,borderRadius:'50%',border:'2px solid rgba(91,79,232,0.2)',borderTopColor:'#5B4FE8',animation:'spin 0.7s linear infinite'}}/>
            </div>
          )}

          {goalResult && !goalLoading && (
            <div className="card" style={{animation:'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards'}}>
              <p className="section-label" style={{marginBottom:16}}>
                Prediction Shift — {GOALS.find(g=>g.value===selectedGoal)?.label}
              </p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
                <div>
                  <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.65rem',color:'var(--color-muted)',marginBottom:4}}>Performance</p>
                  <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.5rem',color:'var(--color-paper)'}}>
                    {goalResult.performance_score}
                  </p>
                  <Delta val={goalResult.delta_performance}/>
                </div>
                <div>
                  <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.65rem',color:'var(--color-muted)',marginBottom:4}}>Fuzzy Pressure</p>
                  <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.25rem',color:'var(--color-paper)'}}>
                    {(goalResult.fuzzy_pressure_score*100).toFixed(1)}%
                  </p>
                  <RiskBadge label={goalResult.fuzzy_pressure_label}/>
                </div>
                <div>
                  <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.65rem',color:'var(--color-muted)',marginBottom:4}}>Goal Alignment</p>
                  <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.25rem',color:'var(--color-paper)'}}>
                    {(goalResult.fuzzy_alignment_score*100).toFixed(1)}%
                  </p>
                  <RiskBadge label={goalResult.fuzzy_alignment_label} type="alignment"/>
                </div>
                <div>
                  <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.65rem',color:'var(--color-muted)',marginBottom:4}}>Pressure Δ</p>
                  <Delta val={+(goalResult.delta_pressure*100).toFixed(1)} unit="%"/>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}
