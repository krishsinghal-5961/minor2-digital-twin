import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import RiskBadge from '../components/RiskBadge'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-lead border border-white/10 rounded-xl px-4 py-3 text-xs font-mono shadow-xl">
      <p className="text-paper/50 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function History() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('performance')

  useEffect(() => {
    api.history().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>

  const logs = data?.logs || []
  const chartData = logs.map((l, i) => ({
    name              : `Log ${i+1}`,
    Performance       : l.performance_score,
    'Fuzzy Pressure'  : +(l.fuzzy_pressure_score * 100).toFixed(1),
    'Fuzzy Alignment' : +(l.fuzzy_alignment_score * 100).toFixed(1),
    'Study Hours'     : l.study_hours_day,
    'Sleep Hours'     : l.sleep_hours_day,
    'Screen Time'     : l.screen_time_day,
  }))

  const tabs = [
    { key:'performance', label:'Performance',  lines:[{ key:'Performance', color:'#6C63FF' }] },
    { key:'pressure',    label:'Pressure',     lines:[{ key:'Fuzzy Pressure', color:'#F43F5E' }] },
    { key:'alignment',   label:'Alignment',    lines:[{ key:'Fuzzy Alignment', color:'#10B981' }] },
    { key:'habits',      label:'Habits',       lines:[{ key:'Study Hours', color:'#6C63FF' },{ key:'Sleep Hours', color:'#2DD4BF' },{ key:'Screen Time', color:'#F59E0B' }] },
  ]

  const activeTab = tabs.find(t => t.key === tab)

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="section-label">History</p>
        <h1 className="font-display font-bold text-3xl text-paper">Trend Analysis</h1>
        <p className="text-paper/40 text-sm font-body mt-1">{logs.length} entries recorded</p>
      </div>

      {logs.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-paper/40">No history yet. Submit some logs first.</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="card">
            {/* Tab switcher */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-all duration-200
                    ${tab === t.key ? 'bg-accent/20 text-accent border border-accent/30' : 'text-paper/40 hover:text-paper border border-white/5'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="name" tick={{ fill:'#ffffff30', fontSize:11, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#ffffff30', fontSize:11, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize:11, fontFamily:'JetBrains Mono', color:'#ffffff50' }} />
                {activeTab.lines.map(l => (
                  <Line key={l.key} type="monotone" dataKey={l.key}
                    stroke={l.color} strokeWidth={2} dot={{ fill:l.color, r:3 }}
                    activeDot={{ r:5, fill:l.color }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Log table */}
          <div className="card overflow-x-auto">
            <p className="section-label mb-4">All Entries</p>
            <table className="w-full text-sm font-mono min-w-[700px]">
              <thead>
                <tr className="text-paper/30 text-xs border-b border-white/5">
                  <th className="text-left pb-3 pr-4">Date</th>
                  <th className="text-right pb-3 pr-4">Performance</th>
                  <th className="text-right pb-3 pr-4">Study</th>
                  <th className="text-right pb-3 pr-4">Sleep</th>
                  <th className="text-center pb-3 pr-4">ML Pressure</th>
                  <th className="text-center pb-3">Alignment</th>
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().map((l, i) => (
                  <tr key={l.id || i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4 text-paper/50 text-xs">
                      {new Date(l.logged_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                    </td>
                    <td className="py-3 pr-4 text-right text-paper">{l.performance_score?.toFixed(1)}</td>
                    <td className="py-3 pr-4 text-right text-paper/60">{l.study_hours_day}h</td>
                    <td className="py-3 pr-4 text-right text-paper/60">{l.sleep_hours_day}h</td>
                    <td className="py-3 pr-4 text-center"><RiskBadge label={l.pressure_label} /></td>
                    <td className="py-3 text-center"><RiskBadge label={l.fuzzy_alignment_label} type="alignment" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
