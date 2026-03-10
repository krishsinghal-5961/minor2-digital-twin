import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Landing    from './pages/Landing'
import Login      from './pages/Login'
import Register   from './pages/Register'
import Dashboard  from './pages/Dashboard'
import History    from './pages/History'
import Simulate   from './pages/Simulate'
import LogEntry   from './pages/LogEntry'
import Settings   from './pages/Settings'
import Analytics  from './pages/Analytics'
import SimHistory from './pages/SimHistory'
import ExportPDF  from './pages/ExportPDF'
import Layout     from './components/Layout'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{minHeight:'100vh',background:'var(--color-surface)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid rgba(91,79,232,0.15)',borderTopColor:'#5B4FE8',animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  return user ? children : <Navigate to="/login" replace/>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"              element={<Landing/>}/>
      <Route path="/login"         element={<Login/>}/>
      <Route path="/register"      element={<Register/>}/>
      <Route path="/app" element={<ProtectedRoute><Layout/></ProtectedRoute>}>
        <Route index                element={<Dashboard/>}/>
        <Route path="history"       element={<History/>}/>
        <Route path="simulate"      element={<Simulate/>}/>
        <Route path="log"           element={<LogEntry/>}/>
        <Route path="analytics"     element={<Analytics/>}/>
        <Route path="sim-history"   element={<SimHistory/>}/>
        <Route path="export"        element={<ExportPDF/>}/>
        <Route path="settings"      element={<Settings/>}/>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes/>
    </AuthProvider>
  )
}
