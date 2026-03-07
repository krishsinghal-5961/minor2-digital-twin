import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Cpu, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [form, setForm]   = useState({ email:'', password:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow]   = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(form)
      navigate('/app')
    } catch(err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-accent/6 rounded-full blur-[100px]" />
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
          <h1 className="font-display font-bold text-2xl text-paper mb-1">Welcome back</h1>
          <p className="text-paper/40 font-body text-sm mb-8">Sign in to your account</p>

          {error && (
            <div className="bg-risk-high/10 border border-risk-high/20 rounded-xl px-4 py-3 mb-5">
              <p className="text-risk-high text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="section-label block mb-1.5">Email</label>
              <input type="email" placeholder="you@example.com" className="input-field"
                value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} required />
            </div>
            <div>
              <label className="section-label block mb-1.5">Password</label>
              <div className="relative">
                <input type={show?'text':'password'} placeholder="••••••••" className="input-field pr-12"
                  value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} required />
                <button type="button" onClick={() => setShow(s=>!s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-paper/30 hover:text-paper/60">
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-paper/30 text-sm font-body mt-6">
            No account? <Link to="/register" className="text-accent hover:text-accent-soft transition-colors">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
