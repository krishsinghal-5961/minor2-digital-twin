import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import ThemeToggle from '../components/ThemeToggle'
import { CheckCircle } from 'lucide-react'

const GOALS = [
  { value:'cgpa_improvement', label:'CGPA Improvement', desc:'Optimises for academic performance' },
  { value:'workload_balance',  label:'Workload Balance',  desc:'Balances effort with recovery' },
  { value:'placement_prep',    label:'Placement Prep',    desc:'Study intensity + skill practice' },
  { value:'skill_building',    label:'Skill Building',    desc:'Project and practice hours' },
]

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', goal: user?.goal || 'cgpa_improvement' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error,  setError]    = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSaved(false)
    try {
      await api.settings(form)
      // Push name+goal into AuthContext + localStorage immediately so
      // LogEntry (which reads user.goal) reflects the change without reload
      updateUser({ name: form.name, goal: form.goal })
      setSaved(true)
      setTimeout(()=>setSaved(false), 3000)
    }
    catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column', gap:0}}>
      <h1 style={{fontWeight:700, fontSize:'1.5rem', color:'var(--color-paper)', marginBottom:28}}>Settings</h1>

      {/* Account info */}
      <div style={{paddingBottom:24, borderBottom:'1px solid var(--color-border)', marginBottom:24}}>
        <p style={{fontWeight:600, fontSize:'0.8125rem', color:'var(--color-paper)', marginBottom:12}}>Account</p>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{
            width:40, height:40, borderRadius:'50%', flexShrink:0,
            background:'var(--accent-soft)', border:'1px solid var(--accent-border)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:700, fontSize:'1rem', color:'var(--accent)',
          }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p style={{fontWeight:600, fontSize:'0.9375rem', color:'var(--color-paper)'}}>{user?.name}</p>
            <p style={{fontSize:'0.8rem', color:'var(--color-muted)', marginTop:1}}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div style={{paddingBottom:24, borderBottom:'1px solid var(--color-border)', marginBottom:24}}>
        <p style={{fontWeight:600, fontSize:'0.8125rem', color:'var(--color-paper)', marginBottom:12}}>Appearance</p>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <p style={{fontSize:'0.875rem', color:'var(--color-paper)'}}>Theme</p>
            <p style={{fontSize:'0.78rem', color:'var(--color-muted)', marginTop:2}}>Light or dark mode</p>
          </div>
          <ThemeToggle/>
        </div>
      </div>

      {/* Preferences form */}
      <form onSubmit={handle} style={{display:'flex', flexDirection:'column', gap:20}}>
        <p style={{fontWeight:600, fontSize:'0.8125rem', color:'var(--color-paper)'}}>Preferences</p>

        {error && (
          <div style={{padding:'10px 14px', background:'rgba(185,28,28,0.06)', border:'1px solid rgba(185,28,28,0.2)', borderRadius:7}}>
            <p style={{fontSize:'0.8rem', color:'#B91C1C'}}>{error}</p>
          </div>
        )}
        {saved && (
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(15,118,110,0.06)', border:'1px solid rgba(15,118,110,0.2)', borderRadius:7}}>
            <CheckCircle size={13} style={{color:'#0F766E'}}/>
            <p style={{fontSize:'0.8rem', color:'#0F766E'}}>Saved</p>
          </div>
        )}

        <div>
          <label className="label">Display name</label>
          <input type="text" value={form.name}
            onChange={e=>setForm(f=>({...f,name:e.target.value}))}
            className="input-field" required/>
        </div>

        <div>
          <label className="label" style={{marginBottom:10}}>Primary goal</label>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {GOALS.map(g => (
              <button key={g.value} type="button"
                onClick={()=>setForm(f=>({...f,goal:g.value}))}
                style={{
                  padding:'10px 12px', borderRadius:7, textAlign:'left', cursor:'pointer',
                  border:`1px solid ${form.goal===g.value ? 'var(--accent-border)' : 'var(--color-border)'}`,
                  background: form.goal===g.value ? 'var(--accent-soft)' : 'var(--color-card)',
                }}>
                <p style={{fontWeight:600, fontSize:'0.8rem', color: form.goal===g.value ? 'var(--accent)' : 'var(--color-paper)'}}>
                  {g.label}
                </p>
                <p style={{fontSize:'0.7rem', color:'var(--color-faint)', marginTop:2, lineHeight:1.4}}>{g.desc}</p>
              </button>
            ))}
          </div>
          <p style={{fontSize:'0.75rem', color:'var(--color-faint)', marginTop:8}}>
            Changes how the Log Entry form adapts and how effort mismatch is calculated.
          </p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary" style={{alignSelf:'flex-start'}}>
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      {/* About */}
      <div style={{marginTop:32, paddingTop:24, borderTop:'1px solid var(--color-border)'}}>
        <p style={{fontWeight:600, fontSize:'0.8125rem', color:'var(--color-paper)', marginBottom:12}}>About</p>
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          {[
            'Predictions are simulations — not prescriptions or diagnoses',
            'ML trained on 50,000 synthetic student-week records',
            'Fuzzy logic: 12 pressure rules + 24 alignment rules (Module v2)',
            'Confidence improves with 3+ logs due to rolling window features',
          ].map(s => (
            <p key={s} style={{fontSize:'0.8rem', color:'var(--color-muted)', lineHeight:1.55, paddingLeft:12, borderLeft:'2px solid var(--color-border)'}}>
              {s}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
