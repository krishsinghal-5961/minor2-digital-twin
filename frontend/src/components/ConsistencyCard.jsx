// notebook GROUP 3: habit_volatility_index = mean(study_vol3, sleep_vol3, screen_vol3)
// consistency = 1 - (hvi / 2.0)
export default function ConsistencyCard({ score, logs }) {
  const hasData = score !== null && score !== undefined
  const pct     = hasData ? Math.round(score * 100) : null
  const color   = !hasData ? 'var(--color-muted)' : pct >= 70 ? '#0D9488' : pct >= 45 ? '#D97706' : '#DC2626'
  const label   = !hasData ? 'No data yet' : pct >= 70 ? 'Consistent' : pct >= 45 ? 'Moderate' : 'Volatile'
  const desc    = !hasData
    ? 'Need 3+ logs to compute rolling habit volatility index.'
    : pct >= 70 ? 'Low habit volatility. Consistent routines support stable predictions.'
    : pct >= 45 ? 'Some habit variation. Stabilising sleep and study hours will help.'
    : 'High volatility detected. Erratic patterns increase workload pressure risk.'

  return (
    <div className="card">
      <p className="section-label">Behavioral Consistency</p>

      <div style={{display:'flex', alignItems:'center', gap:14, marginTop:8}}>
        {/* Ring */}
        <div style={{position:'relative', width:52, height:52, flexShrink:0}}>
          <svg width={52} height={52} style={{transform:'rotate(-90deg)'}}>
            <circle cx={26} cy={26} r={20} fill="none" stroke="var(--color-border)" strokeWidth={5}/>
            <circle cx={26} cy={26} r={20} fill="none" stroke={color} strokeWidth={5}
              strokeDasharray={`${((pct||0)/100)*125.7} 125.7`} strokeLinecap="round"
              style={{transition:'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)'}}/>
          </svg>
          <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <span style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.6875rem', fontWeight:700, color}}>
              {hasData ? pct : '?'}
            </span>
          </div>
        </div>

        <div>
          <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1rem', color, lineHeight:1.1}}>{label}</p>
          <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.75rem', color:'var(--color-muted)', marginTop:3, lineHeight:1.45}}>
            {desc}
          </p>
        </div>
      </div>

      {/* Habit stability sparkline */}
      {logs && logs.length >= 3 && (
        <div style={{display:'flex', gap:3, marginTop:12, alignItems:'flex-end', height:28}}>
          {logs.slice(-8).map((l, i) => {
            const v = l.habit_stability ?? 0.5
            const c = v > 0.65 ? '#0D9488' : v > 0.4 ? '#D97706' : '#DC2626'
            return (
              <div key={i} title={`habit_stability: ${v.toFixed(3)}`}
                style={{
                  flex:1, borderRadius:3,
                  height: `${Math.max(20, v*100)}%`,
                  background:c, opacity:0.55,
                  transition:'height 0.6s cubic-bezier(0.16,1,0.3,1)',
                }}/>
            )
          })}
        </div>
      )}

      <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.6rem', color:'var(--color-muted)', opacity:0.6, marginTop:8}}>
        HVI = mean(study_vol3, sleep_vol3, screen_vol3) · consistency = 1 − HVI/2.0
      </p>
    </div>
  )
}
