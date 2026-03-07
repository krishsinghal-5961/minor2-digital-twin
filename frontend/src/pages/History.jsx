import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import RiskBadge from '../components/RiskBadge'
import RiskRadar from '../components/RiskRadar'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-lead border border-white/10 rounded-xl px-4 py-3 text-xs font-mono shadow-xl">
      <p className="text-paper/50 mb-2">{label}</p>
      {payload.map(p => <p key={p.name} style={{color:p.color}}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>)}
    </div>
  )
}

export default function History() {
  const [data,     setData]     = useState(null)
  const [radar,    setRadar]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('performance')

  useEffect(() => {
    Promise.all([api.history(), api.riskRadar()])
      .then(([h, r]) => { setData(h); setRadar(r) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const logs = data?.logs || []
  const fmt  = (d) => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})

  const chartData = logs.map((l, i) => ({
    name               : fmt(l.logged_at),
    'Performance'      : +l.performance_score.toFixed(1),
    'Fuzzy Pressure %' : +(l.fuzzy_pressure_score * 100).toFixed(1),
    'Goal Alignment %' : +(l.fuzzy_alignment_score * 100).toFixed(1),
    'Study h'          : l.study_hours_day,
    'Sleep h'          : l.sleep_hours_day,
    'Screen h'         : l.screen_time_day,
    'Study Efficiency' : +(l.study_efficiency * 100).toFixed(1),  // ×100 for readability
    'Habit Stability'  : +(l.habit_stability  * 100).toFixed(1),
  }))

  const tabs = [
    { key:'performance', label:'Performance',  lines:[{key:'Performance',     color:'#6C63FF'}] },
    { key:'pressure',    label:'Pressure',     lines:[{key:'Fuzzy Pressure %',color:'#F43F5E'}] },
    { key:'alignment',   label:'Alignment',    lines:[{key:'Goal Alignment %',color:'#10B981'}] },
    { key:'habits',      label:'Raw Habits',   lines:[
        {key:'Study h', color:'#6C63FF'},{key:'Sleep h',color:'#2DD4BF'},{key:'Screen h',color:'#F59E0B'}
    ]},
    { key:'derived',     label:'Derived Features', lines:[
        {key:'Study Efficiency',color:'#A78BFA'},{key:'Habit Stability',color:'#34D399'}
    ]},
  ]
  const activeTab = tabs.find(t => t.key === tab)

  // Compute average per metric for summary
  const avg = (key) => logs.length ? (logs.reduce((s,l)=>s+(l[key]||0),0)/logs.length).toFixed(1) : '—'

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="section-label">History</p>
        <h1 className="font-display font-bold text-3xl text-paper">Trend Analysis</h1>
        <p className="text-paper/40 text-sm font-body mt-1">{logs.length} logs · data crosschecked against notebook feature engineering</p>
      </div>

      {logs.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-paper/40">No history yet. Submit some logs first.</p>
        </div>
      ) : (<>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label:'Avg Performance',  value: avg('performance_score'),       unit:'',  color:'text-accent' },
            { label:'Avg Sleep',        value: avg('sleep_hours_day'),          unit:'h', color: parseFloat(avg('sleep_hours_day'))>=7?'text-risk-low':'text-risk-medium' },
            { label:'Avg Study',        value: avg('study_hours_day'),          unit:'h', color:'text-paper' },
            { label:'Avg Screen Time',  value: avg('screen_time_day'),          unit:'h', color: parseFloat(avg('screen_time_day'))<=2?'text-risk-low':'text-risk-medium' },
          ].map(s => (
            <div key={s.label} className="card py-4">
              <p className="section-label">{s.label}</p>
              <p className={`font-display font-bold text-2xl mt-1 ${s.color}`}>{s.value}{s.unit}</p>
            </div>
          ))}
        </div>

        {/* Chart + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart */}
          <div className="card lg:col-span-2">
            <div className="flex gap-2 mb-5 flex-wrap">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200
                    ${tab===t.key?'bg-accent/20 text-accent border border-accent/30':'text-paper/40 hover:text-paper border border-white/5'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                <XAxis dataKey="name" tick={{fill:'#ffffff30',fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#ffffff30',fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT/>}/>
                <Legend wrapperStyle={{fontSize:10,fontFamily:'JetBrains Mono',color:'#ffffff40'}}/>
                {(tab==='performance') && <ReferenceLine y={50} stroke="#ffffff10" strokeDasharray="4 2"/>}
                {(tab==='pressure'||tab==='alignment') && <ReferenceLine y={50} stroke="#ffffff10" strokeDasharray="4 2" label={{value:'50%',fill:'#ffffff20',fontSize:9}}/>}
                {activeTab.lines.map(l => (
                  <Line key={l.key} type="monotone" dataKey={l.key}
                    stroke={l.color} strokeWidth={2}
                    dot={{fill:l.color,r:3}} activeDot={{r:5,fill:l.color}}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
            {tab === 'derived' && (
              <p className="text-paper/20 text-xs font-mono mt-2">
                study_efficiency = study×(1−late_night)/(study+1) · habit_stability = 1−rolling_std/global_std · ×100 for display
              </p>
            )}
          </div>

          {/* Risk Radar */}
          <div className="card">
            <p className="section-label mb-1">Risk Radar</p>
            <p className="text-paper/30 text-xs font-body mb-3">
              Trend-based early warning from last {radar?.weeks_used || 5} logs
            </p>
            <RiskRadar data={radar}/>
          </div>
        </div>

        {/* Log table */}
        <div className="card overflow-x-auto">
          <p className="section-label mb-4">All Entries</p>
          <table className="w-full text-sm font-mono min-w-[780px]">
            <thead>
              <tr className="text-paper/30 text-xs border-b border-white/5">
                <th className="text-left pb-3 pr-4">Date</th>
                <th className="text-right pb-3 pr-4">Perf</th>
                <th className="text-right pb-3 pr-4">Study</th>
                <th className="text-right pb-3 pr-4">Sleep</th>
                <th className="text-right pb-3 pr-4">Screen</th>
                <th className="text-right pb-3 pr-4">Efficiency</th>
                <th className="text-right pb-3 pr-4">Stability</th>
                <th className="text-center pb-3 pr-4">ML Pressure</th>
                <th className="text-center pb-3">Alignment</th>
              </tr>
            </thead>
            <tbody>
              {[...logs].reverse().map((l, i) => (
                <tr key={l.id||i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 pr-4 text-paper/40 text-xs">{fmt(l.logged_at)}</td>
                  <td className="py-2.5 pr-4 text-right text-paper">{l.performance_score?.toFixed(1)}</td>
                  <td className="py-2.5 pr-4 text-right text-paper/60">{l.study_hours_day}h</td>
                  <td className="py-2.5 pr-4 text-right" style={{color: l.sleep_hours_day>=7?'#2DD4BF':l.sleep_hours_day>=6?'#F59E0B':'#F43F5E'}}>
                    {l.sleep_hours_day}h
                  </td>
                  <td className="py-2.5 pr-4 text-right" style={{color: l.screen_time_day<=2?'#2DD4BF':l.screen_time_day<=4?'#F59E0B':'#F43F5E'}}>
                    {l.screen_time_day}h
                  </td>
                  <td className="py-2.5 pr-4 text-right text-paper/50 text-xs">{l.study_efficiency?.toFixed(3)}</td>
                  <td className="py-2.5 pr-4 text-right text-paper/50 text-xs">{l.habit_stability?.toFixed(3)}</td>
                  <td className="py-2.5 pr-4 text-center"><RiskBadge label={l.pressure_label}/></td>
                  <td className="py-2.5 text-center"><RiskBadge label={l.fuzzy_alignment_label} type="alignment"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </>)}
    </div>
  )
}
