import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import RiskRadar from '../components/RiskRadar'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend
} from 'recharts'

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-lead border border-white/10 rounded-xl px-4 py-3 text-xs font-mono shadow-xl">
      <p className="text-paper/50 mb-2">{label}</p>
      {payload.map(p => <p key={p.name} style={{color:p.color}}>{p.name}: {p.value}</p>)}
    </div>
  )
}

export default function Analytics() {
  const [dimData,  setDimData]  = useState(null)
  const [ablData,  setAblData]  = useState(null)
  const [radar,    setRadar]    = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([api.diminishing(), api.ablation(), api.riskRadar()])
      .then(([d, a, r]) => { setDimData(d.curve); setAblData(a.results); setRadar(r) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  // Find the inflection point (where marginal gain starts declining)
  const inflection = dimData?.find((d, i, arr) =>
    i > 0 && d.marginal_gain < arr[i-1].marginal_gain && arr[i-1].marginal_gain > 0
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="section-label">Analytics</p>
        <h1 className="font-display font-bold text-3xl text-paper">Deep Insights</h1>
        <p className="text-paper/40 text-sm font-body mt-1">
          Research-grade feature analysis — based on notebook Model 1 importances
        </p>
      </div>

      {/* Risk Radar + feature cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card">
          <p className="section-label mb-1">Risk Radar</p>
          <p className="text-paper/30 text-xs font-body mb-3">
            Trend slopes from notebook GROUP 2 (slope3) + GROUP 4 (pressure_momentum)
          </p>
          <RiskRadar data={radar}/>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label:'Top Feature',     value:'Study Hours',      note:'importance 0.3224 — notebook Model 1',   color:'text-accent' },
            { label:'2nd Feature',     value:'Study Efficiency', note:'importance 0.2985 — study×(1−ln)/(s+1)', color:'text-accent-soft' },
            { label:'3rd Feature',     value:'Deadline Density', note:'importance 0.0880 — deadline_count/7',   color:'text-paper/70' },
            { label:'Fuzzy Modules',   value:'12 + 24 rules',    note:'Module 1 (pressure) + Module 2 (alignment, expanded v2)', color:'text-paper/70' },
          ].map(c => (
            <div key={c.label} className="card py-4">
              <p className="section-label">{c.label}</p>
              <p className={`font-display font-bold text-lg mt-1 ${c.color}`}>{c.value}</p>
              <p className="text-paper/25 text-xs font-mono mt-1">{c.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Diminishing Returns */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
          <div>
            <p className="section-label">Effort–Outcome: Diminishing Returns</p>
            <p className="text-paper/40 text-sm font-body mt-0.5">
              Marginal performance gain per 0.5h extra study. Plateau appears because study_efficiency saturates.
            </p>
          </div>
          {inflection && (
            <div className="bg-accent/5 border border-accent/15 rounded-xl px-4 py-2 text-right">
              <p className="text-paper/30 text-xs font-mono">Returns start declining at</p>
              <p className="text-accent font-display font-bold">{inflection.study_hours}h / day</p>
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dimData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
            <XAxis dataKey="study_hours"
              tick={{fill:'#ffffff30',fontSize:11,fontFamily:'JetBrains Mono'}}
              label={{value:'Study Hours / day', position:'insideBottom', offset:-2, fill:'#ffffff20', fontSize:10}}
              axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:'#ffffff30',fontSize:11,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
            <Tooltip content={<TT/>}/>
            <Legend wrapperStyle={{fontSize:10,fontFamily:'JetBrains Mono',color:'#ffffff40'}}/>
            <ReferenceLine y={0} stroke="#ffffff10"/>
            {inflection && <ReferenceLine x={inflection.study_hours} stroke="#6C63FF50" strokeDasharray="4 2"
              label={{value:'plateau', fill:'#6C63FF80', fontSize:9, position:'top'}}/>}
            <Line type="monotone" dataKey="performance"   name="Performance"    stroke="#6C63FF" strokeWidth={2} dot={{fill:'#6C63FF',r:2}}/>
            <Line type="monotone" dataKey="marginal_gain" name="Marginal Gain"  stroke="#2DD4BF" strokeWidth={2} strokeDasharray="4 2" dot={{fill:'#2DD4BF',r:2}}/>
          </LineChart>
        </ResponsiveContainer>
        <p className="text-paper/20 text-xs font-mono mt-3">
          Formula: Δperf = Δstudy×3.2 + Δefficiency×28 — weights proportional to notebook feature importances (0.3224, 0.2985)
        </p>
      </div>

      {/* Ablation Study */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <p className="section-label mb-1">Ablation Study — Feature Impact</p>
          <p className="text-paper/40 text-sm font-body mb-5">
            Performance drop when each feature is set to its worst-case value.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ablData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false}/>
              <XAxis type="number" tick={{fill:'#ffffff30',fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="feature" tick={{fill:'#ffffff50',fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} width={110}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="impact" name="Performance Drop" fill="#F43F5E" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card overflow-x-auto">
          <p className="section-label mb-4">Ablation Results</p>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-paper/30 text-xs border-b border-white/5">
                <th className="text-left pb-3 pr-4">Feature Removed</th>
                <th className="text-right pb-3 pr-4">Baseline</th>
                <th className="text-right pb-3 pr-4">Ablated</th>
                <th className="text-right pb-3">Impact</th>
              </tr>
            </thead>
            <tbody>
              {ablData?.map((r, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-4 text-paper/60 text-xs">{r.feature}</td>
                  <td className="py-2.5 pr-4 text-right text-paper/40">{r.baseline_score?.toFixed(1)}</td>
                  <td className="py-2.5 pr-4 text-right text-paper">{r.ablated_score?.toFixed(1)}</td>
                  <td className="py-2.5 text-right">
                    <span className="text-risk-high font-semibold">−{r.impact?.toFixed(1)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-paper/15 text-xs font-mono mt-3">
            Ablation sets each feature to worst-case · impact = baseline − ablated
          </p>
        </div>
      </div>
    </div>
  )
}
