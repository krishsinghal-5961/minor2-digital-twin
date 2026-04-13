import {
  mockDashboard, mockHistory, mockSimulate,
  mockDiminishingReturns, mockAblation, mockGoalSensitivity, mockRiskRadar
} from '../mock/data'

// ── flip to false + set VITE_API_URL in Vercel when backend is live ──
const MOCK_MODE = false
const API_BASE  = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request(method, path, body) {
  const stored = localStorage.getItem('adt_user')
  const user = stored ? JSON.parse(stored) : null
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(user?.id ? { 'X-User-ID': user.id } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || err.message || `Request failed (${res.status})`)

  }
  return res.json()
}

export const api = {
  // Auth
  register : (d) => MOCK_MODE
    ? Promise.resolve({ user: { name: d.name, email: d.email, goal: d.goal } })
    : request('POST', '/api/auth/register', d),
  login    : (d) => MOCK_MODE
    ? Promise.resolve({ user: { name: 'Demo User', email: d.email, goal: 'cgpa_improvement' } })
    : request('POST', '/api/auth/login', d),
  logout   : ()  => MOCK_MODE ? Promise.resolve() : request('POST', '/api/auth/logout'),
  me       : ()  => MOCK_MODE
    ? Promise.resolve({ name: 'Demo User', email: 'demo@example.com', goal: 'cgpa_improvement' })
    : request('GET', '/api/auth/me'),

  // Core data
  dashboard: ()  => MOCK_MODE ? Promise.resolve(mockDashboard) : request('GET', '/api/dashboard'),
  history  : ()  => MOCK_MODE ? Promise.resolve(mockHistory)   : request('GET', '/api/history'),
  log      : (d) => MOCK_MODE
    ? Promise.resolve({ message: 'Log saved', predictions: mockDashboard.latest })
    : request('POST', '/api/log', d),
  settings : (d) => MOCK_MODE
    ? Promise.resolve({ message: 'Updated' })
    : request('PATCH', '/api/settings', d),

  // Simulation
  simulate     : (d)    => MOCK_MODE ? Promise.resolve(mockSimulate(d))          : request('POST', '/api/simulate', d),
  simHistory   : ()     => MOCK_MODE ? Promise.resolve({ simulations: [] })       : request('GET', '/api/sim-history'),

  // Analytics (new endpoints)
  diminishing  : ()     => MOCK_MODE ? Promise.resolve({ curve: mockDiminishingReturns() })   : request('GET',  '/api/diminishing'),
  ablation     : ()     => MOCK_MODE ? Promise.resolve({ results: mockAblation() })            : request('GET',  '/api/ablation'),
  goalSensitivity: (goal) => MOCK_MODE ? Promise.resolve(mockGoalSensitivity(goal))            : request('POST', '/api/goal-sensitivity', { goal }),
  riskRadar    : ()     => MOCK_MODE ? Promise.resolve(mockRiskRadar())                        : request('GET',  '/api/risk-radar'),

  // AI explanation (HF Mistral-7B in production)
  explain: (data) => MOCK_MODE
    ? Promise.resolve({ explanation: _mockExplanation(data) })
    : request('POST', '/api/explain', data),

  // Screenshot parse (HF vision model in production)
  parseScreenshot: (base64Image) => MOCK_MODE
    ? new Promise(r => setTimeout(() => r({ screen_time_day: +(1.5 + Math.random()*3).toFixed(1) }), 1200))
    : request('POST', '/api/parse-screenshot', { image: base64Image }),

  // User feedback — adjusts fuzzy thresholds per user (backend feature)
  // type: 'explanation' | 'prediction' | 'simulation'
  // value: 'helpful' | 'not_helpful'
  // When backend is live: POST /api/feedback → stored in Supabase → adjusts per-user fuzzy thresholds
  feedback: (d) => MOCK_MODE
    ? Promise.resolve({ message: 'Feedback recorded (mock)' })
    : request('POST', '/api/feedback', d),
}

// Mock explanation mirrors what Mistral-7B would produce
function _mockExplanation({ performance_score, pressure_label, fuzzy_alignment_label, cluster_label }) {
  const pNote = {
    High  : 'Workload pressure is currently high — primarily driven by sleep deficit and dense deadlines.',
    Medium: 'Workload pressure is moderate. Minor sleep or screen-time adjustments could improve stability.',
    Low   : 'Workload pressure is well managed. Current habits look sustainable.',
  }[pressure_label] || ''
  const aNote = {
    Aligned   : 'Effort is well-aligned with your stated academic goal.',
    Partial   : 'Goal alignment is partial. Increasing focused study hours would strengthen it.',
    Misaligned: 'There is a mismatch between current effort and your goal. Reviewing your study strategy may help.',
  }[fuzzy_alignment_label] || ''
  const cNote = {
    'Balanced & Efficient'    : 'Your habits are consistent and effort is translating well into predicted outcomes.',
    'Extracurricular Focused' : 'You are active beyond academics — monitor for early burnout signals.',
    'Overworked & Struggling' : 'High effort without adequate recovery detected. Prioritising sleep and reducing screen time is recommended.',
  }[cluster_label] || ''
  return `Based on recent activity, predicted performance score is ${parseFloat(performance_score).toFixed(1)}/100. ${pNote} ${aNote} Student archetype is "${cluster_label}" — ${cNote} These are simulations only, not prescriptions or diagnoses.`
}
