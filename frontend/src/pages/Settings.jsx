import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import { CheckCircle } from 'lucide-react'

const goals = [
  { value:'cgpa_improvement', label:'CGPA Improvement' },
  { value:'workload_balance',  label:'Workload Balance' },
  { value:'placement_prep',    label:'Placement Prep' },
  { value:'skill_building',    label:'Skill Building' },
]

export default function Settings() {
  const { user } = useAuth()
  const [form, setForm]   = useState({ name: user?.name || '', goal: user?.goal || 'cgpa_improvement' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSaved(false)
    try {
      await api.settings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch(err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-fade-in">
      <div>
        <p className="section-label">Settings</p>
        <h1 className="font-display font-bold text-3xl text-paper">Your Profile</h1>
      </div>

      {/* Account info */}
      <div className="card space-y-1">
        <p className="section-label mb-3">Account</p>
        <p className="font-body text-paper">{user?.name}</p>
        <p className="font-mono text-paper/40 text-sm">{user?.email}</p>
      </div>

      {/* Edit form */}
      <form onSubmit={handle} className="card space-y-5">
        <p className="section-label mb-1">Preferences</p>

        {error && <div className="bg-risk-high/10 border border-risk-high/20 rounded-xl px-4 py-3"><p className="text-risk-high text-sm">{error}</p></div>}
        {saved && (
          <div className="flex items-center gap-2 bg-risk-low/10 border border-risk-low/20 rounded-xl px-4 py-3">
            <CheckCircle size={14} className="text-risk-low" />
            <p className="text-risk-low text-sm">Saved successfully</p>
          </div>
        )}

        <div>
          <label className="section-label block mb-1.5">Display Name</label>
          <input type="text" value={form.name}
            onChange={e => setForm(f => ({...f, name:e.target.value}))}
            className="input-field" required />
        </div>

        <div>
          <label className="section-label block mb-1.5">Primary Goal</label>
          <select value={form.goal} onChange={e => setForm(f => ({...f, goal:e.target.value}))} className="input-field">
            {goals.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <p className="text-paper/25 text-xs font-body mt-1">Changing your goal adapts what data the system prioritises.</p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      <div className="card">
        <p className="section-label mb-3">About This System</p>
        <ul className="space-y-2 text-paper/40 text-sm font-body">
          <li>→ Predictions are simulations, not prescriptions</li>
          <li>→ No fixed logging schedule required</li>
          <li>→ Confidence improves with more entries</li>
          <li>→ ML models trained on 50,000 synthetic student records</li>
        </ul>
      </div>
    </div>
  )
}
