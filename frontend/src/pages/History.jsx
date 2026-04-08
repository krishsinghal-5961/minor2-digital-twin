import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import RiskBadge from '../components/RiskBadge'
import RiskRadar from '../components/RiskRadar'
import { useTheme } from '../hooks/useTheme.jsx'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'

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

const TABS = [
  { key:'performance', label:'Performance',      lines:[{key:'Performance',     color:'#5B4FE8'}] },
  { key:'pressure',    label:'Pressure',         lines:[{key:'Fuzzy Pressure %',color:'#DC2626'}] },
  { key:'alignment',   label:'Alignment',        lines:[{key:'Goal Alignment %',color:'#059669'}] },
  { key:'habits',      label:'Raw Habits',       lines:[
    {key:'Study h',color:'#5B4FE8'},{key:'Sleep h',color:'#0D9488'},{key:'Screen h',color:'#D97706'}
  ]},
  { key:'derived',     label:'Derived Features', lines:[
    {key:'Study Efficiency',color:'#7B72F0'},{key:'Habit Stability',color:'#059669'}
  ]},
]

export default function History() {
  const { dark }  = useTheme()
  const tickFill  = dark ? 'rgba(148,144,255,0.6)' : 'rgba(80,70,140,0.55)'
  const tickStyle = { fill: tickFill, fontSize:10, fontFamily:'JetBrains Mono,monospace' }
  const gridStroke = dark ? 'rgba(91,79,232,0.08)' : 'rgba(91,79,232,0.06)'
  const [data,    setData]    = useState(null)
  const [radar,   setRadar]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('performance')

  useEffect(() => {
    // Fetch independently so a riskRadar 500 doesn't wipe out the logs list
    api.history()
      .then(h => setData(h))
      .catch(err => { console.error('History fetch error:', err); setError(err.message) })
      .finally(() => setLoading(false))

    api.riskRadar()
      .then(r => setRadar(r))
      .catch(err => console.error('Risk radar error (non-fatal):', err))
  }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(91,79,232,0.15)',borderTopColor:'#5B4FE8',animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const logs = data?.logs || []
  const fmt  = d => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})
  const avg  = key => logs.length ? (logs.reduce((s,l)=>s+(l[key]||0),0)/logs.length).toFixed(1) : '—'

  const chartData = logs.map(l => ({
    name              : fmt(l.logged_at),
    'Performance'     : +(l.performance_score||0).toFixed(1),
    'Fuzzy Pressure %': +((l.fuzzy_pressure_score||0)*100).toFixed(1),
    'Goal Alignment %': +((l.fuzzy_alignment_score||0)*100).toFixed(1),
    'Study h'         : l.study_hours_day||0,
    'Sleep h'         : l.sleep_hours_day||0,
    'Screen h'        : l.screen_time_day||0,
    'Study Efficiency': +((l.study_efficiency||0)*100).toFixed(1),
    'Habit Stability' : +((l.habit_stability||0)*100).toFixed(1),
  }))

  const activeTab = TABS.find(t=>t.key===tab)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      <div>
        <p className="section-label">History</p>
        <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.75rem',color:'var(--color-paper)',marginTop:4}}>
          Trend Analysis
        </h1>
        <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'var(--color-muted)',marginTop:4}}>
          {logs.length} logs · crosschecked against notebook feature engineering
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'4rem 2rem'}}>
          <p style={{fontFamily:'DM Sans,sans-serif',color:'var(--color-muted)'}}>No history yet. Submit some logs first.</p>
        </div>
      ) : (<>

        {/* Summary cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[
            { label:'Avg Performance', v:avg('performance_score'), unit:'',  color:'#5B4FE8' },
            { label:'Avg Sleep',       v:avg('sleep_hours_day'),   unit:'h',
              color: parseFloat(avg('sleep_hours_day'))>=7?'#0D9488':'#D97706' },
            { label:'Avg Study',       v:avg('study_hours_day'),   unit:'h', color:'var(--color-paper)' },
            { label:'Avg Screen',      v:avg('screen_time_day'),   unit:'h',
              color: parseFloat(avg('screen_time_day'))<=2?'#0D9488':'#D97706' },
          ].map(s => (
            <div key={s.label} className="card" style={{padding:'14px 16px'}}>
              <p className="section-label">{s.label}</p>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.375rem',color:s.color,marginTop:4}}>
                {s.v}{s.unit}
              </p>
            </div>
          ))}
        </div>

        {/* Chart + Radar */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 240px',gap:16}}>
          <div className="card">
            {/* Tab bar */}
            <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
              {TABS.map(t => (
                <button key={t.key} onClick={()=>setTab(t.key)}
                  style={{
                    padding:'4px 12px', borderRadius:8, fontSize:'0.7rem',
                    fontFamily:'JetBrains Mono,monospace', cursor:'pointer', transition:'all 0.15s',
                    border: tab===t.key ? '1px solid rgba(91,79,232,0.35)' : '1px solid var(--color-border)',
                    background: tab===t.key ? 'rgba(91,79,232,0.1)' : 'transparent',
                    color: tab===t.key ? '#5B4FE8' : 'var(--color-muted)',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke}/>
                <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false}/>
                <YAxis tick={tickStyle} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT/>}/>
                <Legend wrapperStyle={{fontSize:10,fontFamily:'JetBrains Mono,monospace',opacity:0.5}}/>
                {(tab==='performance') && <ReferenceLine y={50} stroke={gridStroke} strokeDasharray="4 2"/>}
                {(tab==='pressure'||tab==='alignment') && <ReferenceLine y={50} stroke={gridStroke} strokeDasharray="4 2"/>}
                {activeTab.lines.map(l => (
                  <Line key={l.key} type="monotone" dataKey={l.key}
                    stroke={l.color} strokeWidth={2}
                    dot={{fill:l.color,r:3}} activeDot={{r:5,fill:l.color}}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
            {tab==='derived' && (
              <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',marginTop:8,opacity:0.6}}>
                study_efficiency = study×(1−late_night)/(study+1) · habit_stability = 1−rolling_std/global_std · ×100 for display
              </p>
            )}
          </div>

          <div className="card">
            <p className="section-label">Risk Radar</p>
            <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.75rem',color:'var(--color-muted)',margin:'4px 0 12px',lineHeight:1.5}}>
              Trend-based early warning from last {radar?.weeks_used||5} logs
            </p>
            <RiskRadar data={radar}/>
          </div>
        </div>

        {/* Log table */}
        <div className="card" style={{overflowX:'auto'}}>
          <p className="section-label" style={{marginBottom:14}}>All Entries</p>
          <table style={{width:'100%',fontFamily:'JetBrains Mono,monospace',fontSize:'0.72rem',borderCollapse:'collapse',minWidth:800}}>
            <thead>
              <tr style={{borderBottom:`1px solid var(--color-border)`}}>
                {['Date','Perf','Study','Sleep','Screen','Efficiency','Stability','ML Pressure','Alignment'].map((h,i) => (
                  <th key={h} style={{
                    padding:'0 12px 10px 0', textAlign: i===0?'left':'right',
                    color:'var(--color-muted)', fontWeight:500, opacity:0.7, whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...logs].reverse().map((l,i) => (
                <tr key={l.id||i} style={{borderBottom:`1px solid var(--color-border)`, transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--color-lead)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'9px 12px 9px 0',color:'var(--color-muted)',whiteSpace:'nowrap'}}>{fmt(l.logged_at)}</td>
                  <td style={{padding:'9px 12px 9px 0',textAlign:'right',color:'var(--color-paper)',fontWeight:600}}>{l.performance_score?.toFixed(1)}</td>
                  <td style={{padding:'9px 12px 9px 0',textAlign:'right',color:'var(--color-muted)'}}>{l.study_hours_day}h</td>
                  <td style={{padding:'9px 12px 9px 0',textAlign:'right',color:l.sleep_hours_day>=7?'#0D9488':l.sleep_hours_day>=6?'#D97706':'#DC2626'}}>{l.sleep_hours_day}h</td>
                  <td style={{padding:'9px 12px 9px 0',textAlign:'right',color:l.screen_time_day<=2?'#0D9488':l.screen_time_day<=4?'#D97706':'#DC2626'}}>{l.screen_time_day}h</td>
                  <td style={{padding:'9px 12px 9px 0',textAlign:'right',color:'var(--color-muted)',opacity:0.7}}>{l.study_efficiency?.toFixed(3)}</td>
                  <td style={{padding:'9px 12px 9px 0',textAlign:'right',color:'var(--color-muted)',opacity:0.7}}>{l.habit_stability?.toFixed(3)}</td>
                  <td style={{padding:'9px 12px 9px 0',textAlign:'right'}}><RiskBadge label={l.pressure_label}/></td>
                  <td style={{padding:'9px 0',textAlign:'right'}}><RiskBadge label={l.fuzzy_alignment_label} type="alignment"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  )
}
