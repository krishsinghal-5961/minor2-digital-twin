import { Info } from 'lucide-react'
export default function ConfidenceNote({ note }) {
  if (!note) return null
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:10,
      padding:'10px 14px',
      background:'rgba(217,119,6,0.06)',
      border:'1px solid rgba(217,119,6,0.2)',
      borderRadius:10,
    }}>
      <Info size={13} style={{color:'#D97706', marginTop:1, flexShrink:0}}/>
      <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'#D97706', lineHeight:1.5}}>{note}</p>
    </div>
  )
}
