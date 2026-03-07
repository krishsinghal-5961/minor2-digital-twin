export const mockDashboard = {
  user: { id:'mock-001', name:'Aryan Sharma', email:'aryan@example.com', goal:'cgpa_improvement' },
  total_logs: 8,
  confidence: 'high',
  confidence_note: null,
  latest: {
    logged_at:'2025-03-01T10:00:00Z',
    study_hours_day:5.8, sleep_hours_day:6.2, screen_time_day:3.1,
    attendance_pct:82, deadline_count:3, late_night_ratio:0.3,
    study_sessions:3, extra_hours:1.5,
    performance_score:58.4,
    pressure_label:'Medium',
    fuzzy_pressure_score:0.54, fuzzy_pressure_label:'Medium',
    fuzzy_alignment_score:0.61, fuzzy_alignment_label:'Partial',
    cluster_label:'Balanced & Efficient',
  },
  logs: Array.from({ length:8 }, (_,i) => ({
    id:`log-${i}`,
    logged_at: new Date(2025,0,7+i*7).toISOString(),
    study_hours_day      : +(4+Math.random()*3).toFixed(1),
    sleep_hours_day      : +(5.5+Math.random()*2).toFixed(1),
    screen_time_day      : +(2+Math.random()*3).toFixed(1),
    attendance_pct       : +(70+Math.random()*25).toFixed(0),
    deadline_count       : Math.floor(Math.random()*5),
    performance_score    : +(45+Math.random()*30).toFixed(1),
    pressure_label       : ['Low','Medium','High'][Math.floor(Math.random()*3)],
    fuzzy_pressure_score : +(0.2+Math.random()*0.7).toFixed(3),
    fuzzy_alignment_score: +(0.3+Math.random()*0.6).toFixed(3),
    cluster_label        : 'Balanced & Efficient',
  })),
}

export const mockHistory = { logs: mockDashboard.logs, count: mockDashboard.logs.length }

export function mockSimulate({ changes, scenario_name }) {
  const b = mockDashboard.latest
  const pd = (changes.study_hours_day  ? (changes.study_hours_day -b.study_hours_day )*1.2:0)
           + (changes.sleep_hours_day  ? (changes.sleep_hours_day -b.sleep_hours_day )*0.8:0)
           + (changes.screen_time_day  ? (changes.screen_time_day -b.screen_time_day )*-0.5:0)
  const fd = (changes.sleep_hours_day  ? (changes.sleep_hours_day -b.sleep_hours_day )*-0.08:0)
           + (changes.screen_time_day  ? (changes.screen_time_day -b.screen_time_day )*0.04:0)
  const ad = pd*0.04
  const ap = Math.min(100,Math.max(0,b.performance_score+pd))
  const af = Math.min(1,Math.max(0,b.fuzzy_pressure_score+fd))
  const aa = Math.min(1,Math.max(0,b.fuzzy_alignment_score+ad))
  const pl = v => v<0.35?'Low':v<0.65?'Medium':'High'
  const al = v => v<0.4?'Misaligned':v<0.66?'Partial':'Aligned'
  return {
    scenario_name, changes,
    before: { performance_score:b.performance_score, pressure_label:b.pressure_label, fuzzy_pressure_score:b.fuzzy_pressure_score, fuzzy_pressure_label:b.fuzzy_pressure_label, fuzzy_alignment_score:b.fuzzy_alignment_score, fuzzy_alignment_label:b.fuzzy_alignment_label, cluster_label:b.cluster_label },
    after:  { performance_score:+ap.toFixed(2), pressure_label:pl(af), fuzzy_pressure_score:+af.toFixed(4), fuzzy_pressure_label:pl(af), fuzzy_alignment_score:+aa.toFixed(4), fuzzy_alignment_label:al(aa), cluster_label:b.cluster_label },
    deltas: { performance_score:+pd.toFixed(2), fuzzy_pressure_score:+fd.toFixed(4), fuzzy_alignment_score:+ad.toFixed(4) }
  }
}
