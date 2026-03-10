import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import RiskRadar from '../components/RiskRadar'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

// Theme-aware tooltip — uses CSS variables so it works in both light and dark
const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'var(--color-card)', border:'1px solid var(--color-border)',
      borderRadius:10, padding:'10px 14px',
      fontFamily:'JetBrains Mono,monospace', fontSize:11,
      boxShadow:'0 4px 20px rgba(0,0,0,0.12)',
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

export default function Analytics() {
  const [dimData, setDimData] = useState(null)
  const [ablData, setAblData] = useState(null)
  const [radar,   setRadar]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.diminishing(), api.ablation(), api.riskRadar()])
      .then(([d,a,r]) => { setDimData(d.curve); setAblData(a.results); setRadar(r) })
      .finally(() => setLoading(false))
  }, [])

  const inflection = dimData?.find((d,i,arr) =>
    i > 0 && d.marginal_gain < arr[i-1].marginal_gain && arr[i-1].marginal_gain > 0
  )

  // Recharts tick styles — must be passed explicitly, can't use CSS vars in SVG text
  // We use a mid-grey that reads on both light and dark
  const tickStyle = { fill:'#9490FF', fontSize:10, fontFamily:'JetBrains Mono,monospace', opacity:0.55 }
  const gridStroke = 'rgba(91,79,232,0.07)'

  if (loading) return <Spinner/>

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      <div>
        <p className="section-label">Analytics</p>
        <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.75rem',color:'var(--color-paper)',marginTop:4}}>
          Deep Insights
        </h1>
        <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'var(--color-muted)',marginTop:4}}>
          Research-grade feature analysis — based on notebook Model 1 importances
        </p>
      </div>

      {/* Risk Radar + feature cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:16}} className="flex-col-on-mobile">
        <div className="card">
          <p className="section-label">Risk Radar</p>
          <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.75rem',color:'var(--color-muted)',marginBottom:12,marginTop:2,lineHeight:1.5}}>
            Trend slopes from notebook GROUP 2 (slope3) + GROUP 4 (pressure_momentum)
          </p>
          <RiskRadar data={radar}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            { label:'Top Feature',   value:'Study Hours',      note:'importance 0.3224 — notebook Model 1',              accent:'#5B4FE8' },
            { label:'2nd Feature',   value:'Study Efficiency', note:'importance 0.2985 — study×(1−ln)/(study+1)',         accent:'#7B72F0' },
            { label:'3rd Feature',   value:'Deadline Density', note:'importance 0.0880 — deadline_count / 7',             accent:null },
            { label:'Fuzzy Modules', value:'12 + 24 rules',    note:'Module 1 (pressure) + Module 2 (alignment, expanded v2)', accent:null },
          ].map(c => (
            <div key={c.label} className="card" style={{padding:'14px 16px'}}>
              <p className="section-label">{c.label}</p>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1rem',color:c.accent||'var(--color-paper)',marginTop:4,lineHeight:1.2}}>
                {c.value}
              </p>
              <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.625rem',color:'var(--color-muted)',marginTop:4,lineHeight:1.4,opacity:0.7}}>
                {c.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Diminishing Returns chart */}
      <div className="card">
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:16}}>
          <div>
            <p className="section-label">Effort–Outcome: Diminishing Returns</p>
            <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'var(--color-muted)',marginTop:2}}>
              Marginal performance gain per 0.5h extra study. Plateau appears because study_efficiency saturates.
            </p>
          </div>
          {inflection && (
            <div style={{
              padding:'8px 14px', borderRadius:10, textAlign:'right',
              background:'rgba(91,79,232,0.05)', border:'1px solid rgba(91,79,232,0.12)',
            }}>
              <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.65rem',color:'var(--color-muted)'}}>Returns start declining at</p>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.25rem',color:'#5B4FE8'}}>{inflection.study_hours}h / day</p>
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dimData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke}/>
            <XAxis dataKey="study_hours" tick={tickStyle}
              label={{value:'Study Hours / day',position:'insideBottom',offset:-2,fill:'#9490FF',fontSize:9,opacity:0.5}}
              axisLine={false} tickLine={false}/>
            <YAxis tick={tickStyle} axisLine={false} tickLine={false}/>
            <Tooltip content={<TT/>}/>
            <Legend wrapperStyle={{fontSize:10,fontFamily:'JetBrains Mono,monospace',opacity:0.5}}/>
            <ReferenceLine y={0} stroke={gridStroke}/>
            {inflection && (
              <ReferenceLine x={inflection.study_hours} stroke="rgba(91,79,232,0.3)" strokeDasharray="4 2"
                label={{value:'plateau',fill:'#5B4FE8',fontSize:9,position:'top',opacity:0.6}}/>
            )}
            <Line type="monotone" dataKey="performance"   name="Performance"   stroke="#5B4FE8" strokeWidth={2} dot={{fill:'#5B4FE8',r:2}}/>
            <Line type="monotone" dataKey="marginal_gain" name="Marginal Gain" stroke="#0D9488" strokeWidth={2} strokeDasharray="4 2" dot={{fill:'#0D9488',r:2}}/>
          </LineChart>
        </ResponsiveContainer>
        <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.625rem',color:'var(--color-muted)',marginTop:10,opacity:0.6}}>
          Formula: Δperf = Δstudy×3.2 + Δefficiency×28 — weights proportional to notebook feature importances (0.3224, 0.2985)
        </p>
      </div>

      {/* Ablation Study */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="card">
          <p className="section-label">Ablation Study — Feature Impact</p>
          <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',color:'var(--color-muted)',margin:'4px 0 16px',lineHeight:1.5}}>
            Performance drop when each feature is set to worst-case value.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ablData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false}/>
              <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="feature" tick={{...tickStyle,opacity:0.7}} axisLine={false} tickLine={false} width={115}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="impact" name="Performance Drop" fill="#DC2626" radius={[0,4,4,0]} fillOpacity={0.7}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{overflowX:'auto'}}>
          <p className="section-label" style={{marginBottom:14}}>Ablation Results</p>
          <table style={{width:'100%',fontFamily:'JetBrains Mono,monospace',fontSize:'0.75rem',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:`1px solid var(--color-border)`}}>
                <th style={{textAlign:'left',paddingBottom:10,paddingRight:14,color:'var(--color-muted)',fontWeight:500,opacity:0.7}}>Feature</th>
                <th style={{textAlign:'right',paddingBottom:10,paddingRight:14,color:'var(--color-muted)',fontWeight:500,opacity:0.7}}>Baseline</th>
                <th style={{textAlign:'right',paddingBottom:10,paddingRight:14,color:'var(--color-muted)',fontWeight:500,opacity:0.7}}>Ablated</th>
                <th style={{textAlign:'right',paddingBottom:10,color:'var(--color-muted)',fontWeight:500,opacity:0.7}}>Impact</th>
              </tr>
            </thead>
            <tbody>
              {ablData?.map((r,i) => (
                <tr key={i} style={{borderBottom:`1px solid var(--color-border)`}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--color-lead)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'9px 14px 9px 0',color:'var(--color-muted)',fontSize:'0.7rem'}}>{r.feature}</td>
                  <td style={{padding:'9px 14px 9px 0',textAlign:'right',color:'var(--color-muted)',opacity:0.6}}>{r.baseline_score?.toFixed(1)}</td>
                  <td style={{padding:'9px 14px 9px 0',textAlign:'right',color:'var(--color-paper)'}}>{r.ablated_score?.toFixed(1)}</td>
                  <td style={{padding:'9px 0',textAlign:'right'}}>
                    <span style={{color:'#DC2626',fontWeight:600}}>−{r.impact?.toFixed(1)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',marginTop:10,opacity:0.5}}>
            Ablation sets each feature to worst-case · impact = baseline − ablated
          </p>
        </div>
      </div>
    </div>
  )
}
