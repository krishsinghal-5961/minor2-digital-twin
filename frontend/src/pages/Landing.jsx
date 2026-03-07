import { useNavigate } from 'react-router-dom'
import { Cpu, Brain, TrendingUp, Sliders, ArrowRight, Zap } from 'lucide-react'

const features = [
  { icon: Brain,      title: 'ML-Powered Predictions', desc: 'Three models working in tandem — performance predictor, pressure detector, and student archetype clustering.' },
  { icon: Zap,        title: 'Fuzzy Logic Reasoning',  desc: 'Human-like workload pressure and goal alignment scoring that mirrors real academic intuition.' },
  { icon: Sliders,    title: 'What-If Simulations',    desc: 'Explore how changes to your habits — sleep, screen time, study hours — shift your predicted outcomes.' },
  { icon: TrendingUp, title: 'Trend Intelligence',     desc: 'Week-over-week analysis of habits, pressure momentum, and performance trajectory.' },
]

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-ink text-paper overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-accent/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] bg-accent-dim/10 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Cpu size={16} className="text-accent" />
          </div>
          <span className="font-display font-bold text-paper">Academic Digital Twin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')}    className="btn-ghost text-sm">Sign in</button>
          <button onClick={() => navigate('/register')} className="btn-primary text-sm">Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
          <span className="text-accent text-xs font-mono">AI-powered academic insight</span>
        </div>

        <h1 className="font-display font-extrabold text-5xl md:text-7xl leading-[1.05] mb-6">
          Your Academic<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-soft">
            Digital Twin
          </span>
        </h1>

        <p className="text-paper/50 text-lg md:text-xl font-body max-w-2xl mx-auto mb-10 leading-relaxed">
          Predict your performance. Detect workload pressure. Simulate habit changes.
          A personal AI mirror that helps you understand — not prescribe — your academic patterns.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => navigate('/register')}
            className="btn-primary flex items-center gap-2 text-base px-8 py-4"
          >
            Start for free <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn-ghost text-base px-8 py-4"
          >
            Sign in
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-24">
        <p className="section-label text-center mb-10">What it does</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="card-hover animate-fade-up"
              style={{ animationDelay: `${i * 100}ms`, animationFillMode:'both', opacity:0 }}
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Icon size={18} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-paper text-sm mb-2">{title}</h3>
              <p className="text-paper/40 text-sm font-body leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-paper/20 text-xs font-mono">Academic Digital Twin — Minor Project</p>
        <p className="text-paper/20 text-xs font-mono">Predict · Simulate · Explain</p>
      </footer>
    </div>
  )
}
