export default function ScoreGauge({ score, max = 100, label }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100))
  const color = pct >= 65 ? '#2DD4BF' : pct >= 45 ? '#F59E0B' : '#F43F5E'
  const r = 52, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1C1C27" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-display font-bold" style={{ color }}>{score?.toFixed(1)}</span>
          <span className="text-paper/30 text-xs font-mono">/{max}</span>
        </div>
      </div>
      {label && <p className="section-label mt-2">{label}</p>}
    </div>
  )
}
