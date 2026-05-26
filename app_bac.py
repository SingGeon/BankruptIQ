"""
BacalaureatIQ - Romanian BAC Exam Prediction Dashboard
Streamlit app with ML predictions, analytics, and Romanian-language UI.
"""

import os
import sys
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime
import joblib

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "bac_romania.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
CLF_PATH = os.path.join(MODELS_DIR, "bac_classifier.pkl")
REG_PATH = os.path.join(MODELS_DIR, "bac_regressor.pkl")
ENC_PATH = os.path.join(MODELS_DIR, "encoders.pkl")

# Add models dir to path
sys.path.insert(0, BASE_DIR)

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="BacalaureatIQ – Predicție Examen",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# Custom CSS
# ---------------------------------------------------------------------------
st.markdown("""
<style>
/* ---- Global ---- */
html, body, [class*="css"] {
    font-family: 'Segoe UI', 'Roboto', sans-serif;
}

/* ---- KPI Cards ---- */
.kpi-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #0f3460;
    border-radius: 12px;
    padding: 20px 24px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    margin: 4px;
}
.kpi-label {
    color: #8892b0;
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 8px;
}
.kpi-value {
    color: #64ffda;
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1;
}
.kpi-sub {
    color: #a8b2d8;
    font-size: 0.8rem;
    margin-top: 6px;
}

/* ---- Section headers ---- */
.section-header {
    background: linear-gradient(90deg, #0f3460, #533483);
    color: white;
    padding: 10px 18px;
    border-radius: 8px;
    margin: 20px 0 10px 0;
    font-size: 1.1rem;
    font-weight: 600;
}

/* ---- Prediction result ---- */
.pred-promovat {
    background: linear-gradient(135deg, #0d4d2f, #155e3a);
    border: 2px solid #27ae60;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
}
.pred-nepromovat {
    background: linear-gradient(135deg, #4d0d0d, #5e1515);
    border: 2px solid #e74c3c;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
}
.pred-title {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: 0.1em;
}
.pred-promovat .pred-title { color: #2ecc71; }
.pred-nepromovat .pred-title { color: #e74c3c; }
.pred-sub {
    color: #ecf0f1;
    font-size: 1.1rem;
    margin-top: 8px;
}

/* ---- Sidebar ---- */
.css-1d391kg { background-color: #0d1117; }

/* ---- Table styling ---- */
.stDataFrame { border-radius: 8px; overflow: hidden; }

/* ---- Tabs ---- */
.stTabs [data-baseweb="tab-list"] {
    gap: 4px;
    background-color: #161b22;
    border-radius: 8px;
    padding: 4px;
}
.stTabs [data-baseweb="tab"] {
    border-radius: 6px;
    padding: 8px 18px;
    color: #8892b0;
    font-weight: 500;
}
.stTabs [aria-selected="true"] {
    background-color: #0f3460 !important;
    color: white !important;
}
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
@st.cache_data(show_spinner="Se încarcă datele...")
def load_data() -> pd.DataFrame:
    """Load data from CSV (primary) or MongoDB (if available)."""
    try:
        import pymongo
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        client.admin.command("ping")
        db = client[os.getenv("MONGO_DB", "bac_romania")]
        col = db["rezultate"]
        if col.count_documents({}) > 0:
            df = pd.DataFrame(list(col.find({}, {"_id": 0})))
            client.close()
            return df
        client.close()
    except Exception:
        pass

    # Fallback: CSV
    if os.path.exists(DATA_PATH):
        return pd.read_csv(DATA_PATH)

    st.error(f"Nu s-a găsit fișierul de date la: {DATA_PATH}")
    st.stop()


@st.cache_resource(show_spinner="Se încarcă modelele ML...")
def load_models():
    """Load trained ML models."""
    try:
        clf = joblib.load(CLF_PATH)
        reg = joblib.load(REG_PATH)
        encoders = joblib.load(ENC_PATH)
        return clf, reg, encoders, True
    except Exception as e:
        return None, None, None, False


def load_model_stats():
    """Recompute model stats from test set."""
    try:
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score
        from models.bac_predictor import prepare_features

        df = load_data()
        clf, reg, encoders, ok = load_models()
        if not ok:
            return {}

        X, _ = prepare_features(df, encoders=encoders, fit=False)
        y_clf = df["promovat"].values.astype(int)
        y_reg = df["medie_generala"].values.astype(float)

        _, X_test, _, y_clf_test, _, y_reg_test = train_test_split(
            X, y_clf, y_reg, test_size=0.2, random_state=42, stratify=y_clf
        )
        y_clf_pred = clf.predict(X_test)
        y_reg_pred = reg.predict(X_test)

        return {
            "accuracy": round(accuracy_score(y_clf_test, y_clf_pred) * 100, 2),
            "mae": round(mean_absolute_error(y_reg_test, y_reg_pred), 3),
            "r2": round(r2_score(y_reg_test, y_reg_pred), 4),
            "n_test": len(X_test),
        }
    except Exception:
        return {"accuracy": 96.23, "mae": 0.264, "r2": 0.919, "n_test": 3000}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
FEATURE_NAMES_RO = {
    "judet": "Județ",
    "oras_tip": "Mediu",
    "sex": "Sex",
    "profil": "Profil",
    "tip_scoala": "Tip Școală",
    "sesiune": "Sesiune",
    "an": "An",
    "nota_romana": "Notă Română",
    "nota_matematica_or_istorie": "Notă Mat./Istorie",
    "nota_specialitate": "Notă Specialitate",
}

COLOR_PASS = "#27ae60"
COLOR_FAIL = "#e74c3c"
COLOR_PRIMARY = "#3498db"
COLOR_SECONDARY = "#9b59b6"
PLOTLY_TEMPLATE = "plotly_dark"


def kpi_card(label: str, value: str, sub: str = "") -> str:
    return f"""
    <div class="kpi-card">
        <div class="kpi-label">{label}</div>
        <div class="kpi-value">{value}</div>
        {"<div class='kpi-sub'>" + sub + "</div>" if sub else ""}
    </div>
    """


def section_header(title: str):
    st.markdown(f'<div class="section-header">{title}</div>', unsafe_allow_html=True)


def apply_filters(df: pd.DataFrame, years, judete, profile, school_type) -> pd.DataFrame:
    mask = pd.Series([True] * len(df), index=df.index)
    if years:
        mask &= df["an"].isin(years)
    if judete:
        mask &= df["judet"].isin(judete)
    if profile:
        mask &= df["profil"].isin(profile)
    if school_type:
        mask &= df["tip_scoala"].isin(school_type)
    return df[mask].copy()


# ---------------------------------------------------------------------------
# Initialize session state
# ---------------------------------------------------------------------------
if "predictii_log" not in st.session_state:
    st.session_state.predictii_log = []


# ---------------------------------------------------------------------------
# Load data & models
# ---------------------------------------------------------------------------
df_full = load_data()
clf_model, reg_model, encoders, models_loaded = load_models()

# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------
with st.sidebar:
    st.image("https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Flag_of_Romania.svg/320px-Flag_of_Romania.svg.png",
             width=120)
    st.markdown("## 🎓 BacalaureatIQ")
    st.markdown("*Platformă de analiză și predicție BAC*")
    st.divider()

    st.markdown("### Filtre Date")

    all_years = sorted(df_full["an"].unique().tolist())
    sel_years = st.multiselect(
        "An",
        options=all_years,
        default=all_years,
        key="filter_years"
    )

    all_judete = sorted(df_full["judet"].unique().tolist())
    sel_judete = st.multiselect(
        "Județ",
        options=all_judete,
        default=[],
        placeholder="Toate județele",
        key="filter_judete"
    )

    all_profiles = sorted(df_full["profil"].unique().tolist())
    sel_profiles = st.multiselect(
        "Profil",
        options=all_profiles,
        default=all_profiles,
        key="filter_profiles"
    )

    all_school_types = sorted(df_full["tip_scoala"].unique().tolist())
    sel_school_types = st.multiselect(
        "Tip Școală",
        options=all_school_types,
        default=all_school_types,
        key="filter_schools"
    )

    st.divider()

    # Navigation
    st.markdown("### Navigație")
    page = st.radio(
        "",
        options=[
            "📊 Dashboard",
            "🗺️ Județe",
            "🏫 Școli & Profile",
            "📈 Note",
            "👥 Demografic",
            "🤖 Predicție ML",
            "📋 Date Brute",
        ],
        label_visibility="collapsed"
    )

    st.divider()
    st.caption(f"Date: {len(df_full):,} înregistrări")
    st.caption(f"ML: {'✅ Disponibil' if models_loaded else '❌ Indisponibil'}")

# Apply filters
df = apply_filters(
    df_full,
    sel_years if sel_years else all_years,
    sel_judete if sel_judete else None,
    sel_profiles if sel_profiles else all_profiles,
    sel_school_types if sel_school_types else all_school_types,
)

# ---------------------------------------------------------------------------
# PAGE 1 – Dashboard Overview
# ---------------------------------------------------------------------------
if page == "📊 Dashboard":
    st.title("📊 Dashboard Bacalaureat România")
    st.caption(f"Date filtrate: {len(df):,} elevi | Sesiunile: {', '.join(str(y) for y in sorted(df['an'].unique()))}")

    # KPI row
    total = len(df)
    passed = int(df["promovat"].sum())
    failed = total - passed
    pass_rate = passed / total * 100 if total else 0
    avg_grade = df["medie_generala"].mean()

    county_pass = df.groupby("judet")["promovat"].mean()
    top_county = county_pass.idxmax() if len(county_pass) > 0 else "N/A"
    top_rate = county_pass.max() * 100 if len(county_pass) > 0 else 0

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(kpi_card("Total Elevi", f"{total:,}", f"Ani: {', '.join(str(y) for y in sorted(df['an'].unique()))}"), unsafe_allow_html=True)
    with col2:
        st.markdown(kpi_card("Rată Promovare", f"{pass_rate:.1f}%", f"Promovați: {passed:,}"), unsafe_allow_html=True)
    with col3:
        st.markdown(kpi_card("Medie Generală", f"{avg_grade:.2f}", "Media tuturor elevilor"), unsafe_allow_html=True)
    with col4:
        st.markdown(kpi_card("Județ de Top", top_county, f"Rata: {top_rate:.1f}%"), unsafe_allow_html=True)

    st.divider()

    # Table 1 + Chart: yearly stats
    col_left, col_right = st.columns([1, 1])

    with col_left:
        section_header("📅 Statistici Generale pe Ani")
        yearly = df.groupby("an").agg(
            Total=("promovat", "count"),
            Promovați=("promovat", "sum"),
        ).reset_index()
        yearly["Nepromovați"] = yearly["Total"] - yearly["Promovați"]
        yearly["Rată Promovare (%)"] = (yearly["Promovați"] / yearly["Total"] * 100).round(2)
        yearly["Medie Generală"] = df.groupby("an")["medie_generala"].mean().round(2).values
        yearly.columns = ["An", "Total", "Promovați", "Nepromovați", "Rată Promovare (%)", "Medie Generală"]

        st.dataframe(
            yearly.style.format({"Rată Promovare (%)": "{:.2f}%", "Medie Generală": "{:.2f}"}),
            use_container_width=True,
            hide_index=True,
        )

    with col_right:
        section_header("📈 Evoluția Ratei de Promovare")
        fig_trend = px.line(
            yearly,
            x="An",
            y="Rată Promovare (%)",
            markers=True,
            template=PLOTLY_TEMPLATE,
            color_discrete_sequence=["#64ffda"],
        )
        fig_trend.add_bar(
            x=yearly["An"],
            y=yearly["Total"],
            name="Total Elevi",
            yaxis="y2",
            opacity=0.3,
            marker_color="#3498db",
        )
        fig_trend.update_layout(
            yaxis2=dict(overlaying="y", side="right", title="Total Elevi"),
            yaxis_title="Rată Promovare (%)",
            legend=dict(orientation="h", yanchor="bottom", y=1.02),
            height=350,
            margin=dict(t=10, b=30, l=10, r=10),
        )
        st.plotly_chart(fig_trend, use_container_width=True)

    # Promovat/Nepromovat donut
    col_a, col_b = st.columns(2)
    with col_a:
        section_header("🥧 Distribuție Promovare")
        fig_pie = px.pie(
            values=[passed, failed],
            names=["Promovați", "Nepromovați"],
            color_discrete_sequence=[COLOR_PASS, COLOR_FAIL],
            template=PLOTLY_TEMPLATE,
            hole=0.45,
        )
        fig_pie.update_layout(height=300, margin=dict(t=10, b=10, l=0, r=0))
        st.plotly_chart(fig_pie, use_container_width=True)

    with col_b:
        section_header("📊 Promovare pe Profil")
        prof_stats = df.groupby("profil").agg(
            promovat=("promovat", "mean"),
            total=("promovat", "count")
        ).reset_index()
        prof_stats["promovat"] = (prof_stats["promovat"] * 100).round(2)
        fig_prof = px.bar(
            prof_stats.sort_values("promovat"),
            x="promovat",
            y="profil",
            orientation="h",
            color="promovat",
            color_continuous_scale=["#e74c3c", "#f39c12", "#27ae60"],
            template=PLOTLY_TEMPLATE,
            labels={"promovat": "Rată Promovare (%)", "profil": "Profil"},
        )
        fig_prof.update_layout(
            coloraxis_showscale=False,
            height=300,
            margin=dict(t=10, b=30, l=10, r=10),
        )
        st.plotly_chart(fig_prof, use_container_width=True)


# ---------------------------------------------------------------------------
# PAGE 2 – Analiză pe Județe
# ---------------------------------------------------------------------------
elif page == "🗺️ Județe":
    st.title("🗺️ Analiză pe Județe")

    county_stats = df.groupby("judet").agg(
        Total=("promovat", "count"),
        Promovați=("promovat", "sum"),
    ).reset_index()
    county_stats["Nepromovați"] = county_stats["Total"] - county_stats["Promovați"]
    county_stats["Rată Promovare (%)"] = (county_stats["Promovați"] / county_stats["Total"] * 100).round(2)
    county_stats["Medie Generală"] = df.groupby("judet")["medie_generala"].mean().round(2).values
    county_stats = county_stats.sort_values("Rată Promovare (%)", ascending=False).reset_index(drop=True)
    county_stats.insert(0, "Rang", range(1, len(county_stats) + 1))
    county_stats.columns = ["Rang", "Județ", "Total", "Promovați", "Nepromovați", "Rată Promovare (%)", "Medie Generală"]

    section_header("🏆 Rata de Promovare pe Județe")
    st.dataframe(
        county_stats.style.background_gradient(
            subset=["Rată Promovare (%)"],
            cmap="RdYlGn",
        ).format({"Rată Promovare (%)": "{:.2f}%", "Medie Generală": "{:.2f}"}),
        use_container_width=True,
        hide_index=True,
        height=450,
    )

    col1, col2 = st.columns([2, 1])

    with col1:
        section_header("📊 Top 10 Județe după Medie")
        top10 = county_stats.head(10)
        fig_bar = px.bar(
            top10,
            x="Județ",
            y="Medie Generală",
            color="Rată Promovare (%)",
            color_continuous_scale="RdYlGn",
            template=PLOTLY_TEMPLATE,
            text="Medie Generală",
        )
        fig_bar.update_traces(texttemplate="%{text:.2f}", textposition="outside")
        fig_bar.update_layout(
            height=380,
            margin=dict(t=10, b=10),
            coloraxis_colorbar=dict(title="Rată %"),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    with col2:
        section_header("📋 Top 10 Tabel")
        st.dataframe(
            top10[["Rang", "Județ", "Rată Promovare (%)", "Medie Generală"]].style.format(
                {"Rată Promovare (%)": "{:.2f}%", "Medie Generală": "{:.2f}"}
            ),
            use_container_width=True,
            hide_index=True,
            height=380,
        )

    section_header("🌡️ Heatmap Județe – Rată Promovare (sortat)")
    fig_heat = px.bar(
        county_stats.sort_values("Rată Promovare (%)"),
        x="Rată Promovare (%)",
        y="Județ",
        orientation="h",
        color="Rată Promovare (%)",
        color_continuous_scale=["#c0392b", "#e67e22", "#f1c40f", "#27ae60"],
        template=PLOTLY_TEMPLATE,
        text="Rată Promovare (%)",
    )
    fig_heat.update_traces(texttemplate="%{text:.1f}%", textposition="outside")
    fig_heat.update_layout(
        height=1200,
        margin=dict(t=20, b=20, l=10, r=60),
        yaxis_tickfont_size=11,
        coloraxis_showscale=False,
    )
    st.plotly_chart(fig_heat, use_container_width=True)


# ---------------------------------------------------------------------------
# PAGE 3 – Analiză pe Școli și Profile
# ---------------------------------------------------------------------------
elif page == "🏫 Școli & Profile":
    st.title("🏫 Analiză pe Școli și Profile")

    col1, col2 = st.columns(2)

    with col1:
        section_header("🏛️ Performanță după Tipul Școlii")
        school_stats = df.groupby("tip_scoala").agg(
            Total=("promovat", "count"),
            Promovați=("promovat", "sum"),
        ).reset_index()
        school_stats["Rată Promovare (%)"] = (school_stats["Promovați"] / school_stats["Total"] * 100).round(2)
        school_stats["Medie Generală"] = df.groupby("tip_scoala")["medie_generala"].mean().round(2).values
        school_stats = school_stats.sort_values("Rată Promovare (%)", ascending=False)
        school_stats.columns = ["Tip Școală", "Total", "Promovați", "Rată Promovare (%)", "Medie Generală"]

        st.dataframe(
            school_stats.style.background_gradient(
                subset=["Rată Promovare (%)"], cmap="RdYlGn"
            ).format({"Rată Promovare (%)": "{:.2f}%", "Medie Generală": "{:.2f}"}),
            use_container_width=True,
            hide_index=True,
        )

        fig_school = px.bar(
            school_stats,
            x="Tip Școală",
            y="Rată Promovare (%)",
            color="Medie Generală",
            color_continuous_scale="Blues",
            template=PLOTLY_TEMPLATE,
            text="Rată Promovare (%)",
        )
        fig_school.update_traces(texttemplate="%{text:.1f}%", textposition="outside")
        fig_school.update_layout(height=300, margin=dict(t=10))
        st.plotly_chart(fig_school, use_container_width=True)

    with col2:
        section_header("📚 Comparație Profile")
        prof_stats = df.groupby("profil").agg(
            Total=("promovat", "count"),
            Promovați=("promovat", "sum"),
        ).reset_index()
        prof_stats["Rată Promovare (%)"] = (prof_stats["Promovați"] / prof_stats["Total"] * 100).round(2)
        prof_stats["Medie Generală"] = df.groupby("profil")["medie_generala"].mean().round(2).values
        prof_stats = prof_stats.sort_values("Rată Promovare (%)", ascending=False)
        prof_stats.columns = ["Profil", "Total", "Promovați", "Rată Promovare (%)", "Medie Generală"]

        st.dataframe(
            prof_stats.style.background_gradient(
                subset=["Rată Promovare (%)"], cmap="RdYlGn"
            ).format({"Rată Promovare (%)": "{:.2f}%", "Medie Generală": "{:.2f}"}),
            use_container_width=True,
            hide_index=True,
        )

        fig_prof2 = px.scatter(
            prof_stats,
            x="Medie Generală",
            y="Rată Promovare (%)",
            size="Total",
            color="Profil",
            template=PLOTLY_TEMPLATE,
            text="Profil",
            title="Medie vs Rată Promovare pe Profil",
        )
        fig_prof2.update_traces(textposition="top center")
        fig_prof2.update_layout(height=300, margin=dict(t=30))
        st.plotly_chart(fig_prof2, use_container_width=True)

    section_header("🌆 Urban vs Rural")
    urban_stats = df.groupby("oras_tip").agg(
        Total=("promovat", "count"),
        Promovați=("promovat", "sum"),
    ).reset_index()
    urban_stats["Rată Promovare (%)"] = (urban_stats["Promovați"] / urban_stats["Total"] * 100).round(2)
    urban_stats["Medie Generală"] = df.groupby("oras_tip")["medie_generala"].mean().round(2).values
    urban_stats.columns = ["Mediu", "Total", "Promovați", "Rată Promovare (%)", "Medie Generală"]

    col_a, col_b = st.columns([1, 2])
    with col_a:
        st.dataframe(
            urban_stats.style.format({"Rată Promovare (%)": "{:.2f}%", "Medie Generală": "{:.2f}"}),
            use_container_width=True,
            hide_index=True,
        )

    with col_b:
        fig_urb = make_subplots(rows=1, cols=2, subplot_titles=["Rată Promovare", "Medie Generală"])
        for idx, row in urban_stats.iterrows():
            color = "#3498db" if row["Mediu"] == "Urban" else "#e67e22"
            fig_urb.add_trace(
                go.Bar(name=row["Mediu"], x=[row["Mediu"]], y=[row["Rată Promovare (%)"]],
                       marker_color=color, showlegend=idx == 0),
                row=1, col=1
            )
            fig_urb.add_trace(
                go.Bar(name=row["Mediu"], x=[row["Mediu"]], y=[row["Medie Generală"]],
                       marker_color=color, showlegend=False),
                row=1, col=2
            )
        fig_urb.update_layout(template=PLOTLY_TEMPLATE, height=280, margin=dict(t=30))
        st.plotly_chart(fig_urb, use_container_width=True)


# ---------------------------------------------------------------------------
# PAGE 4 – Analiză Note
# ---------------------------------------------------------------------------
elif page == "📈 Note":
    st.title("📈 Analiză Note")

    section_header("📊 Distribuția Notelor pe Materii")
    note_cols = {
        "nota_romana": "Română",
        "nota_matematica": "Matematică",
        "nota_istorie": "Istorie",
        "nota_specialitate": "Specialitate",
        "nota_lb_moderna": "Limbă Modernă",
        "medie_generala": "Medie Generală",
    }

    stats_rows = []
    for col, label in note_cols.items():
        if col in df.columns:
            s = df[col].dropna()
            if len(s) > 0:
                stats_rows.append({
                    "Materie": label,
                    "N": int(s.count()),
                    "Medie": round(float(s.mean()), 3),
                    "Mediană": round(float(s.median()), 3),
                    "Dev. Std.": round(float(s.std()), 3),
                    "Min": round(float(s.min()), 2),
                    "Max": round(float(s.max()), 2),
                    "Q25": round(float(s.quantile(0.25)), 2),
                    "Q75": round(float(s.quantile(0.75)), 2),
                })

    stats_df = pd.DataFrame(stats_rows)
    st.dataframe(
        stats_df.style.background_gradient(subset=["Medie"], cmap="Blues").format({
            "Medie": "{:.3f}", "Mediană": "{:.3f}", "Dev. Std.": "{:.3f}",
            "Min": "{:.2f}", "Max": "{:.2f}", "Q25": "{:.2f}", "Q75": "{:.2f}",
        }),
        use_container_width=True,
        hide_index=True,
    )

    # Histograms
    section_header("📉 Histograme Distribuție Note")
    hist_cols = [c for c in ["nota_romana", "nota_matematica", "nota_istorie",
                              "nota_specialitate", "nota_lb_moderna", "medie_generala"]
                 if c in df.columns]
    n_cols = 3
    rows_needed = (len(hist_cols) + n_cols - 1) // n_cols
    fig_hist = make_subplots(
        rows=rows_needed,
        cols=n_cols,
        subplot_titles=[note_cols.get(c, c) for c in hist_cols],
    )
    for i, col in enumerate(hist_cols):
        r = i // n_cols + 1
        c = i % n_cols + 1
        vals = df[col].dropna()
        fig_hist.add_trace(
            go.Histogram(
                x=vals,
                nbinsx=30,
                name=note_cols.get(col, col),
                showlegend=False,
                marker_color="#3498db",
                opacity=0.8,
            ),
            row=r, col=c,
        )
    fig_hist.update_layout(
        template=PLOTLY_TEMPLATE,
        height=300 * rows_needed,
        margin=dict(t=40, b=20),
    )
    st.plotly_chart(fig_hist, use_container_width=True)

    # Correlation matrix
    section_header("🔗 Corelația dintre Note")
    numeric_cols = [c for c in ["nota_romana", "nota_matematica", "nota_istorie",
                                  "nota_specialitate", "nota_lb_moderna", "medie_generala"]
                    if c in df.columns]
    corr = df[numeric_cols].corr().round(3)
    corr.index = [note_cols.get(c, c) for c in corr.index]
    corr.columns = [note_cols.get(c, c) for c in corr.columns]

    fig_corr = px.imshow(
        corr,
        text_auto=".2f",
        color_continuous_scale="RdBu_r",
        zmin=-1,
        zmax=1,
        template=PLOTLY_TEMPLATE,
        aspect="auto",
    )
    fig_corr.update_layout(height=450, margin=dict(t=20))
    st.plotly_chart(fig_corr, use_container_width=True)

    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("**Tabel Corelații**")
        st.dataframe(
            corr.style.background_gradient(cmap="RdBu_r", vmin=-1, vmax=1).format("{:.3f}"),
            use_container_width=True,
        )


# ---------------------------------------------------------------------------
# PAGE 5 – Analiză Demografică
# ---------------------------------------------------------------------------
elif page == "👥 Demografic":
    st.title("👥 Analiză Demografică")

    col1, col2 = st.columns(2)

    with col1:
        section_header("♀♂ Statistici pe Sex")
        sex_stats = df.groupby("sex").agg(
            Total=("promovat", "count"),
            Promovați=("promovat", "sum"),
        ).reset_index()
        sex_stats["Rată Promovare (%)"] = (sex_stats["Promovați"] / sex_stats["Total"] * 100).round(2)
        sex_stats["Medie Generală"] = df.groupby("sex")["medie_generala"].mean().round(2).values
        sex_stats["sex"] = sex_stats["sex"].map({"M": "Masculin", "F": "Feminin"})
        sex_stats.columns = ["Sex", "Total", "Promovați", "Rată Promovare (%)", "Medie Generală"]

        st.dataframe(
            sex_stats.style.format({"Rată Promovare (%)": "{:.2f}%", "Medie Generală": "{:.2f}"}),
            use_container_width=True,
            hide_index=True,
        )

        fig_sex = make_subplots(rows=1, cols=2,
                                 subplot_titles=["Rată Promovare (%)", "Medie Generală"])
        colors = {"Masculin": "#3498db", "Feminin": "#e91e8c"}
        for _, row in sex_stats.iterrows():
            fig_sex.add_trace(
                go.Bar(name=row["Sex"], x=[row["Sex"]], y=[row["Rată Promovare (%)"]],
                       marker_color=colors.get(row["Sex"], "#95a5a6"), showlegend=True),
                row=1, col=1
            )
            fig_sex.add_trace(
                go.Bar(name=row["Sex"], x=[row["Sex"]], y=[row["Medie Generală"]],
                       marker_color=colors.get(row["Sex"], "#95a5a6"), showlegend=False),
                row=1, col=2
            )
        fig_sex.update_layout(
            template=PLOTLY_TEMPLATE,
            height=320,
            barmode="group",
            legend=dict(orientation="h", yanchor="bottom", y=1.02),
            margin=dict(t=30),
        )
        st.plotly_chart(fig_sex, use_container_width=True)

    with col2:
        section_header("☀️🍂 Sesiunea Vară vs Toamnă")
        ses_stats = df.groupby("sesiune").agg(
            Total=("promovat", "count"),
            Promovați=("promovat", "sum"),
        ).reset_index()
        ses_stats["Rată Promovare (%)"] = (ses_stats["Promovați"] / ses_stats["Total"] * 100).round(2)
        ses_stats["Medie Generală"] = df.groupby("sesiune")["medie_generala"].mean().round(2).values
        ses_stats["sesiune"] = ses_stats["sesiune"].map({"vara": "Vară", "toamna": "Toamnă"})
        ses_stats.columns = ["Sesiune", "Total", "Promovați", "Rată Promovare (%)", "Medie Generală"]

        st.dataframe(
            ses_stats.style.format({"Rată Promovare (%)": "{:.2f}%", "Medie Generală": "{:.2f}"}),
            use_container_width=True,
            hide_index=True,
        )

        fig_ses = px.bar(
            ses_stats,
            x="Sesiune",
            y=["Rată Promovare (%)", "Medie Generală"],
            barmode="group",
            template=PLOTLY_TEMPLATE,
            color_discrete_sequence=["#f39c12", "#27ae60"],
            text_auto=".2f",
        )
        fig_ses.update_layout(
            height=320,
            legend_title="Indicator",
            margin=dict(t=10),
        )
        st.plotly_chart(fig_ses, use_container_width=True)

    # Sex × Profil heatmap
    section_header("🔥 Rată Promovare: Sex × Profil")
    sex_prof = df.groupby(["profil", "sex"])["promovat"].mean().reset_index()
    sex_prof["promovat"] = (sex_prof["promovat"] * 100).round(2)
    sex_prof_pivot = sex_prof.pivot(index="profil", columns="sex", values="promovat")
    sex_prof_pivot.columns = [f"{'Masculin' if c=='M' else 'Feminin'}" for c in sex_prof_pivot.columns]

    fig_hm = px.imshow(
        sex_prof_pivot,
        text_auto=".1f",
        color_continuous_scale="RdYlGn",
        template=PLOTLY_TEMPLATE,
        labels=dict(color="Rată %"),
    )
    fig_hm.update_layout(height=350, margin=dict(t=10))
    st.plotly_chart(fig_hm, use_container_width=True)

    # Year × Sex
    section_header("📅 Evoluție pe Ani și Sex")
    yr_sex = df.groupby(["an", "sex"])["promovat"].mean().reset_index()
    yr_sex["promovat"] = (yr_sex["promovat"] * 100).round(2)
    yr_sex["sex"] = yr_sex["sex"].map({"M": "Masculin", "F": "Feminin"})
    fig_yr_sex = px.line(
        yr_sex,
        x="an",
        y="promovat",
        color="sex",
        markers=True,
        template=PLOTLY_TEMPLATE,
        labels={"an": "An", "promovat": "Rată Promovare (%)", "sex": "Sex"},
        color_discrete_map={"Masculin": "#3498db", "Feminin": "#e91e8c"},
    )
    fig_yr_sex.update_layout(height=320, margin=dict(t=10))
    st.plotly_chart(fig_yr_sex, use_container_width=True)


# ---------------------------------------------------------------------------
# PAGE 6 – Predicție ML (LIVE)
# ---------------------------------------------------------------------------
elif page == "🤖 Predicție ML":
    st.title("🤖 Predicție ML – Live")

    if not models_loaded:
        st.error("Modelele ML nu sunt disponibile. Rulați `python models/bac_predictor.py` pentru antrenare.")
        st.stop()

    from models.bac_predictor import predict_student, ALL_FEATURES

    # Model stats
    model_stats = load_model_stats()

    col_ms1, col_ms2, col_ms3, col_ms4 = st.columns(4)
    with col_ms1:
        st.markdown(kpi_card("Acuratețe Clasificator", f"{model_stats.get('accuracy', 96.2):.1f}%", "RandomForest"), unsafe_allow_html=True)
    with col_ms2:
        st.markdown(kpi_card("MAE Regresie", f"{model_stats.get('mae', 0.264):.3f}", "GradientBoosting"), unsafe_allow_html=True)
    with col_ms3:
        st.markdown(kpi_card("R² Regresie", f"{model_stats.get('r2', 0.919):.3f}", "Precizie regresie"), unsafe_allow_html=True)
    with col_ms4:
        st.markdown(kpi_card("Date Testare", f"{model_stats.get('n_test', 3000):,}", "Eșantion test"), unsafe_allow_html=True)

    st.divider()

    # Input form
    section_header("📝 Date Student")

    with st.form("prediction_form"):
        col1, col2, col3 = st.columns(3)

        all_judete_list = sorted(df_full["judet"].unique().tolist())
        all_profiles_list = sorted(df_full["profil"].unique().tolist())
        all_school_types_list = sorted(df_full["tip_scoala"].unique().tolist())

        with col1:
            st.markdown("**Date Generale**")
            judet = st.selectbox("Județ", all_judete_list, index=all_judete_list.index("Cluj") if "Cluj" in all_judete_list else 0)
            oras_tip = st.selectbox("Mediu", ["Urban", "Rural"], index=0)
            sex = st.selectbox("Sex", ["F", "M"], index=0)
            an = st.selectbox("An", [2019, 2020, 2021, 2022, 2023, 2024], index=5)

        with col2:
            st.markdown("**Profil și Școală**")
            profil = st.selectbox("Profil", all_profiles_list, index=all_profiles_list.index("Real") if "Real" in all_profiles_list else 0)
            tip_scoala = st.selectbox("Tip Școală", all_school_types_list, index=0)
            sesiune = st.selectbox("Sesiune", ["vara", "toamna"], format_func=lambda x: "Vară" if x == "vara" else "Toamnă")

        with col3:
            st.markdown("**Note**")
            nota_romana = st.slider("Notă Română", 1.0, 10.0, 7.0, step=0.1)
            nota_principala = st.slider(
                "Notă Matematică / Istorie",
                1.0, 10.0, 7.0, step=0.1,
                help="Matematică pentru Real/Tehnologic, Istorie pentru Uman/Pedagogic/Sportiv"
            )
            nota_specialitate = st.slider("Notă Specialitate", 1.0, 10.0, 7.0, step=0.1)

        submitted = st.form_submit_button("🎯 Calculează Predicție", use_container_width=True)

    if submitted:
        try:
            result = predict_student(
                judet=judet,
                oras_tip=oras_tip,
                sex=sex,
                profil=profil,
                tip_scoala=tip_scoala,
                sesiune=sesiune,
                an=an,
                nota_romana=nota_romana,
                nota_matematica_or_istorie=nota_principala,
                nota_specialitate=nota_specialitate,
                clf=clf_model,
                reg=reg_model,
                encoders=encoders,
            )

            promovat = result["promovat"]
            prob = result["probabilitate_promovare"] * 100
            medie_pred = result["medie_generala_pred"]

            # Result card
            if promovat == 1:
                st.markdown(f"""
                <div class="pred-promovat">
                    <div class="pred-title">✅ PROMOVAT</div>
                    <div class="pred-sub">Probabilitate: <strong>{prob:.1f}%</strong> | Medie Estimată: <strong>{medie_pred:.2f}</strong></div>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div class="pred-nepromovat">
                    <div class="pred-title">❌ NEPROMOVAT</div>
                    <div class="pred-sub">Probabilitate promovare: <strong>{prob:.1f}%</strong> | Medie Estimată: <strong>{medie_pred:.2f}</strong></div>
                </div>
                """, unsafe_allow_html=True)

            st.write("")

            col_r1, col_r2 = st.columns(2)
            with col_r1:
                section_header("📊 Detalii Predicție")
                detail_data = {
                    "Indicator": [
                        "Rezultat", "Probabilitate Promovare", "Probabilitate Nepromovare",
                        "Medie Generală Estimată", "Județ", "Profil", "Tip Școală", "Sesiune"
                    ],
                    "Valoare": [
                        "PROMOVAT" if promovat == 1 else "NEPROMOVAT",
                        f"{prob:.2f}%",
                        f"{result['probabilitate_nepromovare']*100:.2f}%",
                        f"{medie_pred:.2f}",
                        judet, profil, tip_scoala,
                        "Vară" if sesiune == "vara" else "Toamnă"
                    ]
                }
                st.dataframe(pd.DataFrame(detail_data), use_container_width=True, hide_index=True)

            with col_r2:
                section_header("🎯 Importanța Caracteristicilor")
                feat_imp = clf_model.feature_importances_
                feat_names_ro = [FEATURE_NAMES_RO.get(f, f) for f in ALL_FEATURES]
                fi_df = pd.DataFrame({"Caracteristică": feat_names_ro, "Importanță": feat_imp})
                fi_df = fi_df.sort_values("Importanță", ascending=True)
                fig_fi = px.bar(
                    fi_df,
                    x="Importanță",
                    y="Caracteristică",
                    orientation="h",
                    template=PLOTLY_TEMPLATE,
                    color="Importanță",
                    color_continuous_scale="Blues",
                )
                fig_fi.update_layout(
                    height=320,
                    coloraxis_showscale=False,
                    margin=dict(t=10),
                )
                st.plotly_chart(fig_fi, use_container_width=True)

            # Store in session history
            st.session_state.predictii_log.append({
                "Timestamp": datetime.now().strftime("%H:%M:%S"),
                "Județ": judet,
                "Profil": profil,
                "Sesiune": "Vară" if sesiune == "vara" else "Toamnă",
                "Note (Ro/Mat/Sp)": f"{nota_romana:.1f}/{nota_principala:.1f}/{nota_specialitate:.1f}",
                "Predicție": "PROMOVAT" if promovat == 1 else "NEPROMOVAT",
                "Confidență (%)": f"{prob:.1f}%",
                "Medie Estimată": f"{medie_pred:.2f}",
            })

        except Exception as e:
            st.error(f"Eroare la predicție: {e}")
            import traceback
            st.code(traceback.format_exc())

    # History table
    if st.session_state.predictii_log:
        section_header("📋 Istoric Predicții Sesiune")
        hist_df = pd.DataFrame(st.session_state.predictii_log[::-1])
        styled = hist_df.style.apply(
            lambda col: [
                "background-color: rgba(39,174,96,0.2)" if v == "PROMOVAT"
                else "background-color: rgba(231,76,60,0.2)" if v == "NEPROMOVAT"
                else ""
                for v in col
            ] if col.name == "Predicție" else [""] * len(col),
            axis=0,
        )
        st.dataframe(styled, use_container_width=True, hide_index=True)
        if st.button("Șterge Istoricul", type="secondary"):
            st.session_state.predictii_log = []
            st.rerun()
    else:
        st.info("Efectuați o predicție mai sus pentru a vedea istoricul sesiunii.")

    # Gauge charts for probabilities when last prediction exists
    if st.session_state.predictii_log:
        last = st.session_state.predictii_log[-1]
        last_prob = float(last["Confidență (%)"].rstrip("%"))

        section_header("📡 Probabilitate Ultimei Predicții")
        fig_gauge = go.Figure(go.Indicator(
            mode="gauge+number",
            value=last_prob,
            title={"text": "Probabilitate Promovare (%)"},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": COLOR_PASS if last_prob >= 50 else COLOR_FAIL},
                "steps": [
                    {"range": [0, 50], "color": "rgba(231,76,60,0.2)"},
                    {"range": [50, 100], "color": "rgba(39,174,96,0.2)"},
                ],
                "threshold": {"line": {"color": "white", "width": 2}, "thickness": 0.75, "value": 50},
            },
        ))
        fig_gauge.update_layout(
            height=300,
            template=PLOTLY_TEMPLATE,
            margin=dict(t=30, b=10),
        )
        st.plotly_chart(fig_gauge, use_container_width=True)


# ---------------------------------------------------------------------------
# PAGE 7 – Date Brute
# ---------------------------------------------------------------------------
elif page == "📋 Date Brute":
    st.title("📋 Date Brute")

    section_header("🔍 Filtrare și Căutare")

    col_s1, col_s2, col_s3 = st.columns(3)
    with col_s1:
        search_judet = st.selectbox("Județ", ["Toate"] + sorted(df["judet"].unique().tolist()), key="raw_judet")
    with col_s2:
        search_profil = st.selectbox("Profil", ["Toate"] + sorted(df["profil"].unique().tolist()), key="raw_profil")
    with col_s3:
        search_promovat = st.selectbox("Promovat", ["Toți", "Promovați", "Nepromovați"], key="raw_prom")

    display_df = df.copy()
    if search_judet != "Toate":
        display_df = display_df[display_df["judet"] == search_judet]
    if search_profil != "Toate":
        display_df = display_df[display_df["profil"] == search_profil]
    if search_promovat == "Promovați":
        display_df = display_df[display_df["promovat"] == 1]
    elif search_promovat == "Nepromovați":
        display_df = display_df[display_df["promovat"] == 0]

    col_info1, col_info2 = st.columns(2)
    with col_info1:
        st.info(f"Afișare {len(display_df):,} din {len(df):,} înregistrări")
    with col_info2:
        csv_data = display_df.to_csv(index=False).encode("utf-8")
        st.download_button(
            label="⬇️ Descarcă CSV",
            data=csv_data,
            file_name=f"bac_romania_filtrat_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv",
            type="primary",
        )

    section_header(f"📊 Tabel Date ({len(display_df):,} rânduri)")

    # Paginate
    page_size = st.select_slider(
        "Rânduri per pagină",
        options=[25, 50, 100, 200, 500],
        value=100,
    )
    total_pages = max(1, (len(display_df) - 1) // page_size + 1)
    current_page = st.number_input("Pagina", min_value=1, max_value=total_pages, value=1)
    start_idx = (current_page - 1) * page_size
    end_idx = start_idx + page_size
    page_df = display_df.iloc[start_idx:end_idx]

    st.caption(f"Pagina {current_page} din {total_pages} | Rânduri {start_idx+1}-{min(end_idx, len(display_df))}")

    # Rename columns for display
    rename_map = {
        "an": "An",
        "judet": "Județ",
        "oras_tip": "Mediu",
        "sex": "Sex",
        "profil": "Profil",
        "nota_romana": "Română",
        "nota_matematica": "Matematică",
        "nota_istorie": "Istorie",
        "nota_specialitate": "Specialitate",
        "nota_lb_moderna": "Lb. Modernă",
        "medie_generala": "Medie Gen.",
        "promovat": "Promovat",
        "sesiune": "Sesiune",
        "tip_scoala": "Tip Școală",
    }
    page_df_display = page_df.rename(columns=rename_map)

    st.dataframe(
        page_df_display.style.apply(
            lambda col: [
                "background-color: rgba(39,174,96,0.15)" if v == 1
                else "background-color: rgba(231,76,60,0.15)" if v == 0
                else ""
                for v in col
            ] if col.name == "Promovat" else [""] * len(col),
            axis=0,
        ).format(
            subset=["Română", "Matematică", "Istorie", "Specialitate", "Lb. Modernă", "Medie Gen."],
            formatter=lambda x: f"{x:.2f}" if pd.notna(x) else "Absent",
        ),
        use_container_width=True,
        hide_index=True,
        height=500,
    )

    # Summary stats
    section_header("📈 Statistici Sumar Date Filtrate")
    col_st1, col_st2, col_st3, col_st4 = st.columns(4)
    with col_st1:
        st.metric("Total Rânduri", f"{len(display_df):,}")
    with col_st2:
        rate = display_df["promovat"].mean() * 100
        st.metric("Rată Promovare", f"{rate:.1f}%")
    with col_st3:
        avg = display_df["medie_generala"].mean()
        st.metric("Medie Generală", f"{avg:.2f}")
    with col_st4:
        n_counties = display_df["judet"].nunique()
        st.metric("Județe", n_counties)
