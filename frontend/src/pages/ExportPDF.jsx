// PDF Insight Report — window.print() based
// Uses a dedicated print CSS that hides nav and shows a clean report layout
import { useEffect, useState, useRef } from 'react'
import { api } from '../utils/api'
import RiskBadge from '../components/RiskBadge'
import ScoreGauge from '../components/ScoreGauge'
import RiskRadar from '../components/RiskRadar'
import { FileDown, Printer, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const PRINT_STYLES = `
@media print {
  /* Hide everything except the report */
  body > #root > div > aside,
  body > #root > div > div > header,
  .no-print { display: none !important; }

  /* Make the report full-width */
  body { background: white !important; color: #1A1825 !important; }
  .print-root { padding: 0 !important; }
  .print-page {
    max-width: 100% !important;
    padding: 2cm 2cm !important;
    font-size: 11pt !important;
  }
  .print-card {
    border: 1px solid #e0e0e0 !important;
    background: white !important;
    break-inside: avoid;
    margin-bottom: 12pt !important;
  }
  .print-label {
    font-size: 7pt !important;
    color: #5B4FE8 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.1em !important;
  }
  .print-value { color: #1A1825 !important; }
  .print-muted { color: #6B6880 !important; }

  /* Page break hints */
  .print-break-before { break-before: page; }
}
`

export default function ExportPDF() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data,    setData]    = useState(null)
  const [radar,   setRadar]   = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef()

  useEffect(() => {
    Promise.all([api.dashboard(), api.riskRadar()])
      .then(([d,r]) => { setData(d); setRadar(r) })
      .finally(() => setLoading(false))
  }, [])

  const handlePrint = () => window.print()

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(91,79,232,0.15)',borderTopColor:'#5B4FE8',animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const l = data?.latest
  if (!l) return (
    <div style={{maxWidth:460,margin:'0 auto',textAlign:'center',padding:'5rem 1rem'}}>
      <p style={{fontFamily:'DM Sans,sans-serif',color:'var(--color-muted)',marginBottom:20}}>
        No data available yet. Submit at least one log to generate a report.
      </p>
      <button onClick={()=>navigate('/app/log')} className="btn-primary">Submit a log first</button>
    </div>
  )

  const generatedAt = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})
  const logs        = data.logs || []

  return (
    <>
      <style>{PRINT_STYLES}</style>

      {/* Controls (hidden in print) */}
      <div className="no-print" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>navigate('/app')} className="btn-ghost" style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px'}}>
            <ArrowLeft size={13}/> Back
          </button>
          <div>
            <p className="section-label">Export</p>
            <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.5rem',color:'var(--color-paper)',marginTop:2}}>
              PDF Insight Report
            </h1>
          </div>
        </div>
        <button onClick={handlePrint} className="btn-primary" style={{display:'flex',alignItems:'center',gap:8}}>
          <Printer size={14}/> Print / Save PDF
        </button>
      </div>

      {/* Report content */}
      <div ref={printRef} className="print-page" style={{maxWidth:780,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>

        {/* Cover */}
        <div className="print-card card" style={{padding:'20px 24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'#5B4FE8',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>
              Academic Digital Twin · Insight Report
            </p>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.375rem',color:'var(--color-paper)',marginBottom:4}}>
              {user?.name}
            </h2>
            <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.7rem',color:'var(--color-muted)'}}>
              Goal: {user?.goal?.replace(/_/g,' ')} · Generated {generatedAt} · {logs.length} logs
            </p>
          </div>
          <div style={{
            padding:'8px 16px',borderRadius:10,
            background:'rgba(91,79,232,0.05)',border:'1px solid rgba(91,79,232,0.1)',
            textAlign:'right',
          }}>
            <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',marginBottom:2}}>Disclaimer</p>
            <p style={{fontFamily:'DM Sans,sans-serif',fontSize:'0.72rem',color:'var(--color-muted)',maxWidth:280,lineHeight:1.5}}>
              Simulations only — not prescriptions or diagnoses. Trained on synthetic data.
            </p>
          </div>
        </div>

        {/* Score + Key Metrics */}
        <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:14,alignItems:'start'}}>
          <div className="print-card card" style={{padding:'20px 24px',display:'flex',flexDirection:'column',alignItems:'center'}}>
            <ScoreGauge score={l.performance_score} label="Performance Score"/>
            <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',marginTop:4}}>predicted · not a grade</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              { label:'ML Pressure',    v:l.pressure_label,        badge:<RiskBadge label={l.pressure_label}/> },
              { label:'Fuzzy Pressure', v:l.fuzzy_pressure_label,  badge:<RiskBadge label={l.fuzzy_pressure_label}/> },
              { label:'Goal Alignment', v:l.fuzzy_alignment_label, badge:<RiskBadge label={l.fuzzy_alignment_label} type="alignment"/> },
              { label:'Study / day',    v:`${l.study_hours_day}h` },
              { label:'Sleep / day',    v:`${l.sleep_hours_day}h`,
                color:l.sleep_hours_day>=7?'#0D9488':l.sleep_hours_day>=6?'#D97706':'#DC2626' },
              { label:'Screen / day',   v:`${l.screen_time_day}h`,
                color:l.screen_time_day<=2?'#0D9488':l.screen_time_day<=4?'#D97706':'#DC2626' },
            ].map(s => (
              <div key={s.label} className="print-card card" style={{padding:'12px 14px'}}>
                <p className="section-label">{s.label}</p>
                <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.125rem',color:s.color||'var(--color-paper)',marginTop:4}}>{s.v}</p>
                {s.badge && <div style={{marginTop:6}}>{s.badge}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Fuzzy Scores */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {[
        { label:'Workload Pressure Score (Fuzzy Module 1)', score:l.fuzzy_pressure_score||0,
          colorFn:s=>s<0.35?'#0D9488':s<0.65?'#D97706':'#DC2626' },
        { label:'Goal Alignment Score (Fuzzy Module 2)', score:l.fuzzy_alignment_score||0,
          colorFn:s=>s<0.4?'#DC2626':s<0.66?'#D97706':'#059669' },
          ].map(f => {
            const pct = Math.round(f.score*100)
            const col = f.colorFn(f.score)
            return (
              <div key={f.label} className="print-card card" style={{padding:'14px 16px'}}>
                <p className="section-label">{f.label}</p>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8,marginBottom:6}}>
                  <span style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.25rem',color:col}}>{pct}%</span>
                </div>
                <div style={{height:6,background:'var(--color-border)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:col,borderRadius:99}}/>
                </div>
              </div>
            )
          })}
        </div>

        {/* Archetype + Consistency */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div className="print-card card" style={{padding:'16px'}}>
            <p className="section-label">Student Archetype</p>
            <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.1rem',color:'#5B4FE8',marginTop:6}}>
              {l.cluster_label}
            </p>
            <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--color-border)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <p className="section-label">Attendance</p>
                <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.125rem',color:'var(--color-paper)',marginTop:2}}>{l.attendance_pct}%</p>
              </div>
              <div>
                <p className="section-label">Study Sessions</p>
                <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1.125rem',color:'var(--color-paper)',marginTop:2}}>{l.study_sessions}/day</p>
              </div>
            </div>
          </div>
          <div className="print-card card" style={{padding:'16px'}}>
            <p className="section-label">Risk Radar</p>
            <RiskRadar data={radar}/>
          </div>
        </div>

        {/* Log summary table */}
        {logs.length > 0 && (
          <div className="print-card card print-break-before" style={{overflowX:'auto'}}>
            <p className="section-label" style={{marginBottom:12}}>Log History Summary (last {Math.min(logs.length,10)} entries)</p>
            <table style={{width:'100%',fontFamily:'JetBrains Mono,monospace',fontSize:'0.7rem',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--color-border)'}}>
                  {['Date','Performance','Study h','Sleep h','Screen h','Pressure','Alignment'].map(h => (
                    <th key={h} style={{padding:'0 10px 8px 0',textAlign:'left',color:'var(--color-muted)',fontWeight:500,opacity:0.7}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().slice(0,10).map((entry,i) => (
                  <tr key={i} style={{borderBottom:'1px solid var(--color-border)'}}>
                    <td style={{padding:'7px 10px 7px 0',color:'var(--color-muted)'}}>
                      {new Date(entry.logged_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                    </td>
                    <td style={{padding:'7px 10px 7px 0',fontWeight:600,color:'var(--color-paper)'}}>{entry.performance_score?.toFixed(1)}</td>
                    <td style={{padding:'7px 10px 7px 0',color:'var(--color-muted)'}}>{entry.study_hours_day}h</td>
                    <td style={{padding:'7px 10px 7px 0',color:entry.sleep_hours_day>=7?'#0D9488':'#D97706'}}>{entry.sleep_hours_day}h</td>
                    <td style={{padding:'7px 10px 7px 0',color:entry.screen_time_day<=2?'#0D9488':'#D97706'}}>{entry.screen_time_day}h</td>
                    <td style={{padding:'7px 10px 7px 0'}}><RiskBadge label={entry.pressure_label}/></td>
                    <td style={{padding:'7px 0'}}><RiskBadge label={entry.fuzzy_alignment_label} type="alignment"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{borderTop:'1px solid var(--color-border)',paddingTop:12,textAlign:'center'}}>
          <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--color-muted)',opacity:0.5}}>
            Academic Digital Twin · ML models trained on 50,000 synthetic records · All outputs are simulations only
          </p>
        </div>
      </div>
    </>
  )
}
