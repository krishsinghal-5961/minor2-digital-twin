import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import ThemeToggle from '../components/ThemeToggle'
import { CheckCircle, User, Target, Palette, Info } from 'lucide-react'

const goals = [
  { value:'cgpa_improvement', label:'CGPA Improvement', desc:'Optimises for academic performance score' },
  { value:'workload_balance',  label:'Workload Balance',  desc:'Balances effort with recovery and sleep' },
  { value:'placement_prep',    label:'Placement Prep',    desc:'Weights study intensity + skill practice' },
  { value:'skill_building',    label:'Skill Building',    desc:'Tracks project/practice hours prominently' },
]

function Section({ icon:Icon, title, children }) {
  return (
    <div className="card" style={{display:'flex', flexDirection:'column', gap:16}}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div style={{width:30, height:30, borderRadius:8, background:'rgba(91,79,232,0.08)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <Icon size={14} color="#5B4FE8"/>
        </div>
        <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.9375rem', color:'var(--color-paper)'}}>{title}</p>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', goal: user?.goal || 'cgpa_improvement' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSaved(false)
    try { await api.settings(form); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{maxWidth:520, margin:'0 auto', display:'flex', flexDirection:'column', gap:20}}>
      <div>
        <p className="section-label">Settings</p>
        <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.75rem', color:'var(--color-paper)', marginTop:4}}>
          Your Profile
        </h1>
      </div>

      {/* Account */}
      <Section icon={User} title="Account">
        <div style={{display:'flex', alignItems:'center', gap:14}}>
          <div style={{width:44, height:44, borderRadius:'50%', background:'rgba(91,79,232,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.125rem', color:'#5B4FE8', flexShrink:0}}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p style={{fontFamily:'DM Sans,sans-serif', fontWeight:600, color:'var(--color-paper)', fontSize:'0.9375rem'}}>{user?.name}</p>
            <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.75rem', color:'var(--color-muted)', marginTop:2}}>{user?.email}</p>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <p style={{fontFamily:'DM Sans,sans-serif', fontWeight:500, fontSize:'0.875rem', color:'var(--color-paper)'}}>Theme</p>
            <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.75rem', color:'var(--color-muted)', marginTop:2}}>Switch between light and dark mode</p>
          </div>
          <ThemeToggle/>
        </div>
      </Section>

      {/* Preferences form */}
      <form onSubmit={handle}>
        <Section icon={Target} title="Preferences">
          {error && (
            <div style={{padding:'10px 14px', background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8}}>
              <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'#DC2626'}}>{error}</p>
            </div>
          )}
          {saved && (
            <div style={{display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(5,150,105,0.06)', border:'1px solid rgba(5,150,105,0.2)', borderRadius:8}}>
              <CheckCircle size={13} style={{color:'#059669'}}/>
              <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'#059669'}}>Saved successfully</p>
            </div>
          )}

          <div>
            <label className="section-label">Display Name</label>
            <input type="text" value={form.name}
              onChange={e => setForm(f => ({...f, name:e.target.value}))}
              className="input-field" required/>
          </div>

          <div>
            <label className="section-label">Primary Goal</label>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6}}>
              {goals.map(g => (
                <button key={g.value} type="button"
                  onClick={() => setForm(f => ({...f, goal:g.value}))}
                  style={{
                    padding:'10px 12px', borderRadius:10, textAlign:'left', cursor:'pointer',
                    border:`1px solid ${form.goal===g.value ? 'rgba(91,79,232,0.4)' : 'var(--color-border)'}`,
                    background: form.goal===g.value ? 'rgba(91,79,232,0.06)' : 'var(--color-surface)',
                    transition:'all 0.15s',
                  }}>
                  <p style={{fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.8125rem',
                             color: form.goal===g.value ? '#5B4FE8' : 'var(--color-paper)'}}>
                    {g.label}
                  </p>
                  <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.7rem', color:'var(--color-muted)', marginTop:2, lineHeight:1.4}}>
                    {g.desc}
                  </p>
                </button>
              ))}
            </div>
            <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.75rem', color:'var(--color-muted)', marginTop:8}}>
              Changing goal adapts the Log Entry form and effort_mismatch calculation.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </Section>
      </form>

      {/* About */}
      <Section icon={Info} title="About this system">
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {[
            'Predictions are simulations — not prescriptions or diagnoses',
            'ML trained on 50,000 synthetic student-week records',
            'Fuzzy logic: 12 pressure rules + 24 alignment rules (Module v2)',
            'Confidence improves with 3+ logs due to rolling window features',
            'User feedback adjusts per-user fuzzy thresholds (coming soon)',
          ].map(s => (
            <p key={s} style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'var(--color-muted)', lineHeight:1.5}}>
              <span style={{color:'var(--color-muted)', opacity:0.5}}>→ </span>{s}
            </p>
          ))}
        </div>
      </Section>
    </div>
  )
}
