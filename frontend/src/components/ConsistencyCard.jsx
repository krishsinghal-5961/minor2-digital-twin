// Behavioral Consistency Score
// notebook GROUP 3: habit_volatility_index = mean(study_vol3, sleep_vol3, screen_vol3)
//   where _vol3 = shift(1).rolling(3, min_periods=2).std()
// consistency = 1 - (hvi / 2.0)  [normalised to 0-1 range]
export default function ConsistencyCard({ score, logs }) {
  const hasData = score !== null && score !== undefined
  const pct     = hasData ? Math.round(score * 100) : null
  const color   = !hasData ? '#ffffff20' : pct >= 70 ? '#2DD4BF' : pct >= 45 ? '#F59E0B' : '#F43F5E'
  const label   = !hasData ? 'Insufficient data' : pct >= 70 ? 'Consistent' : pct >= 45 ? 'Moderate' : 'Volatile'
  const desc    = !hasData
    ? 'Need 3+ logs to compute rolling habit volatility index.'
    : pct >= 70
    ? 'Habit volatility is low. Consistent routines support stable predictions.'
    : pct >= 45
    ? 'Some habit variation detected. Stabilising sleep and study hours will help.'
    : 'High habit volatility. Erratic patterns increase workload pressure risk.'

  return (
    <div className="card animate-fade-up" style={{animationDelay:'480ms',animationFillMode:'both',opacity:0}}>
      <p className="section-label mb-3">Behavioral Consistency</p>
      <div className="flex items-center gap-4 mb-4">
        {/* Ring */}
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#1C1C27" strokeWidth="6"/>
            <circle cx="28" cy="28" r="22" fill="none"
              stroke={color} strokeWidth="6"
              strokeDasharray={`${((pct||0)/100)*138.2} 138.2`}
              strokeLinecap="round"
              style={{transition:'stroke-dasharray 1s ease'}}/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs font-bold" style={{color}}>
              {hasData ? pct : '?'}
            </span>
          </div>
        </div>
        <div>
          <p className="font-display font-semibold text-lg" style={{color}}>{label}</p>
          <p className="text-paper/40 text-xs font-body mt-0.5 max-w-[180px]">{desc}</p>
        </div>
      </div>

      {/* Sparkline bars — habit stability per log */}
      {logs && logs.length >= 3 && (
        <div className="flex gap-1">
          {logs.slice(-7).map((l, i) => {
            const v = l.habit_stability ?? 0.5
            const c = v > 0.65 ? '#2DD4BF' : v > 0.4 ? '#F59E0B' : '#F43F5E'
            return (
              <div key={i} className="flex-1 h-7 rounded flex items-end overflow-hidden bg-ink" title={`habit_stability: ${v.toFixed(3)}`}>
                <div className="w-full rounded" style={{height:`${Math.max(10,v*100)}%`, background:c, opacity:0.65}}/>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-paper/15 text-xs font-mono mt-2">
        habit_volatility_index = mean(study_vol3, sleep_vol3, screen_vol3) · normalised /2.0
      </p>
    </div>
  )
}
