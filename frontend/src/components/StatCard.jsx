export default function StatCard({ label, value, sub, accent, badge, delay = 0 }) {
  return (
    <div
      className="card-hover animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both', opacity: 0 }}
    >
      <p className="section-label">{label}</p>
      <p className={`text-3xl font-display font-bold mt-1 ${accent || 'text-paper'}`}>{value}</p>
      {sub   && <p className="text-paper/40 text-sm font-body mt-1">{sub}</p>}
      {badge && <div className="mt-3">{badge}</div>}
    </div>
  )
}
