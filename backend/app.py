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

load_dotenv()

app = Flask(__name__)
app.secret_key        = os.environ.get("SECRET_KEY", "fallback-dev-key")
app.permanent_session_lifetime = timedelta(days=7)

CORS(app, supports_credentials=True,
     origins=["http://localhost:3000",
              "https://your-app.vercel.app"])  # update after Vercel deploy

# ── SUPABASE ──────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    from scipy.stats import linregress

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

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401
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
    res  = supabase.table("users").select("*").eq("id", session["user_id"]).execute()
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
    user_id = session["user_id"]

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
        "cluster_label"        : predictions.get("cluster_label"),
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
    user_id = session["user_id"]

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
    user_id  = session["user_id"]
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
    user_id = session["user_id"]
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

    return jsonify({
        "scenario_name": scenario,
        "changes"      : changes,
        "before"       : before,
        "after"        : after,
        "deltas": {
            "performance_score"    : round((after.get("performance_score") or 0) -
                                           (before.get("performance_score") or 0), 2),
            "fuzzy_pressure_score" : round((after.get("fuzzy_pressure_score") or 0) -
                                           (before.get("fuzzy_pressure_score") or 0), 4),
            "fuzzy_alignment_score": round((after.get("fuzzy_alignment_score") or 0) -
                                           (before.get("fuzzy_alignment_score") or 0), 4),
        }
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
    user_id = session["user_id"]
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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
