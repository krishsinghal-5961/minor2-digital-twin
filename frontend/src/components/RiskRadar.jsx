import { useMemo } from 'react'

const SIZE = 210, CX = 105, CY = 105, R = 72, LEVELS = 4

function polar(angle, r) {
  const a = (angle - 90) * (Math.PI / 180)
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}
function toPath(pts) {
  return pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'
}

export default function RiskRadar({ data }) {
  if (!data) return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:140,
                 fontFamily:'JetBrains Mono,monospace', fontSize:'0.75rem', color:'var(--color-muted)', textAlign:'center'}}>
      3+ logs needed<br/>to compute risk radar
    </div>
  )
  const { axes, pressure_momentum, performance_momentum, weeks_used } = data
  const n    = axes.length
  const step = 360 / n

  const gridPaths = useMemo(() => Array.from({length:LEVELS}, (_,l) => {
    const r = R * ((l+1)/LEVELS)
    return toPath(axes.map((_,i) => polar(i*step, r)))
  }), [n, step])

  const dataPts  = axes.map((a,i) => polar(i*step, R*(a.value/100)))
  const dataPath = toPath(dataPts)
  const avg      = axes.reduce((s,a) => s+a.value, 0) / n
  const color    = avg > 62 ? '#DC2626' : avg > 40 ? '#D97706' : '#0D9488'

  const mLabel = m => m === 'building' || m === 'declining' ? '#DC2626' : m === 'stable' ? 'var(--color-muted)' : '#0D9488'

  return (
    <div>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{display:'block', margin:'0 auto'}}>
        {/* Grid */}
        {gridPaths.map((d,i) => <path key={i} d={d} fill="none" stroke="var(--color-border)" strokeWidth={0.75}/>)}
        {/* Axis lines */}
        {axes.map((_,i) => {
          const o = polar(i*step, R)
          return <line key={i} x1={CX} y1={CY} x2={o.x} y2={o.y} stroke="var(--color-border)" strokeWidth={0.75}/>
        })}
        {/* Data fill */}
        <path d={dataPath} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1.75}/>
        {/* Data dots */}
        {dataPts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} fillOpacity={0.75}/>)}
        {/* Labels */}
        {axes.map((a,i) => {
          const pos = polar(i*step, R+20)
          const words = a.axis.split(' ')
          return (
            <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle">
              {words.map((w,wi) => (
                <tspan key={wi} x={pos.x} dy={wi===0 ? (words.length>1?-4:0) : 10}
                  style={{fontFamily:'JetBrains Mono,monospace', fontSize:7, fill:'var(--color-muted)'}}>
                  {w}
                </tspan>
              ))}
            </text>
          )
        })}
        {/* Center */}
        <text x={CX} y={CY-5} textAnchor="middle"
          style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:18, fill:color}}>
          {avg.toFixed(0)}
        </text>
        <text x={CX} y={CY+8} textAnchor="middle"
          style={{fontFamily:'JetBrains Mono,monospace', fontSize:7, fill:'var(--color-muted)'}}>
          risk idx
        </text>
      </svg>

      <div style={{display:'flex', justifyContent:'center', gap:20, marginTop:8, flexWrap:'wrap'}}>
        {[['Pressure', pressure_momentum], ['Perf', performance_momentum]].map(([k,m]) => (
          <div key={k} style={{textAlign:'center'}}>
            <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.6rem', color:'var(--color-muted)', marginBottom:2}}>{k}</p>
            <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.7rem', fontWeight:600, textTransform:'capitalize', color:mLabel(m)}}>{m}</p>
          </div>
        ))}
        <div style={{textAlign:'center'}}>
          <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.6rem', color:'var(--color-muted)', marginBottom:2}}>Window</p>
          <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.7rem', color:'var(--color-muted)'}}>{weeks_used} logs</p>
        </div>
      </div>
    </div>
  )
}
