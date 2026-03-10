// Feedback widget — thumbs up/down for GenAI explanation quality
// This feedback is stored and will later be used to adjust fuzzy thresholds (backend feature)
import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { api } from '../utils/api'

export default function FeedbackWidget({ value, onChange, context = 'explanation' }) {
  const [sent, setSent] = useState(false)

  const submit = async (v) => {
    onChange(v)
    setSent(true)
    // POST to /api/feedback when backend is live
    // api.feedback({ type: context, value: v }) — adjusts fuzzy thresholds per user
    // For now: mock (silently succeeds)
    await Promise.resolve()
  }

  if (sent) return (
    <div style={{display:'flex', alignItems:'center', gap:5,
                 fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color:'#059669'}}>
      <Check size={10}/> Feedback saved
    </div>
  )

  return (
    <div style={{display:'flex', alignItems:'center', gap:6}}>
      <span style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color:'var(--color-muted)'}}>
        Helpful?
      </span>
      <button onClick={() => submit('helpful')}
        style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:24, height:24, borderRadius:6,
          border:'1px solid var(--color-border)',
          background: value==='helpful' ? 'rgba(5,150,105,0.1)' : 'transparent',
          cursor:'pointer', transition:'all 0.15s',
          color: value==='helpful' ? '#059669' : 'var(--color-muted)',
        }}>
        <ThumbsUp size={11}/>
      </button>
      <button onClick={() => submit('not_helpful')}
        style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:24, height:24, borderRadius:6,
          border:'1px solid var(--color-border)',
          background: value==='not_helpful' ? 'rgba(220,38,38,0.1)' : 'transparent',
          cursor:'pointer', transition:'all 0.15s',
          color: value==='not_helpful' ? '#DC2626' : 'var(--color-muted)',
        }}>
        <ThumbsDown size={11}/>
      </button>
    </div>
  )
}
