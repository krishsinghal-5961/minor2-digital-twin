import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from '../components/ThemeToggle'
import { Cpu, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [form, setForm] = useState({ email:'', password:'' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handle = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try { await login(form); navigate('/app') }
    catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh', background:'var(--color-surface)', display:'flex', flexDirection:'column'}}>
      <nav style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.5rem', borderBottom:'1px solid var(--color-border)'}}>
        <Link to="/" style={{display:'flex', alignItems:'center', gap:8, textDecoration:'none'}}>
          <div style={{width:28, height:28, borderRadius:7, background:'rgba(91,79,232,0.1)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <Cpu size={13} color="#5B4FE8"/>
          </div>
          <span style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.875rem', color:'var(--color-paper)'}}>Digital Twin</span>
        </Link>
        <ThemeToggle compact/>
      </nav>

      <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem 1rem'}}>
        <div style={{width:'100%', maxWidth:380}}>
          <div style={{textAlign:'center', marginBottom:28}}>
            <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.625rem', color:'var(--color-paper)'}}>Welcome back</h1>
            <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.875rem', color:'var(--color-muted)', marginTop:6}}>Sign in to your digital twin</p>
          </div>

          <div className="card">
            {error && (
              <div style={{padding:'10px 14px', background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, marginBottom:16}}>
                <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'#DC2626'}}>{error}</p>
              </div>
            )}
            <form onSubmit={handle} style={{display:'flex', flexDirection:'column', gap:14}}>
              <div>
                <label className="section-label">Email</label>
                <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                  placeholder="you@example.com" className="input-field" required/>
              </div>
              <div>
                <label className="section-label">Password</label>
                <div style={{position:'relative'}}>
                  <input type={show?'text':'password'} value={form.password}
                    onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                    placeholder="••••••••" className="input-field" required style={{paddingRight:40}}/>
                  <button type="button" onClick={()=>setShow(s=>!s)}
                    style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--color-muted)'}}>
                    {show ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{width:'100%', marginTop:4}}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          <p style={{textAlign:'center', fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'var(--color-muted)', marginTop:20}}>
            No account?{' '}
            <Link to="/register" style={{color:'#5B4FE8', textDecoration:'none', fontWeight:500}}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
