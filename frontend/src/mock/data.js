// ============================================================
// MOCK DATA — mirrors exact backend response shapes
// Logic crosschecked line-by-line against training notebook
// ============================================================

// ── FEATURE ENGINEERING ──────────────────────────────────────
// notebook: study_efficiency = study * (1 - late_night) / (study + 1)
function studyEfficiency(study, lateNight) {
  return +(study * (1 - lateNight) / (study + 1)).toFixed(4)
}
// notebook: deadline_density = deadline_count / 7.0, clipped 0-1
function deadlineDensity(count) {
  return +Math.min(1, count / 7).toFixed(4)
}
// notebook: effort_mismatch = study_hours_day - rolling_mean per student
// mock uses global mean=5.5 (dataset mean from training)
function effortMismatch(study, rollingMean = 5.5) {
  return +(study - rollingMean).toFixed(4)
}

// ── TRAPMF / TRIMF MEMBERSHIP FUNCTIONS ──────────────────────
// Exact translation of skfuzzy trapmf and trimf from notebook
// trapmf(x, [a,b,c,d]): 0 if x<=a, ramp up a→b, 1 from b→c, ramp down c→d, 0 if x>=d
function trapmf(x, a, b, c, d) {
  if (x <= a || x >= d) return 0
  if (x >= b && x <= c) return 1
  if (x < b) return (x - a) / (b - a)
  return (d - x) / (d - c)
}
// trimf(x, [a,b,c]): 0 at a, peak at b, 0 at c
function trimf(x, a, b, c) {
  if (x <= a || x >= c) return 0
  if (x <= b) return (x - a) / (b - a)
  return (c - x) / (c - b)
}

// ── FUZZY PRESSURE THRESHOLDS (notebook exact) ───────────────
// pressure[low]    trapmf [0.0, 0.0, 0.2, 0.35]
// pressure[medium] trimf  [0.25, 0.5, 0.75]
// pressure[high]   trapmf [0.65, 0.8, 1.0, 1.0]
// label: score < 0.35 → Low, < 0.65 → Medium, >= 0.65 → High
function pressureLabel(score) {
  return score < 0.35 ? 'Low' : score < 0.65 ? 'Medium' : 'High'
}

// ── FUZZY ALIGNMENT THRESHOLDS (notebook exact) ──────────────
// alignment[misaligned] trapmf [0.0, 0.0, 0.2, 0.4]
// alignment[partial]    trimf  [0.3, 0.5, 0.7]
// alignment[aligned]    trapmf [0.6, 0.8, 1.0, 1.0]
// label: score < 0.4 → Misaligned, < 0.66 → Partial, >= 0.66 → Aligned
function alignmentLabel(score) {
  return score < 0.4 ? 'Misaligned' : score < 0.66 ? 'Partial' : 'Aligned'
}

// ── FUZZY MODULE 1 — WORKLOAD PRESSURE ───────────────────────
// Implements notebook trapmf membership degrees + Mamdani min() rule firing
// Inputs: sleep[4–9], deadlines[0–1], screen[0–8], stability[0–1]
// Output: defuzzified pressure score [0–1]
function approxFuzzyPressure(sleep, deadlines, screen, stability) {
  // Clamp inputs (notebook uses np.clip)
  sleep     = Math.max(4.0, Math.min(9.0, sleep))
  deadlines = Math.max(0.0, Math.min(1.0, deadlines))
  screen    = Math.max(0.0, Math.min(8.0, screen))
  stability = Math.max(0.0, Math.min(1.0, stability))

  // Notebook membership functions:
  // sleep[poor]     trapmf [4.0, 4.0, 5.0, 6.5]
  // sleep[adequate] trimf  [5.5, 6.5, 7.5]
  // sleep[good]     trapmf [7.0, 7.5, 9.0, 9.0]
  const sleepPoor     = trapmf(sleep, 4.0, 4.0, 5.0, 6.5)
  const sleepAdequate = trimf(sleep, 5.5, 6.5, 7.5)
  const sleepGood     = trapmf(sleep, 7.0, 7.5, 9.0, 9.0)

  // deadlines[low]    trapmf [0.0, 0.0, 0.2, 0.4]
  // deadlines[medium] trimf  [0.3, 0.5, 0.7]
  // deadlines[high]   trapmf [0.6, 0.8, 1.0, 1.0]
  const dlLow    = trapmf(deadlines, 0.0, 0.0, 0.2, 0.4)
  const dlMedium = trimf(deadlines, 0.3, 0.5, 0.7)
  const dlHigh   = trapmf(deadlines, 0.6, 0.8, 1.0, 1.0)

  // screen[low]    trapmf [0.0, 0.0, 1.5, 3.0]
  // screen[medium] trimf  [2.0, 3.5, 5.0]
  // screen[high]   trapmf [4.0, 5.5, 8.0, 8.0]
  const scrLow  = trapmf(screen, 0.0, 0.0, 1.5, 3.0)
  const scrHigh = trapmf(screen, 4.0, 5.5, 8.0, 8.0)

  // stability[unstable] trapmf [0.0, 0.0, 0.3, 0.5]
  // stability[moderate] trimf  [0.35, 0.55, 0.75]
  // stability[stable]   trapmf [0.65, 0.8, 1.0, 1.0]
  const stabUnstable = trapmf(stability, 0.0, 0.0, 0.3, 0.5)
  const stabModerate = trimf(stability, 0.35, 0.55, 0.75)
  const stabStable   = trapmf(stability, 0.65, 0.8, 1.0, 1.0)

  // 12 Mamdani rules — strength = min(antecedents)
  // HIGH rules
  const h1 = Math.min(dlHigh, sleepPoor)
  const h2 = Math.min(dlHigh, stabUnstable)
  const h3 = Math.min(dlHigh, scrHigh)
  const h4 = Math.min(sleepPoor, scrHigh)
  const h5 = Math.min(sleepPoor, stabUnstable)
  const highStrength = Math.max(h1, h2, h3, h4, h5)

  // MEDIUM rules
  const m1 = Math.min(dlMedium, sleepAdequate)
  const m2 = Math.min(dlMedium, stabModerate)
  const m3 = Math.min(dlHigh, sleepAdequate)
  const m4 = Math.min(sleepPoor, dlLow)
  const medStrength = Math.max(m1, m2, m3, m4)

  // LOW rules
  const l1 = Math.min(dlLow, sleepGood)
  const l2 = Math.min(dlLow, stabStable)
  const l3 = Math.min(sleepGood, scrLow, stabStable)
  const lowStrength = Math.max(l1, l2, l3)

  // Centroid defuzzification (approximate):
  // pressure[low]=centroid≈0.175, pressure[medium]≈0.50, pressure[high]≈0.825
  const lowCentroid  = 0.175
  const medCentroid  = 0.50
  const highCentroid = 0.825

  const num = lowStrength*lowCentroid + medStrength*medCentroid + highStrength*highCentroid
  const den = lowStrength + medStrength + highStrength

  // If no rules fire, default to medium
  const score = den < 1e-6 ? 0.5 : num / den
  return +Math.min(1, Math.max(0, score)).toFixed(4)
}

// ── FUZZY MODULE 2 — GOAL ALIGNMENT ──────────────────────────
// Implements notebook EXPANDED v2 rules (24 rules — final "FIX" cell)
// Inputs: effort_mismatch[-1→1], study_hours[0→10], pressure_score[0→1]
// Note: pressure_score in notebook = numeric column (0-1 normalized)
//       In mock we use fuzzy_pressure_score as proxy (same range, correlated)
function approxFuzzyAlignment(mismatch, studyHours, pressureScore) {
  mismatch     = Math.max(-1.0, Math.min(1.0, mismatch))
  studyHours   = Math.max(0.0,  Math.min(10.0, studyHours))
  pressureScore= Math.max(0.0,  Math.min(1.0, pressureScore))

  // mismatch[negative] trapmf [-1,-1,-0.3,-0.05]
  // mismatch[neutral]  trimf  [-0.15, 0.0, 0.15]
  // mismatch[positive] trapmf [0.05, 0.3, 1.0, 1.0]
  const misNeg = trapmf(mismatch, -1.0, -1.0, -0.3, -0.05)
  const misNeu = trimf(mismatch, -0.15, 0.0, 0.15)
  const misPos = trapmf(mismatch, 0.05, 0.3, 1.0, 1.0)

  // effort[low]      trapmf [0,0,2,4]
  // effort[moderate] trimf  [3,5,7]
  // effort[high]     trapmf [6,8,10,10]
  const effLow  = trapmf(studyHours, 0.0, 0.0, 2.0, 4.0)
  const effMod  = trimf(studyHours, 3.0, 5.0, 7.0)
  const effHigh = trapmf(studyHours, 6.0, 8.0, 10.0, 10.0)

  // p_score[low]    trapmf [0,0,0.2,0.35]
  // p_score[medium] trimf  [0.25,0.5,0.75]
  // p_score[high]   trapmf [0.65,0.8,1.0,1.0]
  const psLow  = trapmf(pressureScore, 0.0, 0.0, 0.2, 0.35)
  const psMed  = trimf(pressureScore, 0.25, 0.5, 0.75)
  const psHigh = trapmf(pressureScore, 0.65, 0.8, 1.0, 1.0)

  // 24 rules from notebook final cell (EXPANDED rules_alignment)
  // ALIGNED (4 rules)
  const a1 = Math.min(misPos, effHigh,  psLow)
  const a2 = Math.min(misPos, effHigh,  psMed)
  const a3 = Math.min(misNeu, effHigh,  psLow)
  const a4 = Math.min(misPos, effMod,   psLow)
  const alignedStrength = Math.max(a1, a2, a3, a4)

  // PARTIAL (12 rules)
  const p1  = Math.min(misPos, effMod,  psMed)
  const p2  = Math.min(misNeu, effMod,  psLow)
  const p3  = Math.min(misNeu, effMod,  psMed)
  const p4  = Math.min(misNeu, effHigh, psMed)
  const p5  = Math.min(misNeu, effHigh, psHigh)
  const p6  = Math.min(misNeg, effHigh, psMed)
  const p7  = Math.min(misPos, effLow,  psLow)
  const p8  = Math.min(misPos, effHigh, psHigh)
  const p9  = Math.min(misNeu, effLow,  psMed)
  const p10 = Math.min(misNeg, effMod,  psLow)
  const p11 = Math.min(misNeg, effMod,  psMed)
  const p12 = Math.min(misPos, effLow,  psMed)
  const p13 = Math.min(misPos, effLow,  psHigh)
  const p14 = Math.min(misNeu, effLow,  psLow)
  const partialStrength = Math.max(p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,p13,p14)

  // MISALIGNED (6 rules)
  const ms1 = Math.min(misNeg, effLow,  psLow)
  const ms2 = Math.min(misNeg, effLow,  psMed)
  const ms3 = Math.min(misNeg, effLow,  psHigh)
  const ms4 = Math.min(misNeg, effMod,  psHigh)
  const ms5 = Math.min(misNeg, effHigh, psHigh)
  const ms6 = Math.min(misNeu, effLow,  psHigh)
  const misalignedStrength = Math.max(ms1, ms2, ms3, ms4, ms5, ms6)

  // Centroid approximations per output MF:
  // alignment[misaligned] trapmf [0,0,0.2,0.4] → centroid ≈ 0.133
  // alignment[partial]    trimf  [0.3,0.5,0.7]  → centroid ≈ 0.50
  // alignment[aligned]    trapmf [0.6,0.8,1.0,1.0] → centroid ≈ 0.85
  const misCentroid  = 0.133
  const partCentroid = 0.50
  const aliCentroid  = 0.85

  const num = misalignedStrength*misCentroid + partialStrength*partCentroid + alignedStrength*aliCentroid
  const den = misalignedStrength + partialStrength + alignedStrength

  // Fallback from notebook compute_fuzzy_alignment_v2 except clause
  if (den < 1e-6) {
    if (mismatch < -0.2 || studyHours < 2) return 0.2
    if (mismatch > 0.1 && studyHours > 5)  return 0.75
    return 0.5
  }
  return +Math.min(1, Math.max(0, num / den)).toFixed(4)
}

// ── CLUSTER ASSIGNMENT ────────────────────────────────────────
// Mirrors notebook cluster_labels (manually fixed cell):
// 0: Balanced & Efficient, 1: Extracurricular Focused, 2: Overworked & Struggling
// Derived from notebook cluster profile analysis of TIME_FEATURES:
//   study_hours_day, sleep_hours_day, screen_time_day,
//   study_efficiency, habit_stability, extra_hours
//
// FIX: Low deadlines alone do NOT determine cluster — KMeans doesn't use deadlines.
// Cluster 2 (Overworked) = high study hours + poor sleep + low stability
// Cluster 1 (Extracurricular) = high extra_hours (primary) OR high screen + low sleep
// Cluster 0 (Balanced) = good stability + good efficiency + adequate sleep
function assignCluster(study, sleep, screen, efficiency, stability, extra) {
  // Score each cluster centroid distance (simplified Euclidean on scaled features)
  // Centroids derived from notebook profile table (approximate):
  // Balanced:        study~5.5, sleep~7.2, screen~2.5, eff~0.62, stab~0.72, extra~1.2
  // Extracurricular: study~5.8, sleep~6.3, screen~3.8, eff~0.55, stab~0.50, extra~4.1
  // Overworked:      study~7.5, sleep~5.5, screen~3.2, eff~0.48, stab~0.35, extra~1.8
  const centroids = {
    'Balanced & Efficient'    : [5.5, 7.2, 2.5, 0.62, 0.72, 1.2],
    'Extracurricular Focused' : [5.8, 6.3, 3.8, 0.55, 0.50, 4.1],
    'Overworked & Struggling' : [7.5, 5.5, 3.2, 0.48, 0.35, 1.8],
  }
  // Scale factors (approximate std of each feature from dataset)
  const scales = [1.8, 1.1, 1.5, 0.12, 0.18, 1.4]
  const point  = [study, sleep, screen, efficiency, stability, extra]

  let best = null, bestDist = Infinity
  for (const [label, c] of Object.entries(centroids)) {
    const dist = Math.sqrt(c.reduce((s, cv, i) => s + ((point[i]-cv)/scales[i])**2, 0))
    if (dist < bestDist) { bestDist = dist; best = label }
  }
  return best
}

// ── BEHAVIORAL CONSISTENCY SCORE ─────────────────────────────
// notebook GROUP 3:
//   study_hours_day_vol3  = shift(1).rolling(3, min_periods=2).std()  per student
//   sleep_hours_day_vol3  = same
//   screen_time_day_vol3  = same
//   habit_volatility_index = mean of those 3 vol3 columns
//
// Mock: std of last 3 logs (past logs = no current week, same as shift(1))
// Normalisation: HVI is raw std units. Typical range 0–3h for study.
// We normalise by dividing HVI by 2.0 (empirically derived from dataset)
// so consistency = 1 - (hvi / 2.0), clipped 0-1
function consistencyScore(logs) {
  if (logs.length < 3) return null  // not enough data — mirrors min_periods=2
  // Use past logs only (mirror shift(1)) — exclude the latest entry
  const past = logs.slice(0, -1).slice(-3)
  if (past.length < 2) return null

  const std = (arr) => {
    const m = arr.reduce((a, b) => a + b, 0) / arr.length
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length)
  }
  const studyVol  = std(past.map(l => l.study_hours_day))
  const sleepVol  = std(past.map(l => l.sleep_hours_day))
  const screenVol = std(past.map(l => l.screen_time_day))
  const hvi = (studyVol + sleepVol + screenVol) / 3
  // Normalise: hvi of ~2h → 0 consistency; hvi of 0 → 1.0 consistency
  return +Math.min(1, Math.max(0, 1 - hvi / 2.0)).toFixed(3)
}

// ── HABIT STABILITY PER LOG ───────────────────────────────────
// notebook: habit_stability = 1 - rolling_std(study, 3) / (global_std + 1e-6)
// global_std of study_hours across dataset ≈ 1.8 (from training notebook stats)
const GLOBAL_STUDY_STD = 1.8
function habitStability(logs, idx) {
  if (idx < 1) return 0.7  // week 1: no past data, notebook fills with mean
  const start = Math.max(0, idx - 3)
  const window = logs.slice(start, idx).map(l => l.study_hours_day)
  if (window.length < 2) return 0.7
  const m = window.reduce((a,b)=>a+b,0)/window.length
  const s = Math.sqrt(window.reduce((acc,x)=>acc+(x-m)**2,0)/window.length)
  return +Math.min(1, Math.max(0, 1 - s / (GLOBAL_STUDY_STD + 1e-6))).toFixed(4)
}

// ── GENERATE LOGS ─────────────────────────────────────────────
function generateLogs(n = 12) {
  const raw = []
  let baseStudy  = 5.5
  let baseSleep  = 6.5
  let baseScreen = 3.0

  for (let i = 0; i < n; i++) {
    const study      = +Math.max(1, Math.min(12, baseStudy  + (Math.random()-0.5)*1.8)).toFixed(1)
    const sleep      = +Math.max(4, Math.min(10, baseSleep  + (Math.random()-0.5)*1.2)).toFixed(1)
    const screen     = +Math.max(0, Math.min(8,  baseScreen + (Math.random()-0.5)*1.0)).toFixed(1)
    const lateNight  = +Math.max(0, Math.min(1,  0.2 + (Math.random()-0.5)*0.3)).toFixed(2)
    const deadlines  = Math.floor(Math.random() * 6)
    const sessions   = Math.floor(2 + Math.random() * 4)
    const extra      = +(Math.random() * 3.5).toFixed(1)
    const attendance = +(70 + Math.random() * 25).toFixed(0)
    raw.push({ study, sleep, screen, lateNight, deadlines, sessions, extra, attendance })
    baseStudy  += (Math.random()-0.48)*0.3
    baseSleep  += (Math.random()-0.48)*0.2
    baseScreen += (Math.random()-0.5)*0.2
  }

  // Two-pass: need all raw data first to compute rolling features
  return raw.map((r, i) => {
    const efficiency = studyEfficiency(r.study, r.lateNight)
    const density    = deadlineDensity(r.deadlines)
    const stability  = habitStability(raw.map(x=>({study_hours_day:x.study})), i)
    const mismatch   = effortMismatch(r.study)
    const fp         = approxFuzzyPressure(r.sleep, density, r.screen, stability)
    const fa         = approxFuzzyAlignment(mismatch, r.study, fp)
    const cluster    = assignCluster(r.study, r.sleep, r.screen, efficiency, stability, r.extra)
    // Performance formula weighted by notebook feature importances
    // study_hours: 0.3224, study_efficiency: 0.2985, deadline_density: 0.0880
    const perf = Math.min(100, Math.max(0,
      35 + r.study*3.2 + efficiency*28 + (1-density)*6 + r.sleep*1.5 - r.screen*0.8 + (Math.random()-0.5)*6
    ))

    return {
      id                  : `log-${i}`,
      logged_at           : new Date(2025, 0, 7 + i*7).toISOString(),
      study_hours_day     : r.study,
      sleep_hours_day     : r.sleep,
      screen_time_day     : r.screen,
      attendance_pct      : r.attendance,
      deadline_count      : r.deadlines,
      late_night_ratio    : r.lateNight,
      study_sessions      : r.sessions,
      extra_hours         : r.extra,
      // Derived features (mirrors notebook engineer_features)
      study_efficiency    : efficiency,
      deadline_density    : density,
      habit_stability     : stability,
      effort_mismatch     : mismatch,
      // Predictions
      performance_score   : +perf.toFixed(1),
      pressure_label      : pressureLabel(fp),        // ML risk label (Model 3)
      fuzzy_pressure_score: fp,
      fuzzy_pressure_label: pressureLabel(fp),
      fuzzy_alignment_score: fa,
      fuzzy_alignment_label: alignmentLabel(fa),
      cluster_label       : cluster,
    }
  })
}

const LOGS    = generateLogs(12)
const LATEST  = LOGS[LOGS.length - 1]
const CONSISTENCY = consistencyScore(LOGS)

export const mockDashboard = {
  user             : { id:'mock-001', name:'Aryan Sharma', email:'aryan@example.com', goal:'cgpa_improvement' },
  total_logs       : LOGS.length,
  confidence       : LOGS.length >= 4 ? 'high' : LOGS.length >= 2 ? 'medium' : 'low',
  confidence_note  : LOGS.length < 3 ? 'Based on limited inputs. Predictions stabilise after 3+ logs.' : null,
  consistency_score: CONSISTENCY,
  latest           : LATEST,
  logs             : LOGS,
}

export const mockHistory = { logs: LOGS, count: LOGS.length }

// ── SIMULATE ──────────────────────────────────────────────────
// mirrors notebook run_simulation() + apply_scenario()
export function mockSimulate({ changes, scenario_name }) {
  const b   = LATEST
  const mod = { ...b, ...changes }

  // Re-engineer derived features after changes (mirrors apply_scenario + engineer_features)
  mod.study_efficiency = studyEfficiency(mod.study_hours_day, mod.late_night_ratio ?? b.late_night_ratio)
  mod.deadline_density = deadlineDensity(mod.deadline_count ?? b.deadline_count)
  mod.effort_mismatch  = effortMismatch(mod.study_hours_day)
  mod.habit_stability  = b.habit_stability  // rolling feature — unchanged for single sim step

  // Performance delta (mirrors notebook predict_performance via feature importances)
  const dStudy    = (mod.study_hours_day   - b.study_hours_day)   * 3.2
  const dEff      = (mod.study_efficiency  - b.study_efficiency)  * 28
  const dDeadline = (b.deadline_density    - mod.deadline_density) * 6   // more deadlines = lower perf
  const dSleep    = (mod.sleep_hours_day   - b.sleep_hours_day)   * 1.5
  const dScreen   = (mod.screen_time_day   - b.screen_time_day)   * -0.8
  const perfDelta = +(dStudy + dEff + dDeadline + dSleep + dScreen).toFixed(2)
  const afterPerf = +Math.min(100, Math.max(0, b.performance_score + perfDelta)).toFixed(2)

  // Fuzzy scores recomputed (mirrors predict_fuzzy_pressure / predict_fuzzy_alignment)
  const afterFP = approxFuzzyPressure(
    mod.sleep_hours_day, mod.deadline_density, mod.screen_time_day, mod.habit_stability
  )
  const afterFA = approxFuzzyAlignment(mod.effort_mismatch, mod.study_hours_day, afterFP)
  const afterCluster = assignCluster(
    mod.study_hours_day, mod.sleep_hours_day, mod.screen_time_day,
    mod.study_efficiency, mod.habit_stability, b.extra_hours
  )

  return {
    scenario_name, changes,
    before: {
      performance_score    : b.performance_score,
      pressure_label       : b.pressure_label,
      fuzzy_pressure_score : b.fuzzy_pressure_score,
      fuzzy_pressure_label : b.fuzzy_pressure_label,
      fuzzy_alignment_score: b.fuzzy_alignment_score,
      fuzzy_alignment_label: b.fuzzy_alignment_label,
      cluster_label        : b.cluster_label,
    },
    after: {
      performance_score    : afterPerf,
      pressure_label       : pressureLabel(afterFP),
      fuzzy_pressure_score : afterFP,
      fuzzy_pressure_label : pressureLabel(afterFP),
      fuzzy_alignment_score: afterFA,
      fuzzy_alignment_label: alignmentLabel(afterFA),
      cluster_label        : afterCluster,
    },
    deltas: {
      performance_score    : perfDelta,
      fuzzy_pressure_score : +(afterFP - b.fuzzy_pressure_score).toFixed(4),
      fuzzy_alignment_score: +(afterFA - b.fuzzy_alignment_score).toFixed(4),
    }
  }
}

// ── DIMINISHING RETURNS ───────────────────────────────────────
// Marginal gain per extra study hour — mirrors feature importance weighting
// Shows the plateau effect at high study hours (study_efficiency saturates)
export function mockDiminishingReturns() {
  const b = LATEST
  const points = []
  let prevPerf = null

  for (let study = 1; study <= 12; study += 0.5) {
    const eff  = studyEfficiency(study, b.late_night_ratio)
    const dS   = (study - b.study_hours_day) * 3.2
    const dE   = (eff   - b.study_efficiency) * 28
    const perf = +Math.min(100, Math.max(0, b.performance_score + dS + dE)).toFixed(1)
    const marginal = prevPerf === null ? 0 : +(perf - prevPerf).toFixed(2)
    points.push({ study_hours: study, performance: perf, marginal_gain: marginal })
    prevPerf = perf
  }
  return points
}

// ── ABLATION STUDY ────────────────────────────────────────────
// Remove one feature → observe performance impact
// Mirrors notebook feature importance ranking (top features cause most drop)
export function mockAblation() {
  const b = LATEST
  const baseline = b.performance_score

  const features = [
    { name:'Study Hours',       studyOverride: 0,    effOverride: null,  deadlineOverride: null, sleepOverride: null,  screenOverride: null },
    { name:'Study Efficiency',  studyOverride: null, effOverride: 0,     deadlineOverride: null, sleepOverride: null,  screenOverride: null },
    { name:'Deadline Density',  studyOverride: null, effOverride: null,  deadlineOverride: 1.0,  sleepOverride: null,  screenOverride: null },
    { name:'Sleep Hours',       studyOverride: null, effOverride: null,  deadlineOverride: null, sleepOverride: 4.0,   screenOverride: null },
    { name:'Screen Time',       studyOverride: null, effOverride: null,  deadlineOverride: null, sleepOverride: null,  screenOverride: 8.0  },
    { name:'Late Night Ratio',  studyOverride: null, effOverride: null,  deadlineOverride: null, sleepOverride: null,  screenOverride: null, lateNightOverride: 1.0 },
  ]

  return features.map(f => {
    const study  = f.studyOverride  ?? b.study_hours_day
    const late   = f.lateNightOverride ?? b.late_night_ratio
    const eff    = f.effOverride    ?? studyEfficiency(study, late)
    const dens   = f.deadlineOverride !== null ? f.deadlineOverride : b.deadline_density
    const sleep  = f.sleepOverride  ?? b.sleep_hours_day
    const screen = f.screenOverride ?? b.screen_time_day

    const dS   = (study  - b.study_hours_day)   * 3.2
    const dE   = (eff    - b.study_efficiency)   * 28
    const dD   = (b.deadline_density - dens)     * 6
    const dSl  = (sleep  - b.sleep_hours_day)    * 1.5
    const dSc  = (screen - b.screen_time_day)    * -0.8
    const ablated = +Math.min(100, Math.max(0, baseline + dS + dE + dD + dSl + dSc)).toFixed(1)

    return {
      feature       : f.name,
      baseline_score: baseline,
      ablated_score : ablated,
      impact        : +(baseline - ablated).toFixed(1),
    }
  }).sort((a, b) => b.impact - a.impact)
}

// ── GOAL SENSITIVITY ─────────────────────────────────────────
// Different goals weight different habits — mirrors notebook goal_alignment logic
// goal_alignment in dataset = (effort - goal_expected_effort) / goal_expected_effort
export function mockGoalSensitivity(newGoal) {
  const goalProfiles = {
    cgpa_improvement: { studyMult:1.0, sleepMult:0.8,  expectedStudy:6.0 },
    workload_balance : { studyMult:0.7, sleepMult:1.2,  expectedStudy:4.5 },
    placement_prep   : { studyMult:1.2, sleepMult:0.75, expectedStudy:7.0 },
    skill_building   : { studyMult:0.9, sleepMult:0.9,  expectedStudy:5.5 },
  }
  const profile = goalProfiles[newGoal] || goalProfiles.cgpa_improvement
  const b = LATEST

  // Re-derive mismatch for new goal (effort vs goal expected effort)
  const newMismatch = effortMismatch(b.study_hours_day, profile.expectedStudy)
  const adjSleep    = b.sleep_hours_day * profile.sleepMult
  const adjFP       = approxFuzzyPressure(adjSleep, b.deadline_density, b.screen_time_day, b.habit_stability)
  const adjFA       = approxFuzzyAlignment(newMismatch, b.study_hours_day, adjFP)

  // Performance: goal multiplier adjusts effective study
  const effectiveStudy = b.study_hours_day * profile.studyMult
  const effectiveEff   = studyEfficiency(effectiveStudy, b.late_night_ratio)
  const dS  = (effectiveStudy - b.study_hours_day) * 3.2
  const dE  = (effectiveEff   - b.study_efficiency) * 28
  const adjPerf = +Math.min(100, Math.max(0, b.performance_score + dS + dE)).toFixed(2)

  return {
    goal                 : newGoal,
    performance_score    : adjPerf,
    fuzzy_pressure_score : adjFP,
    fuzzy_pressure_label : pressureLabel(adjFP),
    fuzzy_alignment_score: adjFA,
    fuzzy_alignment_label: alignmentLabel(adjFA),
    delta_performance    : +(adjPerf - b.performance_score).toFixed(2),
    delta_pressure       : +(adjFP - b.fuzzy_pressure_score).toFixed(4),
    delta_alignment      : +(adjFA  - b.fuzzy_alignment_score).toFixed(4),
  }
}

// ── RISK RADAR DATA ───────────────────────────────────────────
// Trend-based early warning — uses GROUP 2 (slopes) and GROUP 3 (volatility)
// from notebook feature engineering
export function mockRiskRadar() {
  if (LOGS.length < 3) return null
  const recent = LOGS.slice(-5)

  // Compute slope3 for each metric (mirrors notebook rolling_slope)
  const slope = (arr) => {
    if (arr.length < 2) return 0
    const n = arr.length
    const xs = arr.map((_, i) => i)
    const mx = xs.reduce((a,b)=>a+b,0)/n
    const my = arr.reduce((a,b)=>a+b,0)/n
    const num = xs.reduce((s,x,i)=>s+(x-mx)*(arr[i]-my),0)
    const den = xs.reduce((s,x)=>s+(x-mx)**2,0)
    return den < 1e-9 ? 0 : num/den
  }

  const perfSlope    = slope(recent.map(l=>l.performance_score))
  const pressSlope   = slope(recent.map(l=>l.fuzzy_pressure_score))
  const alignSlope   = slope(recent.map(l=>l.fuzzy_alignment_score))
  const studySlope   = slope(recent.map(l=>l.study_hours_day))
  const sleepSlope   = slope(recent.map(l=>l.sleep_hours_day))
  const screenSlope  = slope(recent.map(l=>l.screen_time_day))

  // Normalise slopes to 0-100 risk scale for radar
  // positive pressure slope = higher risk; negative perf slope = higher risk
  const norm = (v, reverse, scale) => {
    const raw = reverse ? -v : v
    return Math.min(100, Math.max(0, 50 + raw * scale))
  }

  return {
    axes: [
      { axis:'Performance Trend',  value: norm(perfSlope,   true,  15), raw: +perfSlope.toFixed(3) },
      { axis:'Pressure Trend',     value: norm(pressSlope,  false, 60), raw: +pressSlope.toFixed(3) },
      { axis:'Alignment Trend',    value: norm(alignSlope,  true,  60), raw: +alignSlope.toFixed(3) },
      { axis:'Study Consistency',  value: norm(studySlope,  false,  8), raw: +studySlope.toFixed(3) },
      { axis:'Sleep Trend',        value: norm(sleepSlope,  true,  10), raw: +sleepSlope.toFixed(3) },
      { axis:'Screen Time Trend',  value: norm(screenSlope, false, 10), raw: +screenSlope.toFixed(3) },
    ],
    pressure_momentum: pressSlope > 0.02 ? 'building' : pressSlope < -0.02 ? 'releasing' : 'stable',
    performance_momentum: perfSlope > 1 ? 'rising' : perfSlope < -1 ? 'declining' : 'stable',
    weeks_used: recent.length,
  }
}

export { LOGS, LATEST, CONSISTENCY, pressureLabel, alignmentLabel, consistencyScore }
