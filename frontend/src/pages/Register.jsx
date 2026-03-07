import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Cpu, Eye, EyeOff } from 'lucide-react'

const goals = [
  { value:'cgpa_improvement',  label:'CGPA Improvement' },
  { value:'workload_balance',   label:'Workload Balance' },
  { value:'placement_prep',     label:'Placement Prep' },
  { value:'skill_building',     label:'Skill Building' },
]

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form, setForm]   = useState({ name:'', email:'', password:'', goal:'cgpa_improvement' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow]   = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await register(form)
      navigate('/app')
    } catch(err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-accent/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
              <Cpu size={18} className="text-accent" />
            </div>
            <span className="font-display font-bold text-paper">Academic Digital Twin</span>
          </div>
        </div>

        <div className="card">
          <h1 className="font-display font-bold text-2xl text-paper mb-1">Create account</h1>
          <p className="text-paper/40 font-body text-sm mb-8">Set up your digital twin</p>

          {error && (
            <div className="bg-risk-high/10 border border-risk-high/20 rounded-xl px-4 py-3 mb-5">
              <p className="text-risk-high text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="section-label block mb-1.5">Full Name</label>
              <input type="text" placeholder="Aryan Sharma" className="input-field"
                value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} required />
            </div>
            <div>
              <label className="section-label block mb-1.5">Email</label>
              <input type="email" placeholder="you@example.com" className="input-field"
                value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} required />
            </div>
            <div>
              <label className="section-label block mb-1.5">Password</label>
              <div className="relative">
                <input type={show?'text':'password'} placeholder="min 6 characters" className="input-field pr-12"
                  value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} required minLength={6} />
                <button type="button" onClick={() => setShow(s=>!s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-paper/30 hover:text-paper/60">
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <div>
              <label className="section-label block mb-1.5">Primary Goal</label>
              <select className="input-field" value={form.goal}
                onChange={e => setForm(f => ({...f, goal:e.target.value}))}>
                {goals.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-paper/30 text-sm font-body mt-6">
            Already have an account? <Link to="/login" className="text-accent hover:text-accent-soft transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
