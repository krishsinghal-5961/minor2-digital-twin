import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import RiskRadar from '../components/RiskRadar'
import { useTheme } from '../hooks/useTheme.jsx'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

// Theme-aware tooltip
const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'var(--color-card)', border:'1px solid var(--color-border)',
      borderRadius:10, padding:'10px 14px',
      fontFamily:'JetBrains Mono,monospace', fontSize:11,
      boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
    }}>
      <p style={{color:'var(--color-muted)', marginBottom:6}}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{color:p.color, marginTop:2}}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

const Spinner = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
    <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(91,79,232,0.15)',borderTopColor:'#5B4FE8',animation:'spin 0.7s linear infinite'}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

// ── LIVE STAT CARDS ───────────────────────────────────────────────────────────
// Computes 4 personalised stats from the user's actual log history.
// Replaces the old static "Top Feature / 2nd Feature" model-info cards.

function LiveStatCards({ logs, latest }) {
  if (!logs || !latest) return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
      {[1,2,3,4].map(i => (
        <div key={i} className="card" style={{padding:'16px 18px', minHeight:100}}>
          <div className="skeleton" style={{height:10, width:'50%', marginBottom:12}}/>
          <div className="skeleton" style={{height:22, width:'70%', marginBottom:8}}/>
          <div className="skeleton" style={{height:8,  width:'90%'}}/>
        </div>
      ))}
    </div>
  )

  // ── 1. Average Performance ─────────────────────────────────────────────────
  const avgPerf   = logs.reduce((s,l) => s + l.performance_score, 0) / logs.length
  const lastPerf  = latest.performance_score
  const perfDelta = +(lastPerf - avgPerf).toFixed(1)
  const perfColor = perfDelta >= 0 ? '#059669' : '#DC2626'

  // ── 2. Top Risk Factor ─────────────────────────────────────────────────────
  // Score each risk factor: higher score = worse.
  // Sleep: below 7h is risky. Screen: above 3h is risky. Deadlines: above 3 is risky.
  const riskFactors = [
    {
      name: 'Low Sleep',
      score: Math.max(0, 7 - latest.sleep_hours_day),
      val: `${latest.sleep_hours_day}h / night`,
      note: latest.sleep_hours_day >= 7
        ? `${latest.sleep_hours_day}h — within healthy range`
        : `${(7 - latest.sleep_hours_day).toFixed(1)}h below 7h threshold`,
      color: latest.sleep_hours_day >= 7 ? '#059669' : latest.sleep_hours_day >= 6 ? '#D97706' : '#DC2626',
    },
    {
      name: 'High Screen Time',
      score: Math.max(0, latest.screen_time_day - 3),
      val: `${latest.screen_time_day}h / day`,
      note: latest.screen_time_day <= 3
        ? `${latest.screen_time_day}h — within safe range`
        : `${(latest.screen_time_day - 3).toFixed(1)}h above 3h threshold`,
      color: latest.screen_time_day <= 2 ? '#059669' : latest.screen_time_day <= 4 ? '#D97706' : '#DC2626',
    },
    {
      name: 'Deadline Pressure',
      score: Math.max(0, latest.deadline_count - 3),
      val: `${latest.deadline_count} deadlines`,
      note: latest.deadline_count <= 3
        ? `${latest.deadline_count} — manageable this period`
        : `${latest.deadline_count - 3} above comfortable threshold`,
      color: latest.deadline_count <= 2 ? '#059669' : latest.deadline_count <= 4 ? '#D97706' : '#DC2626',
    },
    {
      name: 'Late Night Study',
      score: latest.late_night_ratio * 3,
      val: `${Math.round(latest.late_night_ratio * 100)}% sessions`,
      note: latest.late_night_ratio < 0.2
        ? 'Minimal late-night study — good'
        : `Reduces study_efficiency by ~${(latest.late_night_ratio * 30).toFixed(0)}%`,
      color: latest.late_night_ratio < 0.2 ? '#059669' : latest.late_night_ratio < 0.5 ? '#D97706' : '#DC2626',
    },
  ]
  const topRisk = riskFactors.sort((a,b) => b.score - a.score)[0]

  // ── 3. Consistency Streak ─────────────────────────────────────────────────
  // Count consecutive recent logs where habit_stability > 0.5
  let streak = 0
  for (let i = logs.length - 1; i >= 0; i--) {
    if ((logs[i].habit_stability ?? 0) >= 0.5) streak++
    else break
  }
  const avgStability = logs.reduce((s,l) => s + (l.habit_stability ?? 0), 0) / logs.length
  const streakColor  = streak >= 5 ? '#059669' : streak >= 2 ? '#D97706' : '#DC2626'

  // ── 4. Study Efficiency ───────────────────────────────────────────────────
  const avgEff    = logs.reduce((s,l) => s + (l.study_efficiency ?? 0), 0) / logs.length
  const currEff   = latest.study_efficiency ?? 0
  const effDelta  = +(currEff - avgEff).toFixed(3)
  const effColor  = currEff >= 0.6 ? '#059669' : currEff >= 0.4 ? '#D97706' : '#DC2626'
  // Main drag on efficiency
  const effDrag   = latest.late_night_ratio > 0.4
    ? 'Late-night sessions reducing score'
    : currEff < avgEff
    ? 'Below your personal average'
    : 'Above your personal average'

  const cards = [
    {
      label    : 'Avg Performance',
      value    : avgPerf.toFixed(1),
      unit     : '/ 100',
      sub      : perfDelta === 0 ? 'Holding steady'
        : `${perfDelta > 0 ? '▲' : '▼'} ${Math.abs(perfDelta)} vs your avg`,
      subColor : perfColor,
      color    : perfDelta >= 0 ? '#5B4FE8' : '#DC2626',
      bar      : avgPerf / 100,
      barColor : '#5B4FE8',
      note     : `Across ${logs.length} log${logs.length !== 1 ? 's' : ''}`,
    },
    {
      label    : 'Top Risk Factor',
      value    : topRisk.name,
      unit     : '',
      sub      : topRisk.val,
      subColor : topRisk.color,
      color    : topRisk.color,
      bar      : Math.min(1, topRisk.score / 4),
      barColor : topRisk.color,
      note     : topRisk.note,
    },
    {
      label    : 'Consistency Streak',
      value    : `${streak}`,
      unit     : ` log${streak !== 1 ? 's' : ''}`,
      sub      : streak === 0 ? 'Last log was volatile'
        : streak >= logs.length ? 'All logs consistent!'
        : `${streak} of ${logs.length} recent logs stable`,
      subColor : streakColor,
      color    : streakColor,
      bar      : streak / Math.max(logs.length, 1),
      barColor : streakColor,
      note     : `habit_stability ≥ 0.5 · avg ${avgStability.toFixed(2)}`,
    },
    {
      label    : 'Study Efficiency',
      value    : currEff.toFixed(2),
      unit     : '',
      sub      : `${effDelta >= 0 ? '+' : ''}${effDelta.toFixed(3)} vs your avg`,
      subColor : effColor,
      color    : effColor,
      bar      : Math.min(1, currEff),
      barColor : effColor,
      note     : effDrag,
    },
  ]

  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
      {cards.map(c => (
        <div key={c.label} className="card-hover" style={{padding:'16px 18px', display:'flex', flexDirection:'column', gap:0}}>
          <p className="section-label">{c.label}</p>

          {/* Main value */}
          <div style={{display:'flex', alignItems:'baseline', gap:4, marginTop:6}}>
            <p style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.5rem', color:c.color, lineHeight:1}}>
              {c.value}
            </p>
            {c.unit && (
              <span style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color:'var(--color-muted)'}}>
                {c.unit}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div style={{height:4, background:'var(--color-border)', borderRadius:99, overflow:'hidden', margin:'8px 0'}}>
            <div style={{
              height:'100%', borderRadius:99,
              width:`${Math.round(c.bar * 100)}%`,
              background: c.barColor,
              transition:'width 1s cubic-bezier(0.16,1,0.3,1)',
            }}/>
          </div>

          {/* Sub stat */}
          <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.7rem', fontWeight:600, color:c.subColor, marginBottom:4}}>
            {c.sub}
          </p>

          {/* Note */}
          <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.7rem', color:'var(--color-muted)', lineHeight:1.4, marginTop:'auto', paddingTop:4, opacity:0.8}}>
            {c.note}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { dark }      = useTheme()
  const [dimData,    setDimData]   = useState(null)
  const [ablData,    setAblData]   = useState(null)
  const [radar,      setRadar]     = useState(null)
  const [liveData,   setLiveData]  = useState(null)
  const [loading,    setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([api.diminishing(), api.ablation(), api.riskRadar(), api.dashboard()])
      .then(([d,a,r,dash]) => {
        setDimData(d?.curve ?? [])
        setAblData(a?.results ?? [])
        setRadar(r ?? {})
        setLiveData(dash ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    }, [])
  const inflection = dimData?.find((d,i,arr) =>
    i > 0 && d.marginal_gain < arr[i-1].marginal_gain && arr[i-1].marginal_gain > 0
  )

  // Axis tick colour that works on BOTH light and dark backgrounds
  const tickFill    = dark ? 'rgba(148,144,255,0.6)' : 'rgba(80,70,140,0.55)'
  const tickStyle   = { fill: tickFill, fontSize:10, fontFamily:'JetBrains Mono,monospace' }
  const gridStroke  = dark ? 'rgba(91,79,232,0.08)' : 'rgba(91,79,232,0.06)'

  if (loading) return <Spinner/>

  return (
    <div style={{display:'flex', flexDirection:'column', gap:24}}>

      {/* Header */}
      <div>
        <p className="section-label">Analytics</p>
        <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.75rem', color:'var(--color-paper)', marginTop:4}}>
          Deep Insights
        </h1>
        <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'var(--color-muted)', marginTop:4}}>
          Research-grade feature analysis — based on notebook Model 1 importances
        </p>
      </div>

      {/* Live stat cards row — computed from user's actual logs */}
      <LiveStatCards logs={liveData?.logs} latest={liveData?.latest}/>

      {/* Risk Radar — full width so it gets the space it deserves */}
      <div className="card">
        <div style={{display:'grid', gridTemplateColumns:'260px 1fr', gap:24, alignItems:'start'}}>
          <div>
            <p className="section-label">Risk Radar</p>
            <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.75rem', color:'var(--color-muted)', margin:'6px 0 14px', lineHeight:1.6}}>
              Trend slopes computed from your last {radar?.weeks_used || '—'} logs.
              Mirrors notebook GROUP 2 (slope3) + GROUP 4 (pressure_momentum).
            </p>
            {radar && (
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {[
                  { label:'Pressure trend', val: radar.pressure_momentum,    good:'releasing', bad:'building' },
                  { label:'Perf trend',     val: radar.performance_momentum, good:'rising',    bad:'declining' },
                ].map(r => {
                  const color = r.val === r.good ? '#059669' : r.val === r.bad ? '#DC2626' : 'var(--color-muted)'
                  return (
                    <div key={r.label} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color:'var(--color-muted)'}}>{r.label}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.7rem', fontWeight:700, color, textTransform:'capitalize'}}>{r.val}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <RiskRadar data={radar}/>
        </div>
      </div>

      {/* Diminishing Returns */}
      <div className="card">
        <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16}}>
          <div>
            <p className="section-label">Effort–Outcome: Diminishing Returns</p>
            <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'var(--color-muted)', marginTop:2, lineHeight:1.5}}>
              Marginal performance gain per 0.5h extra study. Plateau appears because study_efficiency saturates.
            </p>
          </div>
          {inflection && (
            <div style={{
              padding:'8px 16px', borderRadius:10, textAlign:'right',
              background:'rgba(91,79,232,0.05)', border:'1px solid rgba(91,79,232,0.12)',
            }}>
              <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color:'var(--color-muted)'}}>
                Returns start declining at
              </p>
              <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1.25rem', color:'#5B4FE8'}}>
                {inflection.study_hours}h / day
              </p>
            </div>
          )}
        </div>

        {dimData ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dimData} margin={{top:5, right:10, bottom:20, left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke}/>
              <XAxis dataKey="study_hours" tick={tickStyle}
                label={{value:'Study Hours / day', position:'insideBottom', offset:-10, fill:tickFill, fontSize:9}}
                axisLine={false} tickLine={false}/>
              <YAxis tick={tickStyle} axisLine={false} tickLine={false}/>
              <Tooltip content={<TT/>}/>
              <Legend wrapperStyle={{fontSize:10, fontFamily:'JetBrains Mono,monospace', color:tickFill}}/>
              <ReferenceLine y={0} stroke={gridStroke}/>
              {inflection && (
                <ReferenceLine x={inflection.study_hours} stroke="rgba(91,79,232,0.3)" strokeDasharray="4 2"
                  label={{value:'plateau', fill:'#5B4FE8', fontSize:9, position:'top', opacity:0.6}}/>
              )}
              <Line type="monotone" dataKey="performance"   name="Performance"   stroke="#5B4FE8" strokeWidth={2} dot={{fill:'#5B4FE8',r:2}}/>
              <Line type="monotone" dataKey="marginal_gain" name="Marginal Gain" stroke="#0D9488" strokeWidth={2} strokeDasharray="4 2" dot={{fill:'#0D9488',r:2}}/>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{height:250, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.75rem', color:'var(--color-muted)'}}>
              No data — submit at least one log
            </p>
          </div>
        )}

        <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.625rem', color:'var(--color-muted)', marginTop:10, opacity:0.6}}>
          Δperf = Δstudy×3.2 + Δefficiency×28 — weights proportional to notebook feature importances (0.3224, 0.2985)
        </p>
      </div>

      {/* Ablation Study */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>

        {/* Bar chart */}
        <div className="card">
          <p className="section-label">Ablation Study — Feature Impact</p>
          <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'var(--color-muted)', margin:'4px 0 16px', lineHeight:1.5}}>
            Performance drop when each feature is set to worst-case value.
          </p>
          {ablData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ablData} layout="vertical" margin={{top:0, right:10, bottom:0, left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false}/>
                <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="feature"
                  tick={{...tickStyle, fontSize:10}} axisLine={false} tickLine={false} width={120}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="impact" name="Performance Drop" fill="#DC2626" radius={[0,4,4,0]} fillOpacity={0.7}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <Spinner/>}
        </div>

        {/* Table */}
        <div className="card" style={{overflowX:'auto'}}>
          <p className="section-label" style={{marginBottom:14}}>Ablation Results</p>
          {ablData ? (
            <table style={{width:'100%', fontFamily:'JetBrains Mono,monospace', fontSize:'0.72rem', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:`1px solid var(--color-border)`}}>
                  {['Feature','Baseline','Ablated','Impact'].map((h,i) => (
                    <th key={h} style={{
                      padding:'0 10px 10px 0', textAlign: i===0 ? 'left' : 'right',
                      color:'var(--color-muted)', fontWeight:500, opacity:0.7,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ablData.map((r,i) => (
                  <tr key={i} style={{borderBottom:`1px solid var(--color-border)`, transition:'background 0.1s'}}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-lead)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{padding:'9px 10px 9px 0', color:'var(--color-muted)', fontSize:'0.7rem'}}>{r.feature}</td>
                    <td style={{padding:'9px 10px 9px 0', textAlign:'right', color:'var(--color-muted)', opacity:0.6}}>{r.baseline_score?.toFixed(1)}</td>
                    <td style={{padding:'9px 10px 9px 0', textAlign:'right', color:'var(--color-paper)'}}>{r.ablated_score?.toFixed(1)}</td>
                    <td style={{padding:'9px 0', textAlign:'right'}}>
                      <span style={{color:'#DC2626', fontWeight:700}}>−{r.impact?.toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Spinner/>}
          <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.6rem', color:'var(--color-muted)', marginTop:10, opacity:0.5}}>
            Ablation sets each feature to worst-case · impact = baseline − ablated
          </p>
        </div>
      </div>

    </div>
  )
}
