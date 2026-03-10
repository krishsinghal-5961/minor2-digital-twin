import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Cpu, Brain, Zap, Sliders, TrendingUp, ArrowRight, BarChart2, CheckCircle } from 'lucide-react'

const features = [
  { icon:Brain,      title:'3-Model ML Pipeline',       desc:'Performance predictor (R²=0.60), risk detector (F1=0.85), and behavioral clustering working in tandem.' },
  { icon:Zap,        title:'Fuzzy Logic Reasoning',      desc:'12-rule pressure module + 24-rule alignment module. Human-like reasoning that goes beyond hard thresholds.' },
  { icon:Sliders,    title:'What-If Simulation Engine',  desc:'Change sleep, study hours, deadlines — see exact predicted shifts across all outputs instantly.' },
  { icon:TrendingUp, title:'Trend Intelligence',         desc:'Rolling slopes, volatility indices, pressure momentum tracking. Mirrors notebook GROUP 2–4 features.' },
  { icon:BarChart2,  title:'Diminishing Returns Analyzer',desc:'Find exactly when extra study hours stop paying off. Marginal gain curve with inflection detection.' },
  { icon:Cpu,        title:'Behavioral Consistency',     desc:'Habit volatility index from rolling std of study, sleep, screen — tells you how erratic your patterns are.' },
]

const bullets = [
  'Predict, simulate, explain — never prescribe',
  'No fixed logging schedule required',
  'Fully explainable, source-verifiable logic',
]

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div style={{minHeight:'100vh', background:'var(--color-surface)', color:'var(--color-paper)'}}>

      {/* Nav */}
      <nav style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'1rem 2rem', maxWidth:1200, margin:'0 auto',
        borderBottom:'1px solid var(--color-border)',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:32, height:32, borderRadius:9, background:'rgba(91,79,232,0.1)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <Cpu size={15} color="#5B4FE8"/>
          </div>
          <span style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.9375rem', color:'var(--color-paper)'}}>
            Academic Digital Twin
          </span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <ThemeToggle/>
          <button onClick={() => navigate('/login')}    className="btn-ghost"   style={{padding:'6px 14px'}}>Sign in</button>
          <button onClick={() => navigate('/register')} className="btn-primary" style={{padding:'6px 14px'}}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{maxWidth:800, margin:'0 auto', padding:'5rem 2rem 3rem', textAlign:'center'}}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'4px 14px 4px 8px', borderRadius:99,
          background:'rgba(91,79,232,0.06)', border:'1px solid rgba(91,79,232,0.15)',
          marginBottom:24,
        }}>
          <span style={{width:6, height:6, borderRadius:'50%', background:'#5B4FE8', animation:'pulse 2s ease-in-out infinite'}}/>
          <span style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.7rem', color:'#5B4FE8'}}>
            AI-powered academic insight · predict not prescribe
          </span>
        </div>

        <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(2.25rem,6vw,3.5rem)', lineHeight:1.05, color:'var(--color-paper)', marginBottom:16}}>
          Your Academic<br/>
          <span style={{color:'#5B4FE8'}}>Digital Twin</span>
        </h1>

        <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'1rem', color:'var(--color-muted)', maxWidth:520, margin:'0 auto 32px', lineHeight:1.65}}>
          A personal AI mirror that predicts your performance, detects workload pressure,
          and simulates how habit changes shift your outcomes — built on real ML + fuzzy logic.
        </p>

        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:10, flexWrap:'wrap', marginBottom:32}}>
          <button onClick={() => navigate('/register')} className="btn-primary" style={{padding:'10px 24px', fontSize:'0.9375rem'}}>
            Start for free <ArrowRight size={15} style={{marginLeft:4}}/>
          </button>
          <button onClick={() => navigate('/login')} className="btn-ghost" style={{padding:'10px 20px', fontSize:'0.9375rem'}}>
            Sign in
          </button>
        </div>

        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:20, flexWrap:'wrap'}}>
          {bullets.map(b => (
            <div key={b} style={{display:'flex', alignItems:'center', gap:6}}>
              <CheckCircle size={12} style={{color:'#059669', flexShrink:0}}/>
              <span style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.78rem', color:'var(--color-muted)'}}>{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section style={{maxWidth:1100, margin:'0 auto', padding:'2rem 2rem 6rem'}}>
        <p className="section-label" style={{textAlign:'center', marginBottom:32}}>What it does</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14}}>
          {features.map(({ icon:Icon, title, desc }, i) => (
            <div key={title} className="card-hover animate-fade-up"
              style={{animationDelay:`${i*60}ms`, animationFillMode:'both', opacity:0}}>
              <div style={{width:36, height:36, borderRadius:9, background:'rgba(91,79,232,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12}}>
                <Icon size={16} color="#5B4FE8" style={{opacity:0.8}}/>
              </div>
              <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.9375rem', color:'var(--color-paper)', marginBottom:6}}>
                {title}
              </p>
              <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', color:'var(--color-muted)', lineHeight:1.55}}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
