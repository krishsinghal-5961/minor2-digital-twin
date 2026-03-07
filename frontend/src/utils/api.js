import { mockDashboard, mockHistory, mockSimulate } from '../mock/data'

const MOCK_MODE = true
const API_BASE  = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  register : (d) => MOCK_MODE ? Promise.resolve({ user: { name: d.name, email: d.email, goal: d.goal } }) : request('POST', '/api/auth/register', d),
  login    : (d) => MOCK_MODE ? Promise.resolve({ user: { name: 'Demo User', email: d.email, goal: 'cgpa_improvement' } }) : request('POST', '/api/auth/login', d),
  logout   : ()  => MOCK_MODE ? Promise.resolve() : request('POST', '/api/auth/logout'),
  me       : ()  => MOCK_MODE ? Promise.resolve({ name: 'Demo User', email: 'demo@example.com', goal: 'cgpa_improvement' }) : request('GET', '/api/auth/me'),
  dashboard: ()  => MOCK_MODE ? Promise.resolve(mockDashboard) : request('GET', '/api/dashboard'),
  history  : ()  => MOCK_MODE ? Promise.resolve(mockHistory)   : request('GET', '/api/history'),
  log      : (d) => MOCK_MODE ? Promise.resolve({ message: 'Log saved', predictions: mockDashboard.latest }) : request('POST', '/api/log', d),
  simulate : (d) => MOCK_MODE ? Promise.resolve(mockSimulate(d)) : request('POST', '/api/simulate', d),
  settings : (d) => MOCK_MODE ? Promise.resolve({ message: 'Updated' }) : request('PATCH', '/api/settings', d),
}
