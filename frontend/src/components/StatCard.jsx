export default function StatCard({ label, value, sub, accent, badge, delay = 0 }) {
  return (
    <div className="card-hover animate-fade-up"
      style={{ animationDelay:`${delay}ms`, animationFillMode:'both', opacity:0 }}>
      <p className="section-label">{label}</p>
      <p style={{
        fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'1.5rem', lineHeight:1.15,
        marginTop:4, color: accent ? undefined : 'var(--color-paper)',
      }} className={accent || ''}>
        {value}
      </p>
      {sub   && <p style={{fontSize:'0.75rem', fontFamily:'DM Sans,sans-serif', color:'var(--color-muted)', marginTop:4}}>{sub}</p>}
      {badge && <div style={{marginTop:10}}>{badge}</div>}
    </div>
  )
}
