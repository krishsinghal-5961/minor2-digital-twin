export default function RiskBadge({ label, type = 'pressure' }) {
  if (!label) return null
  const l = label.toLowerCase()
  if (type === 'alignment') {
    if (l === 'aligned')    return <span className="badge-aligned">{label}</span>
    if (l === 'partial')    return <span className="badge-partial">{label}</span>
    return                         <span className="badge-misaligned">{label}</span>
  }
  if (l === 'low')    return <span className="badge-risk-low">{label}</span>
  if (l === 'medium') return <span className="badge-risk-medium">{label}</span>
  return                     <span className="badge-risk-high">{label}</span>
}
