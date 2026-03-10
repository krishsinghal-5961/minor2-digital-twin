import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from './ThemeToggle'
import {
  LayoutDashboard, History, Sliders, PlusCircle,
  Settings, LogOut, Cpu, Menu, X, BarChart2, Clock, FileDown
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to:'/app',             label:'Dashboard',   icon:LayoutDashboard, end:true },
  { to:'/app/log',         label:'Log Entry',   icon:PlusCircle },
  { to:'/app/history',     label:'History',     icon:History },
  { to:'/app/simulate',    label:'Simulate',    icon:Sliders },
  { to:'/app/sim-history', label:'Sim History', icon:Clock },
  { to:'/app/analytics',   label:'Analytics',   icon:BarChart2 },
  { to:'/app/export',      label:'Export PDF',  icon:FileDown },
  { to:'/app/settings',    label:'Settings',    icon:Settings },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => { await logout(); navigate('/') }

  return (
    <div style={{minHeight:'100vh', display:'flex', background:'var(--color-surface)'}}>

      {/* Sidebar */}
      <aside style={{
        position:'fixed', inset:'0 auto 0 0', zIndex:50,
        width:220,
        background:'var(--color-card)',
        borderRight:'1px solid var(--color-border)',
        display:'flex', flexDirection:'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}
      className="lg:!transform-none lg:!translate-x-0 lg:static lg:flex">

        {/* Logo */}
        <div style={{
          padding:'1.25rem 1.125rem',
          borderBottom:'1px solid var(--color-border)',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <div style={{
            width:32, height:32, borderRadius:9,
            background:'rgba(91,79,232,0.12)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Cpu size={15} color="#5B4FE8"/>
          </div>
          <div>
            <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.8125rem', color:'var(--color-paper)', lineHeight:1}}>
              Digital Twin
            </p>
            <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.625rem', color:'var(--color-muted)', marginTop:2}}>
              Academic AI
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1, padding:'0.75rem 0.625rem', overflowY:'auto', display:'flex', flexDirection:'column', gap:2}}>
          {navItems.map(({ to, label, icon:Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={14} strokeWidth={1.75}/>{label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{padding:'0.75rem 0.625rem', borderTop:'1px solid var(--color-border)', display:'flex', flexDirection:'column', gap:6}}>
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:8}}>
            <div style={{
              width:26, height:26, borderRadius:'50%', flexShrink:0,
              background:'rgba(91,79,232,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.6875rem', color:'#5B4FE8',
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <p style={{fontFamily:'DM Sans,sans-serif', fontWeight:500, fontSize:'0.75rem', color:'var(--color-paper)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                {user?.name}
              </p>
              <p style={{fontFamily:'JetBrains Mono,monospace', fontSize:'0.6rem', color:'var(--color-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'capitalize'}}>
                {user?.goal?.replace(/_/g,' ')}
              </p>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:4}}>
            <ThemeToggle compact/>
            <button onClick={handleLogout}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'5px 10px', borderRadius:8,
                background:'transparent', border:'none',
                fontFamily:'DM Sans,sans-serif', fontWeight:500, fontSize:'0.75rem',
                color:'var(--color-muted)', cursor:'pointer', transition:'color 0.15s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.color='#DC2626'}}
              onMouseLeave={e=>{e.currentTarget.style.color='var(--color-muted)'}}>
              <LogOut size={13}/> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{position:'fixed', inset:0, zIndex:40, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(2px)'}}
          className="lg:hidden"/>
      )}

      {/* Main content */}
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}} className="lg:ml-[220px]">
        {/* Mobile topbar */}
        <header className="lg:hidden" style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0.875rem 1.25rem',
          borderBottom:'1px solid var(--color-border)',
          background:'var(--color-card)',
          position:'sticky', top:0, zIndex:30,
        }}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <Cpu size={15} color="#5B4FE8"/>
            <span style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.875rem', color:'var(--color-paper)'}}>
              Digital Twin
            </span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <ThemeToggle compact/>
            <button onClick={() => setOpen(!open)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--color-muted)'}}>
              {open ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:'1.75rem 1.5rem'}} className="lg:p-8">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
