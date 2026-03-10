// SVG semi-circle gauge
export default function ScoreGauge({ score = 0, label = 'Score' }) {
  const pct   = Math.min(100, Math.max(0, score)) / 100
  const R     = 60
  const circ  = Math.PI * R   // semicircle circumference
  const color = score >= 65 ? '#059669' : score >= 45 ? '#D97706' : '#DC2626'
  const dash  = pct * circ
  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:0}}>
      <svg width={160} height={90} viewBox="0 0 160 90">
        {/* Track */}
        <path d="M 10,80 A 70,70 0 0,1 150,80" fill="none"
          stroke="var(--color-border)" strokeWidth={10} strokeLinecap="round"/>
        {/* Fill */}
        <path d="M 10,80 A 70,70 0 0,1 150,80" fill="none"
          stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${dash * (140/circ)} 140`}
          style={{transition:'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)', transformOrigin:'center'}}/>
        {/* Score text */}
        <text x="80" y="72" textAnchor="middle"
          style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:28, fill:color}}>
          {Math.round(score)}
        </text>
        <text x="80" y="85" textAnchor="middle"
          style={{fontFamily:'JetBrains Mono,monospace', fontSize:8, fill:'var(--color-muted)'}}>
          / 100
        </text>
      </svg>
      <p style={{fontFamily:'DM Sans,sans-serif', fontWeight:500, fontSize:'0.75rem',
                 color:'var(--color-muted)', marginTop:-4}}>{label}</p>
    </div>
  )
}
