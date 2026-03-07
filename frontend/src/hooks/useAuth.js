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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
