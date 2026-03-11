import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('adt_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (data) => {
    const res = await api.login(data)
    setUser(res.user)
    localStorage.setItem('adt_user', JSON.stringify(res.user))
    return res
  }

  const register = async (data) => {
    const res = await api.register(data)
    setUser(res.user)
    localStorage.setItem('adt_user', JSON.stringify(res.user))
    return res
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
    localStorage.removeItem('adt_user')
  }

  // Call this after a successful settings save so goal/name changes
  // are reflected immediately across the whole app (LogEntry reads user.goal)
  const updateUser = (patch) => {
    setUser(prev => {
      const updated = { ...prev, ...patch }
      localStorage.setItem('adt_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
