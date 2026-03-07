// Risk Radar — SVG radar chart using trend/slope data
// Mirrors notebook GROUP 2 (trend slopes) and GROUP 4 (pressure momentum)
// High value = higher risk on that axis
import { useMemo } from 'react'

const SIZE   = 220
const CX     = SIZE / 2
const CY     = SIZE / 2
const R      = 85
const LEVELS = 4

function polar(angle, radius) {
  const a = (angle - 90) * (Math.PI / 180)
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) }
}

function toPath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
}

export default function RiskRadar({ data }) {
  if (!data) return (
    <div className="flex items-center justify-center h-48 text-paper/20 text-sm font-mono">
      Need 3+ logs to compute risk radar
    </div>
  )

  const { axes, pressure_momentum, performance_momentum, weeks_used } = data
  const n = axes.length
  const step = 360 / n

  // Grid polygons
  const gridLines = useMemo(() => Array.from({ length: LEVELS }, (_, l) => {
    const r = R * ((l + 1) / LEVELS)
    const pts = axes.map((_, i) => polar(i * step, r))
    return toPath(pts)
  }), [axes, step])

  // Data polygon — value is 0-100 risk score
  const dataPoints = axes.map((a, i) => polar(i * step, R * (a.value / 100)))
  const dataPath   = toPath(dataPoints)

  // Risk color: average score
  const avgScore = axes.reduce((s, a) => s + a.value, 0) / n
  const radarColor = avgScore > 66 ? '#F43F5E' : avgScore > 40 ? '#F59E0B' : '#2DD4BF'

  const momentumColor = (m) =>
    m === 'building' || m === 'declining' ? 'text-risk-high' : m === 'stable' ? 'text-paper/50' : 'text-risk-low'

  return (
    <div>
      <div className="flex justify-center mb-2">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Grid circles */}
          {gridLines.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#ffffff08" strokeWidth="1"/>
          ))}
          {/* Axis lines */}
          {axes.map((_, i) => {
            const outer = polar(i * step, R)
            return <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke="#ffffff10" strokeWidth="1"/>
          })}
          {/* Data polygon */}
          <path d={dataPath} fill={radarColor} fillOpacity="0.15" stroke={radarColor} strokeWidth="2"/>
          {/* Data points */}
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill={radarColor} fillOpacity="0.8"/>
          ))}
          {/* Axis labels */}
          {axes.map((a, i) => {
            const labelR = R + 22
            const pos    = polar(i * step, labelR)
            return (
              <text key={i} x={pos.x} y={pos.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fontFamily="JetBrains Mono" fill="#ffffff40">
                {a.axis.split(' ').map((word, wi) => (
                  <tspan key={wi} x={pos.x} dy={wi === 0 ? 0 : 9}>{word}</tspan>
                ))}
              </text>
            )
          })}
          {/* Center label */}
          <text x={CX} y={CY-6} textAnchor="middle" fontSize="12" fontFamily="Space Grotesk" fill={radarColor} fontWeight="bold">
            {avgScore.toFixed(0)}
          </text>
          <text x={CX} y={CY+8} textAnchor="middle" fontSize="7" fontFamily="JetBrains Mono" fill="#ffffff30">
            risk index
          </text>
        </svg>
      </div>

      {/* Momentum badges */}
      <div className="flex justify-center gap-4 flex-wrap">
        <div className="text-center">
          <p className="text-paper/20 text-xs font-mono mb-0.5">Pressure</p>
          <p className={`text-xs font-mono font-semibold capitalize ${momentumColor(pressure_momentum)}`}>
            {pressure_momentum}
          </p>
        </div>
        <div className="text-center">
          <p className="text-paper/20 text-xs font-mono mb-0.5">Performance</p>
          <p className={`text-xs font-mono font-semibold capitalize ${momentumColor(performance_momentum)}`}>
            {performance_momentum}
          </p>
        </div>
        <div className="text-center">
          <p className="text-paper/20 text-xs font-mono mb-0.5">Window</p>
          <p className="text-xs font-mono text-paper/40">{weeks_used} logs</p>
        </div>
      </div>
      <p className="text-paper/15 text-xs font-mono text-center mt-3">
        Based on notebook GROUP 2 slopes + GROUP 4 pressure momentum
      </p>
    </div>
  )
}
