import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, History, Sliders, PlusCircle,
  Settings, LogOut, Cpu, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/app',          label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/history',  label: 'History',   icon: History },
  { to: '/app/simulate', label: 'Simulate',  icon: Sliders },
  { to: '/app/log',      label: 'Log Entry', icon: PlusCircle },
  { to: '/app/settings', label: 'Settings',  icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-ink flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-lead border-r border-white/5
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="px-6 py-8 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
            <Cpu size={18} className="text-accent" />
          </div>
          <div>
            <p className="font-display font-bold text-paper text-sm leading-none">Digital Twin</p>
            <p className="text-paper/30 text-xs font-mono mt-0.5">Academic AI</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-body
                transition-all duration-200
                ${isActive
                  ? 'bg-accent/15 text-accent border border-accent/20'
                  : 'text-paper/50 hover:text-paper hover:bg-white/5'}
              `}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-5 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-display font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-paper text-sm font-body truncate">{user?.name}</p>
              <p className="text-paper/30 text-xs font-mono truncate">{user?.goal?.replace('_',' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-paper/40 hover:text-risk-high hover:bg-risk-high/5 text-sm transition-all duration-200">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-ink/80 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-accent" />
            <span className="font-display font-bold text-sm">Digital Twin</span>
          </div>
          <button onClick={() => setOpen(!open)} className="text-paper/60 hover:text-paper">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
