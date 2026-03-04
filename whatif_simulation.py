# ── WHAT-IF ENGINE FIX — run this INSTEAD of the previous cell
# Loads feature lists from .pkl to ensure exact match with saved imputers

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings("ignore")
import joblib # Explicitly import joblib here

print("What-If Simulation Engine initializing...")

# ── LOAD FEATURE LISTS FROM PKL (source of truth) ────────────
perf_features = joblib.load("model1_feature_cols.pkl")
risk_features = joblib.load("model3_feature_cols.pkl")
model2_feats  = joblib.load("model2_features.pkl")
cluster_labels= joblib.load("model2_cluster_labels.pkl")

perf_model   = best_gb   if "best_gb"   in dir() else gb_model
risk_model   = gb3
perf_imputer = joblib.load("model1_imputer.pkl")
risk_imputer = joblib.load("model3_imputer.pkl")

# Load Model 2 artifacts for clustering
model2_scaler = joblib.load("model2_scaler.pkl")
kmeans_final  = joblib.load("model2_kmeans.pkl")

print(f"Performance model features : {len(perf_features)}")
print(f"Risk model features        : {len(risk_features)}")

# ── ALL ENGINE FUNCTIONS (same as before) ─────────────────────

def get_student_baseline(student_id, week=10):
    row = df[(df["student_id"] == student_id) & (df["week"] == week)]
    if row.empty:
        raise ValueError(f"Student {student_id} week {week} not found.")
    return row.iloc[0].to_dict()

def apply_scenario(baseline, changes):
    modified = baseline.copy()
    for col, val in changes.items():
        if col in modified:
            modified[col] = val
        else:
            print(f"  Warning: '{col}' not in baseline — skipped.")
    return modified

def encode_row(row_dict, feature_list, imputer_obj):
    row_dict = row_dict.copy()
    row_dict["goal_enc"] = le_goal.transform(
        [row_dict.get("goal", "cgpa_improvement")])[0]
    row_dict["pressure_momentum_enc"] = le_momentum.transform(
        [row_dict.get("pressure_momentum_label", "stable")])[0]
    row_dict["km_cluster_enc"] = le_cluster.transform(
        [row_dict.get("km_cluster_label", "Balanced & Efficient")])[0]
    vec = np.array([[row_dict.get(f, np.nan) for f in feature_list]])
    vec = imputer_obj.transform(vec)
    return vec

def predict_performance(row_dict):
    vec = encode_row(row_dict, perf_features, perf_imputer)
    return round(float(perf_model.predict(vec)[0]), 2)

def predict_pressure_label(row_dict):
    vec  = encode_row(row_dict, risk_features, risk_imputer)
    pred = risk_model.predict(vec)[0]
    return le_target.inverse_transform([pred])[0]

def predict_fuzzy_pressure(row_dict):
    try:
        pressure_sim.input["sleep"]     = np.clip(row_dict["sleep_hours_day"],  4.0, 9.0)
        pressure_sim.input["deadlines"] = np.clip(row_dict["deadline_density"], 0.0, 1.0)
        pressure_sim.input["screen"]    = np.clip(row_dict["screen_time_day"],  0.0, 8.0)
        pressure_sim.input["stability"] = np.clip(row_dict["habit_stability"],  0.0, 1.0)
        pressure_sim.compute()
        score = round(pressure_sim.output["pressure"], 4)
        label = "Low" if score < 0.35 else ("Medium" if score < 0.65 else "High")
        return score, label
    except:
        return np.nan, "Unknown"

def predict_fuzzy_alignment(row_dict):
    try:
        alignment_sim.input["mismatch"] = np.clip(row_dict["effort_mismatch"],  -1.0, 1.0)
        alignment_sim.input["effort"]   = np.clip(row_dict["study_hours_day"],   0.0,10.0)
        alignment_sim.input["p_score"]  = np.clip(row_dict["pressure_score"],    0.0, 1.0)
        alignment_sim.compute()
        score = round(alignment_sim.output["alignment"], 4)
        label = "Misaligned" if score < 0.4 else ("Partial" if score < 0.66 else "Aligned")
        return score, label
    except:
        m = row_dict["effort_mismatch"]
        e = row_dict["study_hours_day"]
        if m < -0.2 or e < 2:
            return 0.2, "Misaligned"
        elif m > 0.1 and e > 5:
            return 0.75, "Aligned"
        else:
            return 0.5, "Partial"

def predict_cluster(row_dict):
    vec        = np.array([[row_dict.get(f, 0) for f in model2_feats]])
    vec_scaled = model2_scaler.transform(vec)
    cluster_id = kmeans_final.predict(vec_scaled)[0]
    return cluster_id, cluster_labels[cluster_id]

def run_simulation(student_id, week, changes, scenario_name="Scenario"):
    baseline = get_student_baseline(student_id, week)
    modified = apply_scenario(baseline, changes)

    before = {
        "performance"    : predict_performance(baseline),
        "pressure_label" : predict_pressure_label(baseline),
        "fuzzy_pressure" : predict_fuzzy_pressure(baseline),
        "fuzzy_alignment": predict_fuzzy_alignment(baseline),
        "cluster"        : predict_cluster(baseline),
    }
    after = {
        "performance"    : predict_performance(modified),
        "pressure_label" : predict_pressure_label(modified),
        "fuzzy_pressure" : predict_fuzzy_pressure(modified),
        "fuzzy_alignment": predict_fuzzy_alignment(modified),
        "cluster"        : predict_cluster(modified),
    }

    print(f"\n{'='*60}")
    print(f"WHAT-IF SIMULATION — {scenario_name}")
    print(f"Student: {student_id}  |  Week: {week}")
    print(f"{'='*60}")
    print(f"\nChanges applied:")
    for col, val in changes.items():
        print(f"  {col:<30} {baseline.get(col, 'N/A')}  →  {val}")

    print(f"\n{'Metric':<30} {'Before':>12} {'After':>12} {'Delta':>10}")
    print("-"*60)

    perf_delta = after["performance"] - before["performance"]
    arrow = "↑" if perf_delta > 0 else ("↓" if perf_delta < 0 else "—")
    print(f"{'Performance Score':<30} {before['performance']:>12.2f} "
          f"{after['performance']:>12.2f} {arrow}{abs(perf_delta):>8.2f}")

    same = "✓" if before["pressure_label"] == after["pressure_label"] else "✗"
    print(f"{'Pressure Label (ML)':<30} {before['pressure_label']:>12} "
          f"{after['pressure_label']:>12} {same:>10}")

    fp_b, fp_a = before["fuzzy_pressure"], after["fuzzy_pressure"]
    fp_delta   = (fp_a[0] - fp_b[0]) if fp_b[0] is not np.nan else 0
    arrow_fp   = "↑" if fp_delta > 0 else ("↓" if fp_delta < 0 else "—")
    print(f"{'Fuzzy Pressure Score':<30} {fp_b[0]:>12.4f} "
          f"{fp_a[0]:>12.4f} {arrow_fp}{abs(fp_delta):>8.4f}")
    print(f"{'Fuzzy Pressure Label':<30} {fp_b[1]:>12} {fp_a[1]:>12}")

    fa_b, fa_a = before["fuzzy_alignment"], after["fuzzy_alignment"]
    fa_delta   = (fa_a[0] - fa_b[0]) if fa_b[0] is not np.nan else 0
    arrow_fa   = "↑" if fa_delta > 0 else ("↓" if fa_delta < 0 else "—")
    print(f"{'Fuzzy Alignment Score':<30} {fa_b[0]:>12.4f} "
          f"{fa_a[0]:>12.4f} {arrow_fa}{abs(fa_delta):>8.4f}")
    print(f"{'Fuzzy Alignment Label':<30} {fa_b[1]:>12} {fa_a[1]:>12}")
    print(f"{'Cluster':<30} {before['cluster'][1]:>12} {after['cluster'][1]:>12}")
    print(f"\n[Note] Simulation only — not a prescription.")

    return {"before": before, "after": after,
            "baseline": baseline, "modified": modified,
            "changes": changes}

def plot_simulation(result, scenario_name="Scenario"):
    before = result["before"]
    after  = result["after"]
    metrics = {
        "Performance\nScore"    : (before["performance"],
                                   after["performance"], 100),
        "Fuzzy Pressure\nScore" : (before["fuzzy_pressure"][0],
                                   after["fuzzy_pressure"][0], 1),
        "Fuzzy Alignment\nScore": (before["fuzzy_alignment"][0],
                                   after["fuzzy_alignment"][0], 1),
    }
    fig, axes = plt.subplots(1, 3, figsize=(13, 4))
    fig.suptitle(f"What-If Simulation — {scenario_name}",
                 fontsize=12, fontweight="bold")
    for ax, (metric, (b, a, max_val)) in zip(axes, metrics.items()):
        if b is None or a is None:
            continue
        bars = ax.bar(["Before", "After"], [b, a],
                      color=["steelblue","darkorange"],
                      width=0.4, edgecolor="white")
        ax.set_ylim(0, max_val * 1.15)
        ax.set_title(metric)
        ax.grid(True, alpha=0.3, axis="y")
        ax.set_xlabel(f"Δ = {a - b:+.3f}", fontsize=10)
        for bar, val in zip(bars, [b, a]):
            ax.text(bar.get_x() + bar.get_width()/2,
                    bar.get_height() + max_val*0.02,
                    f"{val:.2f}", ha="center", va="bottom", fontsize=10)
    plt.tight_layout()
    plt.savefig(f"whatif_{scenario_name.replace(' ','_')}.png",
                dpi=150, bbox_inches="tight")
    plt.show()

# ── RUN SIMULATIONS ───────────────────────────────────────────
sample_student = df["student_id"].iloc[100]

r1 = run_simulation(sample_student, 10,
    {"screen_time_day": 1.5},
    "Reduce Screen Time")
plot_simulation(r1, "Reduce Screen Time")

r2 = run_simulation(sample_student, 10,
    {"sleep_hours_day": 8.0},
    "Improve Sleep")
plot_simulation(r2, "Improve Sleep")

r3 = run_simulation(sample_student, 10,
    {"study_hours_day": 7.0, "screen_time_day": 1.5, "sleep_hours_day": 7.5},
    "Balanced Improvement")
plot_simulation(r3, "Balanced Improvement")

r4 = run_simulation(sample_student, 10,
    {"deadline_count": 6, "deadline_density": 1.0,
     "sleep_hours_day": 5.0, "screen_time_day": 4.5},
    "Exam Week Stress")
plot_simulation(r4, "Exam Week Stress")

print("\nWhat-If Simulation Engine complete.")
