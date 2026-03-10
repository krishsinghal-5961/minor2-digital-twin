import { useState } from 'react'
import { api } from '../utils/api'
import FeedbackWidget from './FeedbackWidget'
import { Sparkles, RotateCcw, ChevronDown, ChevronUp, Cpu } from 'lucide-react'

// Example text shown IMMEDIATELY — no need to click to see what it looks like
const EXAMPLE_EXPLANATION = `Based on recent activity, predicted performance score is 58.4/100. Workload pressure is moderate — a combination of 3 active deadlines and 3.1h daily screen time is creating a noticeable strain. Sleep at 6.2h is below the 7h threshold where the fuzzy pressure model starts scoring well. Goal alignment is partial: study intensity is reasonable but the effort-to-outcome ratio suggests study efficiency could be improved (late-night study sessions reduce this). Student archetype is "Balanced & Efficient" — habits are relatively stable, which is a strong foundation to build on. Reducing screen time by 1h and improving sleep by 45 min would likely shift both fuzzy scores significantly. These are simulations only, not prescriptions.`

export default function GenAIExplanation({ data }) {
  const [explanation, setExplanation] = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [collapsed,   setCollapsed]   = useState(false)
  const [showExample, setShowExample] = useState(false)
  const [feedback,    setFeedback]    = useState(null)   // 'helpful' | 'not_helpful'

  const generate = async () => {
    setLoading(true); setFeedback(null)
    try {
      const res = await api.explain(data)
      setExplanation(res.explanation)
    } finally { setLoading(false) }
  }

  const displayed = showExample ? EXAMPLE_EXPLANATION : explanation

  return (
    <div className="card" style={{animationDelay:'550ms', animationFillMode:'both'}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{
            width:30, height:30, borderRadius:8,
            background:'rgba(91,79,232,0.1)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Sparkles size={13} color="#5B4FE8"/>
          </div>
          <div>
            <p className="section-label" style={{marginBottom:0}}>AI Explanation</p>
            <p style={{fontSize:'0.7rem', fontFamily:'JetBrains Mono,monospace', color:'var(--color-muted)'}}>
              HuggingFace · Mistral-7B-Instruct-v0.3
            </p>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:6}}>
          {!explanation && (
            <button onClick={() => setShowExample(e => !e)}
              style={{
                padding:'3px 9px', borderRadius:6, border:'1px solid var(--color-border)',
                background:'transparent', cursor:'pointer', fontSize:'0.7rem',
                fontFamily:'JetBrains Mono,monospace', color:'var(--color-muted)',
                transition:'all 0.15s',
              }}>
              {showExample ? 'Hide example' : 'See example'}
            </button>
          )}
          {displayed && (
            <button onClick={() => setCollapsed(c => !c)}
              style={{background:'none', border:'none', cursor:'pointer', color:'var(--color-muted)'}}>
              {collapsed ? <ChevronDown size={15}/> : <ChevronUp size={15}/>}
            </button>
          )}
        </div>
      </div>

      {/* Example banner */}
      {showExample && !explanation && (
        <div style={{
          display:'flex', gap:8, padding:'8px 12px', marginBottom:12,
          background:'rgba(217,119,6,0.05)', border:'1px solid rgba(217,119,6,0.15)',
          borderRadius:8,
        }}>
          <Cpu size={12} style={{color:'#D97706', marginTop:1, flexShrink:0}}/>
          <p style={{fontSize:'0.7rem', fontFamily:'JetBrains Mono,monospace', color:'#D97706', lineHeight:1.4}}>
            Example output — not based on your real data. Click "Generate explanation" to get yours.
          </p>
        </div>
      )}

      {/* Content area */}
      {!displayed ? (
        // Empty state — prominent and informative
        <div style={{
          border:'1px dashed var(--color-border)',
          borderRadius:12, padding:'28px 20px',
          display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:12,
        }}>
          <div style={{
            width:44, height:44, borderRadius:12,
            background:'rgba(91,79,232,0.08)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Sparkles size={20} color="#5B4FE8" style={{opacity:0.6}}/>
          </div>
          <div>
            <p style={{fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:'0.9375rem', color:'var(--color-paper)', marginBottom:4}}>
              Get a plain-language explanation
            </p>
            <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'var(--color-muted)', lineHeight:1.55, maxWidth:380}}>
              The AI reads your performance score, fuzzy pressure/alignment scores, and student archetype, then explains what's driving the predictions in plain language — including what changing would help most.
            </p>
          </div>
          <button onClick={generate} disabled={loading} className="btn-primary" style={{marginTop:4}}>
            {loading
              ? <><div style={{width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',animation:'spin 0.7s linear infinite',marginRight:6}}/>Generating...</>
              : <><Sparkles size={13} style={{marginRight:6}}/> Generate explanation</>}
          </button>
        </div>
      ) : !collapsed && (
        <div>
          {/* Explanation text */}
          <div style={{
            padding:'16px', borderRadius:10,
            background:'var(--color-surface)',
            border:'1px solid var(--color-border)',
            position:'relative',
          }}>
            <p style={{
              fontFamily:'DM Sans,sans-serif', fontSize:'0.875rem',
              lineHeight:1.7, color:'var(--color-paper)', opacity:0.85,
            }}>
              {displayed}
            </p>
          </div>

          {/* Footer row */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, flexWrap:'wrap', gap:8}}>
            <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color:'var(--color-muted)'}}>
              {showExample ? 'Example output · not your data' : 'Generated by Mistral-7B · simulations only'}
            </p>
            {explanation && !showExample && (
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <FeedbackWidget value={feedback} onChange={setFeedback}/>
                <button onClick={generate} disabled={loading}
                  style={{
                    display:'flex', alignItems:'center', gap:5,
                    background:'none', border:'none', cursor:'pointer',
                    fontSize:'0.7rem', fontFamily:'JetBrains Mono,monospace',
                    color:'var(--color-muted)', transition:'color 0.15s',
                    padding:'3px 0',
                  }}>
                  <RotateCcw size={10}/> Regenerate
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
