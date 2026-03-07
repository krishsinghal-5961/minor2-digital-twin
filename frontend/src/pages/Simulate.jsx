import { useState } from 'react'
import { api } from '../utils/api'
import RiskBadge from '../components/RiskBadge'
import { Sliders, Play, RotateCcw, ArrowRight, Target } from 'lucide-react'

const presets = [
  { name:'Improve Sleep',      changes:{ sleep_hours_day:8.0 } },
  { name:'Reduce Screen Time', changes:{ screen_time_day:1.5 } },
  { name:'Balanced Boost',     changes:{ study_hours_day:7.0, sleep_hours_day:7.5, screen_time_day:1.5 } },
  { name:'Exam Week Stress',   changes:{ deadline_count:6, sleep_hours_day:5.0, screen_time_day:4.5 } },
]

const sliders = [
  { key:'study_hours_day', label:'Study Hours / day',  min:0,  max:12, step:0.5, unit:'h' },
  { key:'sleep_hours_day', label:'Sleep Hours / day',  min:3,  max:10, step:0.5, unit:'h' },
  { key:'screen_time_day', label:'Screen Time / day',  min:0,  max:10, step:0.5, unit:'h' },
  { key:'deadline_count',  label:'Deadlines this week',min:0,  max:10, step:1,   unit:''  },
]

const goals = [
  { value:'cgpa_improvement', label:'CGPA Improvement' },
  { value:'workload_balance',  label:'Workload Balance' },
  { value:'placement_prep',    label:'Placement Prep' },
  { value:'skill_building',    label:'Skill Building' },
]

const Delta = ({ val, unit='' }) => {
  if (!val) return <span className="text-paper/30 font-mono text-sm">—</span>
  return <span className={`font-mono text-sm font-semibold ${val>0?'text-risk-low':'text-risk-high'}`}>{val>0?'+':''}{val}{unit}</span>
}

export default function Simulate() {
  const [tab, setTab]               = useState('whatif')
  const [changes, setChanges]       = useState({ study_hours_day:6, sleep_hours_day:7, screen_time_day:3, deadline_count:2 })
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [scenarioName, setScenario] = useState('Custom Scenario')
  const [goalResult, setGoalResult] = useState(null)
  const [selectedGoal, setSelectedGoal] = useState('cgpa_improvement')

  const runSim = async () => {
    setLoading(true)
    try { setResult(await api.simulate({ changes, scenario_name: scenarioName })) }
    finally { setLoading(false) }
  }

  const runGoal = async (goal) => {
    setSelectedGoal(goal)
    setGoalResult(await api.goalSensitivity(goal))
  }

  const applyPreset = (p) => { setChanges(c=>({...c,...p.changes})); setScenario(p.name); setResult(null) }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="section-label">Simulation</p>
        <h1 className="font-display font-bold text-3xl text-paper">What-If Engine</h1>
        <p className="text-paper/40 text-sm font-body mt-1">Explore how habit changes shift your predicted outcomes</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {[['whatif','What-If Sim'],['goal','Goal Explorer']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-xl text-sm font-mono transition-all duration-200
              ${tab===k?'bg-accent/20 text-accent border border-accent/30':'text-paper/40 hover:text-paper border border-white/5'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-5">
            <div className="card">
              <p className="section-label mb-3">Quick Presets</p>
              <div className="grid grid-cols-2 gap-2">
                {presets.map(p => (
                  <button key={p.name} onClick={() => applyPreset(p)}
                    className="text-left px-3 py-2.5 rounded-xl border border-white/5 hover:border-accent/30 hover:bg-accent/5 text-paper/60 hover:text-paper text-xs font-mono transition-all duration-200">
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="card space-y-5">
              <div className="flex items-center justify-between">
                <p className="section-label">Adjust Variables</p>
                <button onClick={() => { setChanges({ study_hours_day:6, sleep_hours_day:7, screen_time_day:3, deadline_count:2 }); setResult(null) }}
                  className="text-paper/30 hover:text-paper/60 text-xs font-mono flex items-center gap-1 transition-colors">
                  <RotateCcw size={11}/> reset
                </button>
              </div>
              {sliders.map(s => (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-paper/60 text-xs font-body">{s.label}</label>
                    <span className="font-mono text-sm text-accent">{changes[s.key]}{s.unit}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step}
                    value={changes[s.key]}
                    onChange={e => setChanges(c=>({...c,[s.key]:parseFloat(e.target.value)}))}
                    className="w-full accent-accent h-1.5 bg-ink rounded-full cursor-pointer"/>
                  <div className="flex justify-between text-paper/20 text-xs font-mono mt-1">
                    <span>{s.min}{s.unit}</span><span>{s.max}{s.unit}</span>
                  </div>
                </div>
              ))}
              <div>
                <label className="section-label block mb-1.5">Scenario Name</label>
                <input type="text" value={scenarioName} onChange={e=>setScenario(e.target.value)} className="input-field text-sm"/>
              </div>
              <button onClick={runSim} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {loading?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Running...</>:<><Play size={15}/> Run Simulation</>}
              </button>
            </div>
          </div>

          {/* Results */}
          <div>
            {!result ? (
              <div className="card h-full flex flex-col items-center justify-center text-center py-16">
                <Sliders size={40} className="text-paper/10 mb-4"/>
                <p className="text-paper/30 font-body">Adjust sliders and run simulation to see before/after predictions.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-up" style={{animationFillMode:'both',opacity:0}}>
                <div className="card">
                  <p className="section-label mb-1">{result.scenario_name}</p>
                  <p className="text-paper/30 text-xs font-mono mb-5">
                    {Object.entries(result.changes).map(([k,v])=>`${k.replace(/_/g,' ')} → ${v}`).join(' · ')}
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-paper/30 text-xs font-mono border-b border-white/5">
                        <th className="text-left pb-3">Metric</th>
                        <th className="text-right pb-3">Before</th>
                        <th className="text-center pb-3 px-2"><ArrowRight size={10}/></th>
                        <th className="text-right pb-3">After</th>
                        <th className="text-right pb-3 pl-3">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label:'Performance', bv:result.before.performance_score, av:result.after.performance_score, d:result.deltas.performance_score, fmt:v=>v, unit:'' },
                      ].map(r => (
                        <tr key={r.label} className="border-b border-white/5">
                          <td className="py-3 text-paper/60 font-body text-xs">{r.label}</td>
                          <td className="py-3 text-right font-mono text-paper/60">{r.bv?.toFixed(1)}</td>
                          <td className="py-3 text-center px-2 text-paper/20">→</td>
                          <td className="py-3 text-right font-mono text-paper">{r.av?.toFixed(1)}</td>
                          <td className="py-3 text-right pl-3"><Delta val={r.d} unit={r.unit}/></td>
                        </tr>
                      ))}
                      <tr className="border-b border-white/5">
                        <td className="py-3 text-paper/60 font-body text-xs">ML Pressure</td>
                        <td className="py-3 text-right"><RiskBadge label={result.before.pressure_label}/></td>
                        <td className="py-3 text-center px-2 text-paper/20">→</td>
                        <td className="py-3 text-right"><RiskBadge label={result.after.pressure_label}/></td>
                        <td className="py-3 text-right pl-3 text-paper/30 font-mono text-xs">{result.before.pressure_label===result.after.pressure_label?'—':'✗'}</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 text-paper/60 font-body text-xs">Fuzzy Pressure</td>
                        <td className="py-3 text-right font-mono text-paper/60 text-xs">{result.before.fuzzy_pressure_score?.toFixed(3)}</td>
                        <td className="py-3 text-center px-2 text-paper/20">→</td>
                        <td className="py-3 text-right font-mono text-paper text-xs">{result.after.fuzzy_pressure_score?.toFixed(3)}</td>
                        <td className="py-3 text-right pl-3"><Delta val={+(result.deltas.fuzzy_pressure_score*100).toFixed(1)} unit="%"/></td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 text-paper/60 font-body text-xs">Fuzzy Alignment</td>
                        <td className="py-3 text-right"><RiskBadge label={result.before.fuzzy_alignment_label} type="alignment"/></td>
                        <td className="py-3 text-center px-2 text-paper/20">→</td>
                        <td className="py-3 text-right"><RiskBadge label={result.after.fuzzy_alignment_label} type="alignment"/></td>
                        <td className="py-3 text-right pl-3"><Delta val={+(result.deltas.fuzzy_alignment_score*100).toFixed(1)} unit="%"/></td>
                      </tr>
                      <tr>
                        <td className="py-3 text-paper/60 font-body text-xs">Archetype</td>
                        <td className="py-3 text-right font-mono text-paper/40 text-xs">{result.before.cluster_label}</td>
                        <td className="py-3 text-center px-2 text-paper/20">→</td>
                        <td className="py-3 text-right font-mono text-paper/60 text-xs">{result.after.cluster_label}</td>
                        <td className="py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-paper/20 text-xs font-mono text-center">Simulation only · not a prescription</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'goal' && (
        <div className="space-y-6">
          <div className="card">
            <p className="section-label mb-3">Goal Sensitivity Explorer</p>
            <p className="text-paper/40 text-sm font-body mb-5">
              Toggle your goal to see how predictions shift. Different goals weight different habits differently.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {goals.map(g => (
                <button key={g.value} onClick={() => runGoal(g.value)}
                  className={`px-4 py-3 rounded-xl border text-sm font-mono transition-all duration-200 text-left
                    ${selectedGoal===g.value?'bg-accent/20 text-accent border-accent/30':'text-paper/50 border-white/5 hover:border-accent/20 hover:text-paper'}`}>
                  <Target size={12} className="mb-1"/>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {goalResult && (
            <div className="card animate-fade-up" style={{animationFillMode:'both',opacity:0}}>
              <p className="section-label mb-4">Prediction Shift — {goals.find(g=>g.value===selectedGoal)?.label}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-paper/30 text-xs font-mono mb-1">Performance</p>
                  <p className="font-display font-bold text-2xl text-paper">{goalResult.performance_score}</p>
                  <Delta val={goalResult.delta_performance}/>
                </div>
                <div>
                  <p className="text-paper/30 text-xs font-mono mb-1">Fuzzy Pressure</p>
                  <p className="font-display font-bold text-xl text-paper">{(goalResult.fuzzy_pressure_score*100).toFixed(1)}%</p>
                  <RiskBadge label={goalResult.fuzzy_pressure_label}/>
                </div>
                <div>
                  <p className="text-paper/30 text-xs font-mono mb-1">Goal Alignment</p>
                  <p className="font-display font-bold text-xl text-paper">{(goalResult.fuzzy_alignment_score*100).toFixed(1)}%</p>
                  <RiskBadge label={goalResult.fuzzy_alignment_label} type="alignment"/>
                </div>
                <div>
                  <p className="text-paper/30 text-xs font-mono mb-1">Pressure Δ</p>
                  <Delta val={+(goalResult.delta_pressure*100).toFixed(1)} unit="%"/>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
