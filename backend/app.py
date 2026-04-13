# ============================================================
# FLASK BACKEND — Academic Digital Twin
# Real production backend — supports real user registration,
# weekly data logging, ML predictions, What-If simulation
# File: backend/app.py
# ============================================================

import os
import numpy as np
import pandas as pd
import joblib
import skfuzzy as fuzz
from skfuzzy        import control as ctrl
from flask          import Flask, request, jsonify, session
from flask_cors     import CORS
from datetime       import datetime, timedelta
from supabase       import create_client, Client
from dotenv         import load_dotenv
from functools      import wraps
from scipy.stats    import linregress

load_dotenv()

app = Flask(__name__)
app.secret_key        = os.environ.get("SECRET_KEY", "fallback-dev-key")
app.permanent_session_lifetime = timedelta(days=7)
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE']   = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
# ── CORS ──────────────────────────────────────────────────────
# ALLOWED_ORIGINS env var: comma-separated list of allowed origins.
# Defaults to localhost:3000 for local dev.
_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# AFTER
CORS(app,
     supports_credentials=True,
     origins=ALLOWED_ORIGINS,
     allow_headers=["Content-Type", "X-User-ID"],
     methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"])

# ── SUPABASE ──────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Missing required environment variables: SUPABASE_URL and/or "
        "SUPABASE_SERVICE_KEY. Set them in Render's Environment tab."
    )

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as exc:
    raise RuntimeError(f"Failed to initialise Supabase client: {exc}") from exc

# ── PATHS ─────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ── LOAD MODELS ───────────────────────────────────────────────
print("Loading models...")
def load(f): return joblib.load(os.path.join(MODELS_DIR, f))

perf_model    = load("model1_performance_predictor.pkl")
perf_imputer  = load("model1_imputer.pkl")
le_goal       = load("model1_le_goal.pkl")
le_momentum   = load("model1_le_momentum.pkl")
perf_features = load("model1_feature_cols.pkl")

kmeans_model   = load("model2_kmeans.pkl")
km_scaler      = load("model2_scaler.pkl")
km_features    = load("model2_features.pkl")
cluster_labels = load("model2_cluster_labels.pkl")

risk_model    = load("model3_risk_detector.pkl")
risk_imputer  = load("model3_imputer.pkl")
le_cluster    = load("model3_le_cluster.pkl")
le_target     = load("model3_le_target.pkl")
risk_features = load("model3_feature_cols.pkl")
print("Models loaded.")

# ── FUZZY SYSTEMS ─────────────────────────────────────────────
print("Building fuzzy systems...")

sleep     = ctrl.Antecedent(np.arange(4, 9.1,  0.1),  "sleep")
deadlines = ctrl.Antecedent(np.arange(0, 1.01, 0.01), "deadlines")
screen    = ctrl.Antecedent(np.arange(0, 8.1,  0.1),  "screen")
stability = ctrl.Antecedent(np.arange(0, 1.01, 0.01), "stability")
pressure  = ctrl.Consequent(np.arange(0, 1.01, 0.01), "pressure",
                             defuzzify_method="centroid")

sleep["poor"]         = fuzz.trapmf(sleep.universe,     [4.0,4.0,5.0,6.5])
sleep["adequate"]     = fuzz.trimf(sleep.universe,      [5.5,6.5,7.5])
sleep["good"]         = fuzz.trapmf(sleep.universe,     [7.0,7.5,9.0,9.0])
deadlines["low"]      = fuzz.trapmf(deadlines.universe, [0.0,0.0,0.2,0.4])
deadlines["medium"]   = fuzz.trimf(deadlines.universe,  [0.3,0.5,0.7])
deadlines["high"]     = fuzz.trapmf(deadlines.universe, [0.6,0.8,1.0,1.0])
screen["low"]         = fuzz.trapmf(screen.universe,    [0.0,0.0,1.5,3.0])
screen["medium"]      = fuzz.trimf(screen.universe,     [2.0,3.5,5.0])
screen["high"]        = fuzz.trapmf(screen.universe,    [4.0,5.5,8.0,8.0])
stability["unstable"] = fuzz.trapmf(stability.universe, [0.0,0.0,0.3,0.5])
stability["moderate"] = fuzz.trimf(stability.universe,  [0.35,0.55,0.75])
stability["stable"]   = fuzz.trapmf(stability.universe, [0.65,0.8,1.0,1.0])
pressure["low"]       = fuzz.trapmf(pressure.universe,  [0.0,0.0,0.2,0.35])
pressure["medium"]    = fuzz.trimf(pressure.universe,   [0.25,0.5,0.75])
pressure["high"]      = fuzz.trapmf(pressure.universe,  [0.65,0.8,1.0,1.0])

pressure_ctrl = ctrl.ControlSystem([
    ctrl.Rule(deadlines["high"]   & sleep["poor"],                       pressure["high"]),
    ctrl.Rule(deadlines["high"]   & stability["unstable"],               pressure["high"]),
    ctrl.Rule(deadlines["high"]   & screen["high"],                      pressure["high"]),
    ctrl.Rule(sleep["poor"]       & screen["high"],                      pressure["high"]),
    ctrl.Rule(sleep["poor"]       & stability["unstable"],               pressure["high"]),
    ctrl.Rule(deadlines["medium"] & sleep["adequate"],                   pressure["medium"]),
    ctrl.Rule(deadlines["medium"] & stability["moderate"],               pressure["medium"]),
    ctrl.Rule(deadlines["high"]   & sleep["adequate"],                   pressure["medium"]),
    ctrl.Rule(sleep["poor"]       & deadlines["low"],                    pressure["medium"]),
    ctrl.Rule(deadlines["low"]    & sleep["good"],                       pressure["low"]),
    ctrl.Rule(deadlines["low"]    & stability["stable"],                 pressure["low"]),
    ctrl.Rule(sleep["good"]       & screen["low"] & stability["stable"], pressure["low"]),
])
pressure_sim = ctrl.ControlSystemSimulation(pressure_ctrl)

mismatch  = ctrl.Antecedent(np.arange(-1, 1.01, 0.01), "mismatch")
effort    = ctrl.Antecedent(np.arange(0, 10.1,  0.1),  "effort")
p_score   = ctrl.Antecedent(np.arange(0, 1.01,  0.01), "p_score")
alignment = ctrl.Consequent(np.arange(0, 1.01,  0.01), "alignment",
                             defuzzify_method="centroid")

mismatch["negative"]    = fuzz.trapmf(mismatch.universe,   [-1.0,-1.0,-0.3,-0.05])
mismatch["neutral"]     = fuzz.trimf(mismatch.universe,    [-0.15,0.0,0.15])
mismatch["positive"]    = fuzz.trapmf(mismatch.universe,   [0.05,0.3,1.0,1.0])
effort["low"]           = fuzz.trapmf(effort.universe,     [0.0,0.0,2.0,4.0])
effort["moderate"]      = fuzz.trimf(effort.universe,      [3.0,5.0,7.0])
effort["high"]          = fuzz.trapmf(effort.universe,     [6.0,8.0,10.0,10.0])
p_score["low"]          = fuzz.trapmf(p_score.universe,    [0.0,0.0,0.2,0.35])
p_score["medium"]       = fuzz.trimf(p_score.universe,     [0.25,0.5,0.75])
p_score["high"]         = fuzz.trapmf(p_score.universe,    [0.65,0.8,1.0,1.0])
alignment["misaligned"] = fuzz.trapmf(alignment.universe,  [0.0,0.0,0.2,0.4])
alignment["partial"]    = fuzz.trimf(alignment.universe,   [0.3,0.5,0.7])
alignment["aligned"]    = fuzz.trapmf(alignment.universe,  [0.6,0.8,1.0,1.0])

alignment_ctrl = ctrl.ControlSystem([
    ctrl.Rule(mismatch["positive"] & effort["high"]     & p_score["low"],    alignment["aligned"]),
    ctrl.Rule(mismatch["positive"] & effort["high"]     & p_score["medium"], alignment["aligned"]),
    ctrl.Rule(mismatch["neutral"]  & effort["high"]     & p_score["low"],    alignment["aligned"]),
    ctrl.Rule(mismatch["positive"] & effort["moderate"] & p_score["low"],    alignment["aligned"]),
    ctrl.Rule(mismatch["positive"] & effort["moderate"] & p_score["medium"], alignment["partial"]),
    ctrl.Rule(mismatch["neutral"]  & effort["moderate"] & p_score["low"],    alignment["partial"]),
    ctrl.Rule(mismatch["neutral"]  & effort["moderate"] & p_score["medium"], alignment["partial"]),
    ctrl.Rule(mismatch["neutral"]  & effort["high"]     & p_score["medium"], alignment["partial"]),
    ctrl.Rule(mismatch["neutral"]  & effort["high"]     & p_score["high"],   alignment["partial"]),
    ctrl.Rule(mismatch["negative"] & effort["high"]     & p_score["medium"], alignment["partial"]),
    ctrl.Rule(mismatch["positive"] & effort["low"]      & p_score["low"],    alignment["partial"]),
    ctrl.Rule(mismatch["positive"] & effort["high"]     & p_score["high"],   alignment["partial"]),
    ctrl.Rule(mismatch["negative"] & effort["low"]      & p_score["low"],    alignment["misaligned"]),
    ctrl.Rule(mismatch["negative"] & effort["low"]      & p_score["medium"], alignment["misaligned"]),
    ctrl.Rule(mismatch["negative"] & effort["low"]      & p_score["high"],   alignment["misaligned"]),
    ctrl.Rule(mismatch["negative"] & effort["moderate"] & p_score["high"],   alignment["misaligned"]),
    ctrl.Rule(mismatch["negative"] & effort["high"]     & p_score["high"],   alignment["misaligned"]),
    ctrl.Rule(mismatch["neutral"]  & effort["low"]      & p_score["high"],   alignment["misaligned"]),
    ctrl.Rule(mismatch["neutral"]  & effort["low"]      & p_score["medium"], alignment["partial"]),
    ctrl.Rule(mismatch["negative"] & effort["moderate"] & p_score["low"],    alignment["partial"]),
    ctrl.Rule(mismatch["negative"] & effort["moderate"] & p_score["medium"], alignment["partial"]),
    ctrl.Rule(mismatch["positive"] & effort["low"]      & p_score["medium"], alignment["partial"]),
    ctrl.Rule(mismatch["positive"] & effort["low"]      & p_score["high"],   alignment["partial"]),
    ctrl.Rule(mismatch["neutral"]  & effort["low"]      & p_score["low"],    alignment["partial"]),
])
alignment_sim = ctrl.ControlSystemSimulation(alignment_ctrl)
print("Fuzzy systems ready.")


# ============================================================
# FEATURE ENGINEERING (mirrors training notebook exactly)
# ============================================================

def engineer_features(logs: list[dict]) -> dict:
    """
    Takes a list of weekly log dicts (sorted by date),
    computes all engineered features on the latest entry.
    Returns a flat feature dict ready for model inference.
    """
    if not logs:
        return {}

    df = pd.DataFrame(logs).sort_values("logged_at")

    # Derived base features
    df["study_hrs_per_session"] = (
        df["study_hours_day"] / df["study_sessions"].replace(0, 1)
    ).round(3)
    df["deadline_density"] = (
        df["deadline_count"] / 7.0
    ).clip(0, 1).round(3)
    df["study_efficiency"] = (
        df["study_hours_day"] * (1 - df["late_night_ratio"]) /
        (df["study_hours_day"] + 1)
    ).round(3)
    df["effort_mismatch"] = (
        df["study_hours_day"] - df["study_hours_day"].mean()
    ).round(3)

    # Habit stability (rolling std inverted)
    if len(df) >= 3:
        df["habit_stability"] = (
            1 - df["study_hours_day"].rolling(3, min_periods=1).std() /
            (df["study_hours_day"].std() + 1e-6)
        ).clip(0, 1).round(3)
    else:
        df["habit_stability"] = 0.5

    # prev_deadline_density
    df["prev_deadline_density"] = df["deadline_density"].shift(1).fillna(0)

    # ── TEMPORAL FEATURES ─────────────────────────────────────
    def safe_slope(series):
        s = series.dropna()
        if len(s) < 2: return 0.0
        x = np.arange(len(s))
        slope, *_ = linregress(x, s)
        return round(float(slope), 4)

    for col in ["study_hours_day","sleep_hours_day","screen_time_day",
                "study_efficiency","deadline_density"]:
        df[f"{col}_roll3"] = df[col].shift(1).rolling(3, min_periods=1).mean().round(3)

    for col in ["study_efficiency","study_hours_day","sleep_hours_day"]:
        df[f"{col}_slope3"] = [
            safe_slope(df[col].shift(1).iloc[max(0,i-2):i+1])
            for i in range(len(df))
        ]

    # performance_score_slope3 — use 0 if not available (real user has no perf score yet)
    df["performance_score_slope3"] = 0.0

    for col in ["study_hours_day","sleep_hours_day","screen_time_day","study_efficiency"]:
        df[f"{col}_vol3"] = df[col].shift(1).rolling(3, min_periods=2).std().fillna(0).round(3)

    for col in ["study_efficiency","sleep_hours_day","screen_time_day"]:
        df[f"{col}_delta1"] = df[col].diff(1).fillna(0).round(3)

    df["pressure_score"]       = 0.5   # placeholder for first entry
    df["pressure_score_delta1"]= df["pressure_score"].diff(1).fillna(0)
    df["habit_volatility_index"]= df[["study_hours_day_vol3",
                                       "sleep_hours_day_vol3",
                                       "screen_time_day_vol3"]].mean(axis=1).round(3)
    df["pressure_roll3"]       = df["pressure_score"].shift(1).rolling(3,min_periods=1).mean().round(3)
    df["pressure_acceleration"] = df["pressure_score_delta1"].diff(1).fillna(0).round(3)

    def momentum_label(row):
        d = row["pressure_score_delta1"]
        a = row["pressure_acceleration"]
        if d > 0.10 and a >= 0: return "building"
        elif d > 0.05:           return "rising_slow"
        elif d < -0.10:          return "releasing"
        elif d < -0.05:          return "easing"
        else:                    return "stable"

    df["pressure_momentum_label"] = df.apply(momentum_label, axis=1)

    # Return latest row as dict
    latest = df.iloc[-1].to_dict()
    latest = {k: (None if (isinstance(v, float) and np.isnan(v)) else v)
              for k, v in latest.items()}
    return latest


# ============================================================
# PREDICTION ENGINE
# ============================================================

def predict_all(row_dict: dict) -> dict:
    result = {}

    def enc(feature_list, imputer_obj):
        rd = row_dict.copy()
        try:
            rd["goal_enc"] = int(le_goal.transform(
                [rd.get("goal","cgpa_improvement")])[0])
        except: rd["goal_enc"] = 0
        try:
            rd["pressure_momentum_enc"] = int(le_momentum.transform(
                [rd.get("pressure_momentum_label","stable")])[0])
        except: rd["pressure_momentum_enc"] = 0
        try:
            rd["km_cluster_enc"] = int(le_cluster.transform(
                [rd.get("km_cluster_label","Balanced & Efficient")])[0])
        except: rd["km_cluster_enc"] = 0
        vec = np.array([[rd.get(f, np.nan) for f in feature_list]])
        return imputer_obj.transform(vec)

    # Model 1
    try:
        result["performance_score"] = round(
            float(perf_model.predict(enc(perf_features, perf_imputer))[0]), 2)
    except Exception as e:
        result["performance_score"] = None

    # Model 3
    try:
        pred = risk_model.predict(enc(risk_features, risk_imputer))[0]
        result["pressure_label"] = le_target.inverse_transform([pred])[0]
    except:
        result["pressure_label"] = None

    # Fuzzy pressure
    try:
        pressure_sim.input["sleep"]     = float(np.clip(row_dict.get("sleep_hours_day",7), 4,9))
        pressure_sim.input["deadlines"] = float(np.clip(row_dict.get("deadline_density",0.3), 0,1))
        pressure_sim.input["screen"]    = float(np.clip(row_dict.get("screen_time_day",3), 0,8))
        pressure_sim.input["stability"] = float(np.clip(row_dict.get("habit_stability",0.6), 0,1))
        pressure_sim.compute()
        fp = round(float(pressure_sim.output["pressure"]), 4)
        result["fuzzy_pressure_score"] = fp
        result["fuzzy_pressure_label"] = "Low" if fp<0.35 else ("Medium" if fp<0.65 else "High")
    except:
        result["fuzzy_pressure_score"] = None
        result["fuzzy_pressure_label"] = "Unknown"

    # Fuzzy alignment
    try:
        alignment_sim.input["mismatch"] = float(np.clip(row_dict.get("effort_mismatch",0), -1,1))
        alignment_sim.input["effort"]   = float(np.clip(row_dict.get("study_hours_day",5), 0,10))
        alignment_sim.input["p_score"]  = float(np.clip(row_dict.get("pressure_score",0.5), 0,1))
        alignment_sim.compute()
        fa = round(float(alignment_sim.output["alignment"]), 4)
        result["fuzzy_alignment_score"] = fa
        result["fuzzy_alignment_label"] = ("Misaligned" if fa<0.4
                                           else ("Partial" if fa<0.66 else "Aligned"))
    except:
        m = row_dict.get("effort_mismatch",0) or 0
        e = row_dict.get("study_hours_day",5) or 5
        if m < -0.2 or e < 2:
            result["fuzzy_alignment_score"] = 0.2
            result["fuzzy_alignment_label"] = "Misaligned"
        elif m > 0.1 and e > 5:
            result["fuzzy_alignment_score"] = 0.75
            result["fuzzy_alignment_label"] = "Aligned"
        else:
            result["fuzzy_alignment_score"] = 0.5
            result["fuzzy_alignment_label"] = "Partial"

    # Cluster
    try:
        vec = np.array([[row_dict.get(f,0) or 0 for f in km_features]])
        cid = int(kmeans_model.predict(km_scaler.transform(vec))[0])
        result["cluster_id"]    = cid
        result["cluster_label"] = cluster_labels.get(cid, "Unknown")
    except:
        result["cluster_id"]    = None
        result["cluster_label"] = "Unknown"

    return result


# ============================================================
# AUTH DECORATOR
# ============================================================

def get_user_id():
    return request.headers.get("X-User-ID") or session.get("user_id")

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = request.headers.get("X-User-ID") or session.get("user_id")
        if not user_id:
            return jsonify({"error": "Not authenticated"}), 401
        session["user_id"] = user_id
        return f(*args, **kwargs)
    return decorated


# ============================================================
# AUTH ENDPOINTS
# ============================================================

@app.route("/api/auth/register", methods=["POST"])
def register():
    """
    Register a new user.
    Body: { email, password, name, goal }
    goal: cgpa_improvement | workload_balance | placement_prep | skill_building
    """
    body = request.get_json()
    email    = body.get("email","").strip().lower()
    password = body.get("password","")
    name     = body.get("name","").strip()
    goal     = body.get("goal","cgpa_improvement")

    if not email or not password or not name:
        return jsonify({"error": "email, password and name are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Check existing
    existing = supabase.table("users").select("id").eq("email", email).execute()
    if existing.data:
        return jsonify({"error": "Email already registered"}), 409

    # Hash password
    import hashlib
    pw_hash = hashlib.sha256(password.encode()).hexdigest()

    # Insert user
    res = supabase.table("users").insert({
        "email"     : email,
        "password"  : pw_hash,
        "name"      : name,
        "goal"      : goal,
        "created_at": datetime.utcnow().isoformat(),
    }).execute()

    user = res.data[0]
    session.permanent = True
    session["user_id"]   = user["id"]
    session["user_email"]= user["email"]
    session["user_name"] = user["name"]

    return jsonify({
        "message": "Registered successfully",
        "user": {"id": user["id"], "name": name, "email": email, "goal": goal}
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    """
    Login.
    Body: { email, password }
    """
    body     = request.get_json()
    email    = body.get("email","").strip().lower()
    password = body.get("password","")

    import hashlib
    pw_hash = hashlib.sha256(password.encode()).hexdigest()

    res = supabase.table("users").select("*").eq("email", email).eq("password", pw_hash).execute()
    if not res.data:
        return jsonify({"error": "Invalid email or password"}), 401

    user = res.data[0]
    session.permanent = True
    session["user_id"]   = user["id"]
    session["user_email"]= user["email"]
    session["user_name"] = user["name"]

    return jsonify({
        "message": "Logged in",
        "user": {"id": user["id"], "name": user["name"],
                 "email": user["email"], "goal": user["goal"]}
    })


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    """Return current logged-in user info."""
    res  = supabase.table("users").select("*").eq("id", get_user_id()).execute()
    if not res.data:
        return jsonify({"error": "User not found"}), 404
    user = res.data[0]
    user.pop("password", None)
    return jsonify(user)


# ============================================================
# DATA ENTRY ENDPOINT
# User submits weekly snapshot — engine runs predictions
# ============================================================

@app.route("/api/log", methods=["POST"])
@login_required
def log_entry():
    """
    User submits a new weekly data snapshot.
    Body: {
        study_hours_day, sleep_hours_day, screen_time_day,
        attendance_pct, deadline_count, late_night_ratio,
        study_sessions, extra_hours,
        notes (optional)
    }
    """
    body    = request.get_json()
    user_id = get_user_id()

    # Validate required fields
    required = ["study_hours_day","sleep_hours_day","screen_time_day",
                "attendance_pct","deadline_count","late_night_ratio",
                "study_sessions","extra_hours"]
    missing = [f for f in required if f not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    # Fetch user goal
    user_res = supabase.table("users").select("goal").eq("id", user_id).execute()
    goal     = user_res.data[0]["goal"] if user_res.data else "cgpa_improvement"

    # Fetch all previous logs for this user (for temporal features)
    prev_res = supabase.table("logs")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("logged_at", desc=False)\
        .execute()

    # Build log entry
    new_log = {
        "study_hours_day"  : float(body["study_hours_day"]),
        "sleep_hours_day"  : float(body["sleep_hours_day"]),
        "screen_time_day"  : float(body["screen_time_day"]),
        "attendance_pct"   : float(body["attendance_pct"]),
        "deadline_count"   : int(body["deadline_count"]),
        "late_night_ratio" : float(body["late_night_ratio"]),
        "study_sessions"   : int(body["study_sessions"]),
        "extra_hours"      : float(body["extra_hours"]),
        "goal"             : goal,
        "notes"            : body.get("notes",""),
        "logged_at"        : datetime.utcnow().isoformat(),
    }

    # Combine past logs + new log for feature engineering
    all_logs = [r for r in prev_res.data] + [new_log]
    features = engineer_features(all_logs)
    features["goal"] = goal

    # Run all predictions
    predictions = predict_all(features)

    # Save log + predictions to Supabase
    save_data = {
        "user_id"              : user_id,
        "logged_at"            : new_log["logged_at"],
        # Raw inputs
        "study_hours_day"      : new_log["study_hours_day"],
        "sleep_hours_day"      : new_log["sleep_hours_day"],
        "screen_time_day"      : new_log["screen_time_day"],
        "attendance_pct"       : new_log["attendance_pct"],
        "deadline_count"       : new_log["deadline_count"],
        "late_night_ratio"     : new_log["late_night_ratio"],
        "study_sessions"       : new_log["study_sessions"],
        "extra_hours"          : new_log["extra_hours"],
        "notes"                : new_log["notes"],
        # Predictions
        "performance_score"    : predictions.get("performance_score"),
        "pressure_label"       : predictions.get("pressure_label"),
        "fuzzy_pressure_score" : predictions.get("fuzzy_pressure_score"),
        "fuzzy_pressure_label" : predictions.get("fuzzy_pressure_label"),
        "fuzzy_alignment_score": predictions.get("fuzzy_alignment_score"),
        "fuzzy_alignment_label": predictions.get("fuzzy_alignment_label"),
        # cluster_label is not a column in the logs table — returned in API
        # response only (see predictions dict below)
        "study_efficiency"     : features.get("study_efficiency"),
        "habit_stability"      : features.get("habit_stability"),
        "deadline_density"     : features.get("deadline_density"),
    }

    log_res = supabase.table("logs").insert(save_data).execute()
    saved   = log_res.data[0]

    return jsonify({
        "message"    : "Log saved",
        "log_id"     : saved["id"],
        "logged_at"  : saved["logged_at"],
        "predictions": predictions,
        "features"   : {k: v for k, v in features.items()
                        if k in ["study_efficiency","habit_stability",
                                 "deadline_density","effort_mismatch",
                                 "habit_volatility_index","pressure_momentum_label"]}
    }), 201


# ============================================================
# DASHBOARD ENDPOINTS
# ============================================================

@app.route("/api/dashboard", methods=["GET"])
@login_required
def dashboard():
    """
    Return full dashboard data for logged-in user.
    Latest predictions + all historical logs for charts.
    """
    user_id = get_user_id()

    # User info
    user_res = supabase.table("users").select("*").eq("id", user_id).execute()
    if not user_res.data:
        return jsonify({"error": "User not found"}), 404
    user = user_res.data[0]
    user.pop("password", None)

    # All logs
    logs_res = supabase.table("logs")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("logged_at", desc=False)\
        .execute()
    logs = logs_res.data

    if not logs:
        return jsonify({
            "user"   : user,
            "logs"   : [],
            "latest" : None,
            "message": "No data yet. Submit your first weekly log to get started."
        })

    latest = logs[-1]

    # Confidence flag — fewer than 3 logs = sparse data
    confidence = "high" if len(logs) >= 3 else ("medium" if len(logs) == 2 else "low")
    confidence_note = {
        "low"   : "Based on limited inputs. Insights will stabilize with more updates.",
        "medium": "Based on 2 data points. Add more updates for better accuracy.",
        "high"  : None
    }[confidence]

    return jsonify({
        "user"            : user,
        "logs"            : logs,
        "latest"          : latest,
        "total_logs"      : len(logs),
        "confidence"      : confidence,
        "confidence_note" : confidence_note,
    })


@app.route("/api/history", methods=["GET"])
@login_required
def history():
    """Return all logs for trend charts."""
    user_id  = get_user_id()
    logs_res = supabase.table("logs")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("logged_at", desc=False)\
        .execute()
    return jsonify({"logs": logs_res.data, "count": len(logs_res.data)})


# ============================================================
# WHAT-IF SIMULATION
# ============================================================

@app.route("/api/simulate", methods=["POST"])
@login_required
def simulate():
    """
    What-If simulation on user's latest log.
    Body: {
        "changes": { "sleep_hours_day": 8.0, "screen_time_day": 1.5 },
        "scenario_name": "Improve Sleep"
    }
    """
    user_id = get_user_id()
    body    = request.get_json()
    changes = body.get("changes", {})
    scenario= body.get("scenario_name", "Scenario")

    # Get all logs for feature engineering
    logs_res = supabase.table("logs")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("logged_at", desc=False)\
        .execute()

    if not logs_res.data:
        return jsonify({"error": "No logs found. Submit at least one log first."}), 400

    logs    = logs_res.data
    user_res= supabase.table("users").select("goal").eq("id", user_id).execute()
    goal    = user_res.data[0]["goal"] if user_res.data else "cgpa_improvement"

    # Baseline — features from existing logs
    baseline_features = engineer_features(logs)
    baseline_features["goal"] = goal

    # Modified — apply changes to latest log then re-engineer
    modified_logs = logs[:-1] + [{**logs[-1], **changes}]
    modified_features = engineer_features(modified_logs)
    modified_features["goal"] = goal

    before = predict_all(baseline_features)
    after  = predict_all(modified_features)

    deltas = {
        "performance_score"    : round((after.get("performance_score") or 0) -
                                       (before.get("performance_score") or 0), 2),
        "fuzzy_pressure_score" : round((after.get("fuzzy_pressure_score") or 0) -
                                       (before.get("fuzzy_pressure_score") or 0), 4),
        "fuzzy_alignment_score": round((after.get("fuzzy_alignment_score") or 0) -
                                       (before.get("fuzzy_alignment_score") or 0), 4),
    }

    # Save to simulations table so /api/sim-history works
    try:
        supabase.table("simulations").insert({
            "user_id"      : user_id,
            "scenario_name": scenario,
            "changes"      : changes,
            "before"       : before,
            "after"        : after,
            "deltas"       : deltas,
        }).execute()
    except Exception:
        pass  # Non-fatal — still return the result

    return jsonify({
        "scenario_name": scenario,
        "changes"      : changes,
        "before"       : before,
        "after"        : after,
        "deltas"       : deltas,
    })


# ============================================================
# USER SETTINGS
# ============================================================

@app.route("/api/settings", methods=["PATCH"])
@login_required
def update_settings():
    """
    Update user goal or name.
    Body: { goal?, name? }
    """
    body    = request.get_json()
    user_id = get_user_id()
    updates = {}
    if "goal" in body: updates["goal"] = body["goal"]
    if "name" in body: updates["name"] = body["name"]
    if not updates:
        return jsonify({"error": "Nothing to update"}), 400
    supabase.table("users").update(updates).eq("id", user_id).execute()
    return jsonify({"message": "Updated", "updates": updates})


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status" : "ok",
        "models" : "loaded",
        "fuzzy"  : "ready",
        "db"     : "supabase",
    })


# ============================================================
# MISSING ENDPOINTS — paste these into app.py
# Add them just before the final:
#   if __name__ == "__main__":
# ============================================================

# scipy.stats.linregress is already imported inside engineer_features()


# ============================================================
# SIMULATION HISTORY
# ============================================================

@app.route("/api/sim-history", methods=["GET"])
@login_required
def sim_history():
    """
    Return saved what-if simulations for the logged-in user.
    Frontend uses GET /api/sim-history → { simulations: [...] }
    """
    user_id = get_user_id()
    try:
        res = supabase.table("simulations") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        return jsonify({"simulations": res.data})
    except Exception:
        # Table may not exist yet — return empty list gracefully
        return jsonify({"simulations": []})


# ============================================================
# DIMINISHING RETURNS
# Sweeps study hours 1–12 and shows how predicted performance
# plateaus — mirrors notebook feature importance weighting.
# Response: { curve: [ {study_hours, performance, marginal_gain}, ... ] }
# ============================================================

@app.route("/api/diminishing", methods=["GET"])
@login_required
def diminishing():
    """
    Compute the study-hours vs predicted-performance curve
    for the current user's latest log.
    """
    user_id = get_user_id()

    logs_res = supabase.table("logs") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("logged_at", desc=False) \
        .execute()

    if not logs_res.data:
        # No logs yet — return a generic curve using dataset averages
        baseline_perf = 60.0
        baseline_study = 5.5
        baseline_eff   = 0.55
        baseline_late  = 0.2
    else:
        latest = logs_res.data[-1]
        baseline_perf  = latest.get("performance_score") or 60.0
        baseline_study = latest.get("study_hours_day")   or 5.5
        baseline_eff   = (baseline_study * (1 - (latest.get("late_night_ratio") or 0.2))
                          / (baseline_study + 1))
        baseline_late  = latest.get("late_night_ratio") or 0.2

    curve = []
    prev_perf = None

    study = 1.0
    while study <= 12.01:
        eff = study * (1 - baseline_late) / (study + 1)
        d_study = (study - baseline_study) * 3.2
        d_eff   = (eff   - baseline_eff)   * 28.0
        perf    = round(min(100, max(0, baseline_perf + d_study + d_eff)), 1)
        marginal = 0.0 if prev_perf is None else round(perf - prev_perf, 2)
        curve.append({
            "study_hours"  : round(study, 1),
            "performance"  : perf,
            "marginal_gain": marginal,
        })
        prev_perf = perf
        study = round(study + 0.5, 1)

    return jsonify({"curve": curve})


# ============================================================
# ABLATION STUDY
# Removes one feature at a time and measures the performance
# drop — shows which habits matter most for this user.
# Response: { results: [ {feature, baseline_score, ablated_score, impact}, ... ] }
# ============================================================

@app.route("/api/ablation", methods=["GET"])
@login_required
def ablation():
    """
    Feature ablation: zero-out / worst-case each input and
    measure predicted-performance drop.
    """
    user_id = get_user_id()

    logs_res = supabase.table("logs") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("logged_at", desc=False) \
        .execute()

    if not logs_res.data:
        return jsonify({"results": []})

    latest   = logs_res.data[-1]
    baseline = latest.get("performance_score") or 60.0

    b_study  = latest.get("study_hours_day")   or 5.5
    b_sleep  = latest.get("sleep_hours_day")   or 7.0
    b_screen = latest.get("screen_time_day")   or 3.0
    b_late   = latest.get("late_night_ratio")  or 0.2
    b_eff    = b_study * (1 - b_late) / (b_study + 1)
    b_dens   = min(1, (latest.get("deadline_count") or 2) / 7.0)

    def ablated_perf(study=None, eff=None, density=None, sleep=None, screen=None, late=None):
        s  = study   if study   is not None else b_study
        sl = sleep   if sleep   is not None else b_sleep
        sc = screen  if screen  is not None else b_screen
        lt = late    if late    is not None else b_late
        e  = eff     if eff     is not None else s * (1 - lt) / (s + 1)
        d  = density if density is not None else b_dens

        d_s  = (s  - b_study)  * 3.2
        d_e  = (e  - b_eff)    * 28.0
        d_d  = (b_dens - d)    * 6.0
        d_sl = (sl - b_sleep)  * 1.5
        d_sc = (sc - b_screen) * -0.8
        return round(min(100, max(0, baseline + d_s + d_e + d_d + d_sl + d_sc)), 1)

    features = [
        {"name": "Study Hours",      "score": ablated_perf(study=0)},
        {"name": "Study Efficiency", "score": ablated_perf(eff=0)},
        {"name": "Deadline Density", "score": ablated_perf(density=1.0)},
        {"name": "Sleep Hours",      "score": ablated_perf(sleep=4.0)},
        {"name": "Screen Time",      "score": ablated_perf(screen=8.0)},
        {"name": "Late Night Ratio", "score": ablated_perf(late=1.0)},
    ]

    results = sorted([
        {
            "feature"       : f["name"],
            "baseline_score": baseline,
            "ablated_score" : f["score"],
            "impact"        : round(baseline - f["score"], 1),
        }
        for f in features
    ], key=lambda x: x["impact"], reverse=True)

    return jsonify({"results": results})


# ============================================================
# GOAL SENSITIVITY
# Re-scores the user's latest data under a hypothetical goal
# to show what would change if they switched academic target.
# Response: { goal, performance_score, fuzzy_pressure_score, ... }
# ============================================================

@app.route("/api/goal-sensitivity", methods=["POST"])
@login_required
def goal_sensitivity():
    """
    What would my scores look like under a different goal?
    Body: { goal: 'cgpa_improvement' | 'workload_balance' |
                  'placement_prep'   | 'skill_building' }
    """
    user_id = get_user_id()
    body    = request.get_json()
    new_goal = body.get("goal", "cgpa_improvement")

    logs_res = supabase.table("logs") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("logged_at", desc=False) \
        .execute()

    if not logs_res.data:
        return jsonify({"error": "No logs found"}), 400

    latest = logs_res.data[-1]

    goal_profiles = {
        "cgpa_improvement": {"study_mult": 1.0,  "sleep_mult": 0.8,  "expected_study": 6.0},
        "workload_balance" : {"study_mult": 0.7,  "sleep_mult": 1.2,  "expected_study": 4.5},
        "placement_prep"  : {"study_mult": 1.2,  "sleep_mult": 0.75, "expected_study": 7.0},
        "skill_building"  : {"study_mult": 0.9,  "sleep_mult": 0.9,  "expected_study": 5.5},
    }
    profile = goal_profiles.get(new_goal, goal_profiles["cgpa_improvement"])

    b_perf   = latest.get("performance_score")     or 60.0
    b_study  = latest.get("study_hours_day")       or 5.5
    b_sleep  = latest.get("sleep_hours_day")       or 7.0
    b_screen = latest.get("screen_time_day")       or 3.0
    b_late   = latest.get("late_night_ratio")      or 0.2
    b_eff    = b_study * (1 - b_late) / (b_study + 1)
    b_dens   = latest.get("deadline_density")      or 0.3
    b_stab   = latest.get("habit_stability")       or 0.6
    b_fp     = latest.get("fuzzy_pressure_score")  or 0.5
    b_fa     = latest.get("fuzzy_alignment_score") or 0.5

    eff_study = b_study * profile["study_mult"]
    eff_eff   = eff_study * (1 - b_late) / (eff_study + 1)
    adj_sleep = b_sleep  * profile["sleep_mult"]

    d_s  = (eff_study - b_study) * 3.2
    d_e  = (eff_eff   - b_eff)   * 28.0
    adj_perf = round(min(100, max(0, b_perf + d_s + d_e)), 2)

    # Fuzzy pressure with adjusted sleep
    try:
        pressure_sim.input["sleep"]     = float(np.clip(adj_sleep, 4, 9))
        pressure_sim.input["deadlines"] = float(np.clip(b_dens, 0, 1))
        pressure_sim.input["screen"]    = float(np.clip(b_screen, 0, 8))
        pressure_sim.input["stability"] = float(np.clip(b_stab, 0, 1))
        pressure_sim.compute()
        adj_fp = round(float(pressure_sim.output["pressure"]), 4)
    except Exception:
        adj_fp = b_fp

    fp_label = "Low" if adj_fp < 0.35 else ("Medium" if adj_fp < 0.65 else "High")

    # Fuzzy alignment with new mismatch
    new_mismatch = round(b_study - profile["expected_study"], 3)
    try:
        alignment_sim.input["mismatch"] = float(np.clip(new_mismatch, -1, 1))
        alignment_sim.input["effort"]   = float(np.clip(b_study, 0, 10))
        alignment_sim.input["p_score"]  = float(np.clip(adj_fp, 0, 1))
        alignment_sim.compute()
        adj_fa = round(float(alignment_sim.output["alignment"]), 4)
    except Exception:
        adj_fa = b_fa

    fa_label = ("Misaligned" if adj_fa < 0.4
                else ("Partial" if adj_fa < 0.66 else "Aligned"))

    return jsonify({
        "goal"                : new_goal,
        "performance_score"   : adj_perf,
        "fuzzy_pressure_score": adj_fp,
        "fuzzy_pressure_label": fp_label,
        "fuzzy_alignment_score": adj_fa,
        "fuzzy_alignment_label": fa_label,
        "delta_performance"   : round(adj_perf - b_perf, 2),
        "delta_pressure"      : round(adj_fp   - b_fp,   4),
        "delta_alignment"     : round(adj_fa   - b_fa,   4),
    })


# ============================================================
# RISK RADAR
# Computes 6 trend-based risk axes from the user's recent logs.
# Response: { axes: [...], pressure_momentum, performance_momentum, weeks_used }
# ============================================================

@app.route("/api/risk-radar", methods=["GET"])
@login_required
def risk_radar():
    """
    Trend-based early warning radar using slope analysis
    on the last 5 weeks of data.
    """
    user_id = get_user_id()

    logs_res = supabase.table("logs") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("logged_at", desc=False) \
        .execute()

    logs = logs_res.data
    if not logs or len(logs) < 1:
        return jsonify({"axes": None, "message": "Need at least 3 logs for risk radar."})

    recent = logs[-5:]

    def safe_slope(values):
        if len(values) < 2:
            return 0.0
        x = list(range(len(values)))
        slope, *_ = linregress(x, values)
        return float(slope)

    def norm(v, reverse, scale):
        raw = -v if reverse else v
        return round(min(100, max(0, 50 + raw * scale)), 1)

    perf_slope   = safe_slope([l.get("performance_score")     or 0 for l in recent])
    press_slope  = safe_slope([l.get("fuzzy_pressure_score")  or 0 for l in recent])
    align_slope  = safe_slope([l.get("fuzzy_alignment_score") or 0 for l in recent])
    study_slope  = safe_slope([l.get("study_hours_day")       or 0 for l in recent])
    sleep_slope  = safe_slope([l.get("sleep_hours_day")       or 0 for l in recent])
    screen_slope = safe_slope([l.get("screen_time_day")       or 0 for l in recent])

    axes = [
        {"axis": "Performance Trend", "value": norm(perf_slope,   True,   15), "raw": round(perf_slope,   3)},
        {"axis": "Pressure Trend",    "value": norm(press_slope,  False,  60), "raw": round(press_slope,  3)},
        {"axis": "Alignment Trend",   "value": norm(align_slope,  True,   60), "raw": round(align_slope,  3)},
        {"axis": "Study Consistency", "value": norm(study_slope,  False,   8), "raw": round(study_slope,  3)},
        {"axis": "Sleep Trend",       "value": norm(sleep_slope,  True,   10), "raw": round(sleep_slope,  3)},
        {"axis": "Screen Time Trend", "value": norm(screen_slope, False,  10), "raw": round(screen_slope, 3)},
    ]

    pressure_momentum = ("building"  if press_slope >  0.02
                         else "releasing" if press_slope < -0.02
                         else "stable")
    perf_momentum     = ("rising"    if perf_slope  >  1.0
                         else "declining" if perf_slope  < -1.0
                         else "stable")

    return jsonify({
        "axes"                : axes,
        "pressure_momentum"   : pressure_momentum,
        "performance_momentum": perf_momentum,
        "weeks_used"          : len(recent),
    })


# ============================================================
# AI EXPLANATION
# Generates a natural-language explanation of the user's
# latest predictions using Claude (claude-haiku-4-5).
# Falls back to a rule-based explanation if API key missing.
# Response: { explanation: "..." }
# ============================================================

@app.route("/api/explain", methods=["POST"])
@login_required
def explain():
    """
    Generate an AI explanation for the user's current predictions.
    Body: {
        performance_score, pressure_label, fuzzy_alignment_label,
        cluster_label, study_hours_day, sleep_hours_day,
        screen_time_day (all optional — fills from latest log if missing)
    }
    """
    user_id = get_user_id()
    body    = request.get_json() or {}

    # Fill from latest log if caller didn't supply values
    if not body.get("performance_score"):
        logs_res = supabase.table("logs") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("logged_at", desc=False) \
            .limit(1) \
            .execute()
        if logs_res.data:
            latest = logs_res.data[-1]
            body.setdefault("performance_score",     latest.get("performance_score", 60))
            body.setdefault("pressure_label",        latest.get("fuzzy_pressure_label", "Medium"))
            body.setdefault("fuzzy_alignment_label", latest.get("fuzzy_alignment_label", "Partial"))
            body.setdefault("cluster_label",         latest.get("cluster_label", "Balanced & Efficient"))
            body.setdefault("study_hours_day",       latest.get("study_hours_day", 5))
            body.setdefault("sleep_hours_day",       latest.get("sleep_hours_day", 7))
            body.setdefault("screen_time_day",       latest.get("screen_time_day", 3))

    perf    = body.get("performance_score", 60)
    pressure= body.get("pressure_label", "Medium")
    align   = body.get("fuzzy_alignment_label", "Partial")
    cluster = body.get("cluster_label", "Balanced & Efficient")
    study   = body.get("study_hours_day", 5)
    sleep   = body.get("sleep_hours_day", 7)
    screen  = body.get("screen_time_day", 3)

    # Try Mistral official API (free tier — mistral-small-latest)
    mistral_key = os.environ.get("MISTRAL_API_KEY")
    if mistral_key:
        try:
            import requests as req
            prompt = (
                f"You are an academic coach. A student has the following weekly metrics:\n"
                f"- Predicted performance score: {perf}/100\n"
                f"- Workload pressure: {pressure}\n"
                f"- Goal alignment: {align}\n"
                f"- Student archetype: {cluster}\n"
                f"- Study hours/day: {study}h, Sleep: {sleep}h, Screen time: {screen}h\n\n"
                f"Write a concise 3-sentence personalised insight for this student. "
                f"Be specific, actionable, and encouraging. "
                f"End with: 'These are simulations only, not prescriptions or diagnoses.'"
            )
            resp = req.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {mistral_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "mistral-small-latest",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 300,
                    "temperature": 0.7,
                },
                timeout=20,
            )
            if resp.status_code == 200:
                explanation = resp.json()["choices"][0]["message"]["content"].strip()
                if explanation:
                    return jsonify({"explanation": explanation, "source": "mistral-small"})
        except Exception:
            pass  # Fall through to rule-based

    # Rule-based fallback (mirrors mock/_mockExplanation in api.js)
    p_note = {
        "High"  : "Workload pressure is high — driven by sleep deficit and dense deadlines.",
        "Medium": "Workload pressure is moderate. Small sleep or screen-time adjustments could help.",
        "Low"   : "Workload pressure is well managed. Current habits look sustainable.",
    }.get(pressure, "")

    a_note = {
        "Aligned"   : "Effort is well-aligned with your stated academic goal.",
        "Partial"   : "Goal alignment is partial. Increasing focused study hours would strengthen it.",
        "Misaligned": "There is a mismatch between current effort and your goal. Consider reviewing your study strategy.",
    }.get(align, "")

    c_note = {
        "Balanced & Efficient"    : "Your habits are consistent and effort is translating well into predicted outcomes.",
        "Extracurricular Focused" : "You are active beyond academics — monitor for early burnout signals.",
        "Overworked & Struggling" : "High effort without adequate recovery detected. Prioritising sleep and reducing screen time is recommended.",
    }.get(cluster, "")

    explanation = (
        f"Based on recent activity, predicted performance score is {float(perf):.1f}/100. "
        f"{p_note} {a_note} "
        f"Student archetype is \"{cluster}\" — {c_note} "
        f"These are simulations only, not prescriptions or diagnoses."
    )

    return jsonify({"explanation": explanation, "source": "rule-based"})




# ============================================================
# POST /api/parse-screenshot
# Accepts a multipart image upload of a Digital Wellbeing /
# Screen Time screenshot.
# Strategy: Tesseract OCR first → Gemini flash free-tier fallback.
# Requires GEMINI_API_KEY in .env only if Tesseract fails.
# Response: { screen_time_hours: float, confidence: str,
#             raw_text: str, source: "tesseract"|"gemini" }
# ============================================================

def _parse_hours_from_text(text: str):
    """
    Extract the largest plausible 'total screen time' value from OCR text.
    Handles patterns like:  4h 23m | 4:23 | 4h | 45m | 2.5h | 2 hr 30 min
    Returns float hours or None.
    """
    import re

    text = text.replace("\n", " ")

    # Pattern: Xh Ym  or  X hr Y min  (capture both parts)
    hm = re.findall(r'(\d+)\s*h(?:r|rs|our|ours)?\s*(\d+)\s*m(?:in|ins)?', text, re.I)
    if hm:
        best = max(float(h) + float(m) / 60 for h, m in hm)
        return round(best, 1)

    # Pattern: H:MM  (colon-separated, e.g. 4:23)
    colon = re.findall(r'\b(\d{1,2}):([0-5]\d)\b', text)
    if colon:
        best = max(float(h) + float(m) / 60 for h, m in colon)
        return round(best, 1)

    # Pattern: Xh only (no minutes)
    h_only = re.findall(r'\b(\d+(?:\.\d+)?)\s*h(?:r|rs|our|ours)?\b', text, re.I)
    if h_only:
        return round(max(float(v) for v in h_only), 1)

    # Pattern: Ym only (no hours)
    m_only = re.findall(r'\b(\d+)\s*m(?:in|ins|inutes?)?\b', text, re.I)
    if m_only:
        best_mins = max(int(v) for v in m_only)
        return round(best_mins / 60, 1)

    return None


@app.route("/api/parse-screenshot", methods=["POST"])
@login_required
def parse_screenshot():
    import base64
    import re
    import requests as req

    if "screenshot" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["screenshot"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    image_bytes = file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        return jsonify({"error": "Image too large (max 10 MB)"}), 400

    # ── 1. Try Tesseract OCR ────────────────────────────────
    tesseract_result = None
    try:
        import pytesseract
        from PIL import Image
        import io

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        ocr_text = pytesseract.image_to_string(img, config="--psm 4")
        hours = _parse_hours_from_text(ocr_text)
        if hours is not None and 0 < hours <= 24:
            tesseract_result = {
                "screen_time_hours": hours,
                "confidence": "high" if hours >= 0.5 else "medium",
                "raw_text": ocr_text.strip()[:300],
                "source": "tesseract",
            }
    except Exception:
        pass  # Tesseract not installed or failed → fall through

    if tesseract_result:
        return jsonify(tesseract_result)

    # ── 2. Gemini free-tier fallback ────────────────────────
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        return jsonify({
            "error": (
                "Tesseract OCR is not available on this server and "
                "GEMINI_API_KEY is not configured. "
                "Please type your screen time manually."
            )
        }), 503

    mime_type = file.content_type or "image/jpeg"
    if mime_type not in ("image/jpeg", "image/png", "image/webp"):
        mime_type = "image/jpeg"

    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    prompt = (
        "This is a screenshot of a phone's Digital Wellbeing, Screen Time, "
        "or similar app-usage summary page. "
        "Extract the TOTAL daily screen time shown. "
        "Convert to decimal hours (e.g. '3h 24m' → 3.4, '45m' → 0.75). "
        "Reply ONLY with valid JSON — no markdown — like: "
        '{"hours": 3.4, "confidence": "high", "raw": "3h 24m"} '
        "If you cannot find a clear total set hours to null and confidence to low."
    )

    try:
        resp = req.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={gemini_key}",
            json={
                "contents": [{
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": image_b64,
                            }
                        },
                        {"text": prompt},
                    ]
                }],
                "generationConfig": {"maxOutputTokens": 150, "temperature": 0},
            },
            timeout=30,
        )
    except Exception as e:
        return jsonify({"error": f"Gemini request failed: {str(e)}"}), 502

    if resp.status_code != 200:
        return jsonify({"error": f"Gemini API returned {resp.status_code}"}), 502

    raw_text = ""
    try:
        candidates = resp.json().get("candidates", [])
        parts = candidates[0]["content"]["parts"]
        raw_text = "".join(p.get("text", "") for p in parts).strip()

        clean = re.sub(r"^```[a-z]*\n?|```$", "", raw_text).strip()
        parsed = __import__("json").loads(clean)

        hours = parsed.get("hours")
        if hours is None:
            return jsonify({
                "error": "Could not detect screen time in this image. Please type it manually.",
                "raw_text": parsed.get("raw", ""),
            }), 422

        hours = round(max(0.0, min(float(hours), 24.0)), 1)
        return jsonify({
            "screen_time_hours": hours,
            "confidence": parsed.get("confidence", "medium"),
            "raw_text": parsed.get("raw", ""),
            "source": "gemini",
        })

    except Exception:
        return jsonify({
            "error": "Failed to read the screenshot. Please type your screen time manually.",
            "raw_text": raw_text,
        }), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
