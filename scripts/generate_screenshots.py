#!/usr/bin/env python3
"""Generează mock screenshots ale interfeței BankruptIQ pentru PowerPoint."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.gridspec as gridspec
import numpy as np
import os

OUT = "/home/user/BankruptIQ/scripts/screenshots"
os.makedirs(OUT, exist_ok=True)

# ── Culori aplicație ────────────────────────────────────────────────
BG       = "#0f1117"
SURFACE  = "#1a1d27"
SURFACE2 = "#22263a"
BORDER   = "#2e3349"
ACCENT   = "#4f8ef7"
DANGER   = "#ef4444"
WARNING  = "#f59e0b"
SUCCESS  = "#22c55e"
TEXT     = "#e2e8f0"
MUTED    = "#8892a4"

def set_dark_bg(fig, axes_list=None):
    fig.patch.set_facecolor(BG)
    if axes_list:
        for ax in axes_list:
            ax.set_facecolor(SURFACE)
            ax.tick_params(colors=MUTED, labelsize=9)
            for spine in ax.spines.values():
                spine.set_edgecolor(BORDER)

def add_header(fig, title, subtitle=""):
    fig.text(0.02, 0.97, "💡 BankruptIQ", fontsize=11, color=ACCENT,
             fontweight='bold', va='top')
    fig.text(0.5, 0.97, title, fontsize=13, color=TEXT,
             fontweight='bold', va='top', ha='center')
    if subtitle:
        fig.text(0.5, 0.94, subtitle, fontsize=9, color=MUTED, va='top', ha='center')
    # header line
    fig.add_artist(plt.Line2D([0, 1], [0.935, 0.935], transform=fig.transFigure,
                               color=BORDER, linewidth=1))

def rounded_rect(ax, x, y, w, h, color, alpha=1.0, lw=0, ec=None):
    rect = FancyBboxPatch((x, y), w, h,
                           boxstyle="round,pad=0.01",
                           facecolor=color, alpha=alpha,
                           linewidth=lw, edgecolor=ec or color)
    ax.add_patch(rect)
    return rect


# ══════════════════════════════════════════════════════════════════════
# SCREENSHOT 1 — Dashboard KPI Overview
# ══════════════════════════════════════════════════════════════════════
fig = plt.figure(figsize=(16, 9), dpi=120)
fig.patch.set_facecolor(BG)
add_header(fig, "Dashboard Principal", "Vizualizare generală risc faliment companii românești")

# Navbar simulata
nav_ax = fig.add_axes([0, 0.915, 1, 0.058])
nav_ax.set_facecolor(SURFACE)
nav_ax.set_xlim(0, 1); nav_ax.set_ylim(0, 1)
nav_ax.axis('off')
for i, (label, active) in enumerate([("Dashboard", True), ("Companii", False),
                                       ("Statistici", False), ("Comparare", False),
                                       ("Setări", False)]):
    color = ACCENT if active else MUTED
    nav_ax.text(0.22 + i * 0.13, 0.5, label, fontsize=10, color=color,
                va='center', ha='center',
                fontweight='bold' if active else 'normal')
nav_ax.text(0.05, 0.5, "💡 BankruptIQ", fontsize=12, color=TEXT,
            va='center', fontweight='bold')
nav_ax.text(0.95, 0.5, "⚙  Setări", fontsize=9, color=MUTED, va='center', ha='right')

# KPI cards
kpi_data = [
    ("COMPANII TOTALE", "12,847", ACCENT, "↑ +8.2% față de 2022"),
    ("RISC MARE", "3,241", DANGER, "25.2% din total"),
    ("RISC MEDIU", "4,109", WARNING, "32.0% din total"),
    ("RISC MIC", "5,497", SUCCESS, "42.8% din total"),
    ("SCOR MEDIU", "41.3", ACCENT, "Zona: gri (moderat)"),
]
for i, (label, val, color, sub) in enumerate(kpi_data):
    ax_k = fig.add_axes([0.01 + i * 0.198, 0.72, 0.185, 0.175])
    ax_k.set_facecolor(SURFACE)
    ax_k.set_xlim(0, 1); ax_k.set_ylim(0, 1); ax_k.axis('off')
    for sp in ['top','bottom','left','right']:
        ax_k.spines[sp].set_visible(True)
        ax_k.spines[sp].set_edgecolor(BORDER)
    ax_k.text(0.08, 0.82, label, fontsize=7.5, color=MUTED, fontweight='bold',
              transform=ax_k.transAxes)
    ax_k.text(0.08, 0.42, val, fontsize=26, color=color, fontweight='bold',
              transform=ax_k.transAxes)
    ax_k.text(0.08, 0.12, sub, fontsize=8, color=MUTED, transform=ax_k.transAxes)

# Chart stanga: bar per sector
ax1 = fig.add_axes([0.01, 0.08, 0.44, 0.60])
ax1.set_facecolor(SURFACE)
sectors = ["IT_Telecom", "Constructii", "Comert", "Productie", "Energie",
           "Transport", "Agricultura", "Turism", "Sanatate", "Diverse"]
high   = [12, 28, 22, 31, 18, 24, 35, 29, 8, 19]
medium = [28, 32, 38, 27, 35, 31, 28, 34, 22, 33]
low    = [60, 40, 40, 42, 47, 45, 37, 37, 70, 48]
x = np.arange(len(sectors))
w = 0.6
ax1.bar(x, high,   width=w, color=DANGER,  alpha=0.85, label="Risc Mare")
ax1.bar(x, medium, width=w, bottom=high, color=WARNING, alpha=0.85, label="Risc Mediu")
ax1.bar(x, low,    width=w, bottom=np.array(high)+np.array(medium),
        color=SUCCESS, alpha=0.85, label="Risc Mic")
ax1.set_xticks(x)
ax1.set_xticklabels(sectors, rotation=35, ha='right', fontsize=7.5, color=MUTED)
ax1.set_yticks([0, 25, 50, 75, 100])
ax1.set_yticklabels(["0%", "25%", "50%", "75%", "100%"], fontsize=8, color=MUTED)
ax1.set_title("Distribuția Riscului pe Sectoare (%)", fontsize=10,
              color=TEXT, pad=8, loc='left')
ax1.tick_params(colors=MUTED)
for sp in ax1.spines.values(): sp.set_edgecolor(BORDER)
ax1.legend(loc='upper right', fontsize=8, framealpha=0,
           labelcolor=TEXT, ncol=3)

# Chart dreapta: doughnut risc
ax2 = fig.add_axes([0.52, 0.35, 0.22, 0.42])
ax2.set_facecolor(BG); ax2.axis('off')
sizes = [25.2, 32.0, 42.8]
colors = [DANGER, WARNING, SUCCESS]
wedges, texts, autotexts = ax2.pie(
    sizes, colors=colors, autopct='%1.0f%%',
    startangle=90, pctdistance=0.75,
    wedgeprops=dict(width=0.5, edgecolor=BG, linewidth=2))
for at in autotexts:
    at.set_fontsize(11); at.set_color(TEXT); at.set_fontweight('bold')
ax2.text(0, 0, "RISC\nGLOBAL", fontsize=9, color=TEXT, ha='center', va='center',
         fontweight='bold')
ax2.set_title("Distribuție Globală", fontsize=10, color=TEXT, pad=6)
for label, color in zip(["Risc Mare", "Risc Mediu", "Risc Mic"], colors):
    pass

# Chart dreapta: trend linii
ax3 = fig.add_axes([0.52, 0.08, 0.47, 0.24])
ax3.set_facecolor(SURFACE)
years = [2017, 2019, 2020, 2022, 2023]
high_t = [28.1, 26.4, 31.2, 25.2, 24.8]
med_t  = [34.2, 33.1, 35.8, 32.0, 31.5]
ax3.plot(years, high_t, color=DANGER, lw=2.5, marker='o', markersize=5, label="Risc Mare %")
ax3.plot(years, med_t,  color=WARNING, lw=2.5, marker='s', markersize=5, label="Risc Mediu %")
ax3.set_title("Evoluție Risc 2017–2023", fontsize=10, color=TEXT, loc='left')
ax3.tick_params(colors=MUTED, labelsize=8)
for sp in ax3.spines.values(): sp.set_edgecolor(BORDER)
ax3.legend(fontsize=8, framealpha=0, labelcolor=TEXT)
ax3.set_ylim(20, 40)

# Legenda dreapta risc
ax4 = fig.add_axes([0.76, 0.35, 0.23, 0.42])
ax4.set_facecolor(BG); ax4.axis('off')
alerts = [
    ("🔴", "SC CONSTRUCTOTAL SRL",  "87.3", "Risc Mare"),
    ("🔴", "SC AGRO INVEST SA",     "79.1", "Risc Mare"),
    ("🟡", "SC TRANS RAPID SRL",    "58.4", "Risc Mediu"),
    ("🟡", "SC METAL PROD SA",      "51.2", "Risc Mediu"),
    ("🟢", "SC IT SOLUTIONS SRL",   "18.3", "Risc Mic"),
]
ax4.set_title("Alerte Recente", fontsize=10, color=TEXT, pad=6, loc='left')
for j, (dot, name, score, label) in enumerate(alerts):
    color = DANGER if "Mare" in label else (WARNING if "Mediu" in label else SUCCESS)
    ax4.text(0.02, 0.87 - j*0.185, dot, fontsize=10, va='center')
    ax4.text(0.15, 0.87 - j*0.185, name, fontsize=8, color=TEXT, va='center')
    ax4.text(0.15, 0.80 - j*0.185, f"Scor: {score}", fontsize=7.5, color=color, va='center')

plt.savefig(f"{OUT}/screen1_dashboard.png", dpi=120, bbox_inches='tight',
            facecolor=BG, edgecolor='none')
plt.close()
print("✓ screen1_dashboard.png")


# ══════════════════════════════════════════════════════════════════════
# SCREENSHOT 2 — Lista Companii
# ══════════════════════════════════════════════════════════════════════
fig = plt.figure(figsize=(16, 9), dpi=120)
fig.patch.set_facecolor(BG)
add_header(fig, "Lista Companii — Filtrare și Analiză",
           "Căutare după nume, sector, nivel de risc · Sortare după scor")

# Toolbar
ax_tb = fig.add_axes([0.01, 0.84, 0.98, 0.07])
ax_tb.set_facecolor(SURFACE2); ax_tb.axis('off')
ax_tb.set_xlim(0,1); ax_tb.set_ylim(0,1)
ax_tb.text(0.01, 0.55, "🔍  Caută companie...", fontsize=9, color=MUTED, va='center')
for sp in ax_tb.spines.values(): sp.set_edgecolor(BORDER); sp.set_visible(True)
# filter chips
chips = [("Toate sectoarele ▾", SURFACE2), ("Toate riscurile ▾", SURFACE2),
         ("2022 ▾", SURFACE2), ("  ⬇ Export CSV  ", SURFACE2)]
for ci, (chip, cbg) in enumerate(chips):
    ax_tb.add_patch(FancyBboxPatch((0.35 + ci*0.14, 0.15), 0.13, 0.7,
                                    boxstyle="round,pad=0.05",
                                    facecolor=SURFACE2, edgecolor=BORDER, lw=1))
    ax_tb.text(0.35 + ci*0.14 + 0.065, 0.55, chip, fontsize=8,
               color=TEXT, va='center', ha='center')
# Tabel companii
headers = ["Companie", "An", "Sector", "Scor Risc", "Nivel Risc",
           "Lichiditate", "Îndatorare", "ROA", "Acțiuni"]
companies = [
    ["SC CONSTRUCTOTAL SRL",   "2022", "Constructii",     "87.3", "RISC MARE",  "0.42", "1.89", "-12.4%", ""],
    ["SC AGRO INVEST SA",      "2022", "Agricultura",      "79.1", "RISC MARE",  "0.61", "1.54", "-8.2%",  ""],
    ["SC TRANS RAPID SRL",     "2022", "Transport",        "58.4", "RISC MEDIU", "1.12", "0.87", "3.1%",   ""],
    ["SC METAL PROD SA",       "2022", "Productie",        "51.2", "RISC MEDIU", "1.34", "0.72", "5.4%",   ""],
    ["SC IT SOLUTIONS SRL",    "2022", "IT_Telecom",       "18.3", "RISC MIC",   "2.87", "0.31", "18.7%",  ""],
    ["SC RETAIL PLUS SRL",     "2022", "Comert",           "22.1", "RISC MIC",   "2.43", "0.28", "14.2%",  ""],
    ["SC ENERGY GROUP SA",     "2022", "Energie",          "44.7", "RISC MEDIU", "1.08", "0.95", "2.8%",   ""],
    ["SC TURISM RESORT SRL",   "2022", "Turism_HoReCa",    "71.8", "RISC MARE",  "0.55", "1.34", "-5.9%",  ""],
    ["SC PHARMA DIST SA",      "2022", "Sanatate_Farma",   "14.2", "RISC MIC",   "3.12", "0.22", "21.3%",  ""],
    ["SC CONSTRUCT PRO SRL",   "2022", "Constructii",      "63.5", "RISC MEDIU", "0.89", "1.12", "1.2%",   ""],
]
ax_t = fig.add_axes([0.01, 0.05, 0.98, 0.78])
ax_t.set_facecolor(SURFACE); ax_t.axis('off')
ax_t.set_xlim(0, 1); ax_t.set_ylim(0, 1)
col_x  = [0.01, 0.22, 0.33, 0.44, 0.54, 0.65, 0.73, 0.81, 0.89]
# header row
ax_t.add_patch(FancyBboxPatch((0, 0.91), 1, 0.085,
                               boxstyle="square,pad=0", facecolor=SURFACE2, lw=0))
for ci, (hdr, hx) in enumerate(zip(headers, col_x)):
    ax_t.text(hx, 0.952, hdr.upper(), fontsize=7, color=MUTED,
              fontweight='bold', va='center')
# data rows
for ri, row in enumerate(companies):
    y_row = 0.87 - ri * 0.086
    if ri % 2 == 0:
        ax_t.add_patch(FancyBboxPatch((0, y_row - 0.005), 1, 0.082,
                                       boxstyle="square,pad=0",
                                       facecolor=SURFACE2, alpha=0.4, lw=0))
    for ci, (cell, cx) in enumerate(zip(row, col_x)):
        if ci == 4:  # Risk badge
            bc = DANGER if "MARE" in cell else (WARNING if "MEDIU" in cell else SUCCESS)
            ax_t.add_patch(FancyBboxPatch((cx, y_row + 0.008), 0.09, 0.055,
                                           boxstyle="round,pad=0.01",
                                           facecolor=bc + "33", edgecolor=bc, lw=0.8))
            ax_t.text(cx + 0.045, y_row + 0.035, cell, fontsize=7,
                      color=bc, ha='center', va='center', fontweight='bold')
        elif ci == 3:  # Scor
            sc = float(cell)
            sc_color = DANGER if sc > 66 else (WARNING if sc > 33 else SUCCESS)
            ax_t.text(cx, y_row + 0.03, cell, fontsize=9,
                      color=sc_color, va='center', fontweight='bold')
        elif ci == 8:  # Actiuni
            ax_t.add_patch(FancyBboxPatch((cx, y_row + 0.008), 0.075, 0.055,
                                           boxstyle="round,pad=0.01",
                                           facecolor=ACCENT + "33", edgecolor=ACCENT, lw=0.8))
            ax_t.text(cx + 0.037, y_row + 0.035, "Detalii →", fontsize=7.5,
                      color=ACCENT, ha='center', va='center')
        else:
            color = TEXT if ci == 0 else MUTED
            fs = 9 if ci == 0 else 8
            fw = 'bold' if ci == 0 else 'normal'
            ax_t.text(cx, y_row + 0.03, cell, fontsize=fs,
                      color=color, va='center', fontweight=fw)
for sp in ax_t.spines.values(): sp.set_edgecolor(BORDER); sp.set_visible(True)

plt.savefig(f"{OUT}/screen2_companies.png", dpi=120, bbox_inches='tight',
            facecolor=BG, edgecolor='none')
plt.close()
print("✓ screen2_companies.png")


# ══════════════════════════════════════════════════════════════════════
# SCREENSHOT 3 — Predicție Risc Companie
# ══════════════════════════════════════════════════════════════════════
fig = plt.figure(figsize=(16, 9), dpi=120)
fig.patch.set_facecolor(BG)
add_header(fig, "Predicție Risc — SC CONSTRUCTOTAL SRL",
           "Analiză detaliată · Scor blended RandomForest + Altman Z-score")

# Score gauge (simulat cu pie)
ax_g = fig.add_axes([0.01, 0.50, 0.25, 0.38])
ax_g.set_facecolor(BG); ax_g.axis('off')
theta = np.linspace(0, np.pi, 200)
ax_g.set_xlim(-1.3, 1.3); ax_g.set_ylim(-0.2, 1.3)
# arc background
ax_g.plot(np.cos(theta), np.sin(theta), color=BORDER, lw=18, solid_capstyle='round')
# arc fill to 87.3%
fill_end = np.pi * (1 - 0.873)
theta2 = np.linspace(fill_end, np.pi, 200)
ax_g.plot(np.cos(theta2), np.sin(theta2), color=DANGER, lw=18, solid_capstyle='round')
ax_g.text(0, 0.38, "87.3", fontsize=42, color=DANGER, fontweight='bold',
           ha='center', va='center')
ax_g.text(0, 0.10, "RISC MARE", fontsize=13, color=DANGER, fontweight='bold',
           ha='center')
ax_g.text(0, -0.05, "Probabilitate faliment: 91.2%", fontsize=9, color=MUTED, ha='center')
ax_g.text(0, 1.22, "Scor Risc Faliment", fontsize=10, color=TEXT, ha='center',
           fontweight='bold')

# Info companie
ax_info = fig.add_axes([0.01, 0.08, 0.25, 0.38])
ax_info.set_facecolor(SURFACE); ax_info.axis('off')
ax_info.set_xlim(0,1); ax_info.set_ylim(0,1)
ax_info.text(0.05, 0.93, "Detalii Companie", fontsize=10, color=TEXT, fontweight='bold')
details = [
    ("Companie:", "SC CONSTRUCTOTAL SRL"),
    ("An analizat:", "2022"),
    ("Sector:", "Constructii"),
    ("Altman Z':", "0.84 (Distress < 1.81)"),
    ("Scor RF:", "91.2%"),
    ("Scor Blended:", "87.3 / 100"),
]
for di, (k, v) in enumerate(details):
    yd = 0.82 - di * 0.14
    ax_info.text(0.05, yd, k, fontsize=8, color=MUTED)
    ax_info.text(0.45, yd, v, fontsize=8.5, color=TEXT, fontweight='bold')
for sp in ax_info.spines.values(): sp.set_edgecolor(BORDER); sp.set_visible(True)

# Feature importance (horizontal bars)
ax_fi = fig.add_axes([0.29, 0.08, 0.35, 0.82])
ax_fi.set_facecolor(SURFACE)
features = ["debt_ratio", "working_capital", "current_ratio",
            "return_on_assets", "net_profit_margin", "debt_to_equity",
            "asset_turnover", "interest_cov.", "quick_ratio", "return_on_eq."]
importances = [28.4, 18.1, 13.7, 11.2, 9.3, 7.8, 4.9, 3.4, 2.0, 1.2]
colors_fi = [DANGER if v > 20 else (WARNING if v > 10 else SUCCESS) for v in importances]
y_pos = np.arange(len(features))[::-1]
bars = ax_fi.barh(y_pos, importances, color=colors_fi, alpha=0.85,
                   height=0.65)
ax_fi.set_yticks(y_pos)
ax_fi.set_yticklabels(features, fontsize=9, color=MUTED)
ax_fi.set_xlabel("Importanță (%)", fontsize=9, color=MUTED)
ax_fi.set_title("Importanța Feature-urilor (RandomForest)", fontsize=10,
                color=TEXT, loc='left')
ax_fi.tick_params(colors=MUTED, labelsize=8)
for sp in ax_fi.spines.values(): sp.set_edgecolor(BORDER)
for bar, val in zip(bars, importances):
    ax_fi.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2,
               f"{val:.1f}%", va='center', fontsize=8, color=TEXT)

# Indicatori financiari radar / bars
ax_ind = fig.add_axes([0.67, 0.08, 0.32, 0.82])
ax_ind.set_facecolor(SURFACE)
ind_names = ["Current\nRatio", "Quick\nRatio", "Debt\nRatio", "D/E\nRatio",
             "NPM\n(%)", "ROA\n(%)"]
ind_vals  = [0.42, 0.31, 1.89, 4.21, -12.4, -8.3]
ind_bench = [1.5,  1.0,  0.5,  1.0,  5.0,   8.0]
x_ind = np.arange(len(ind_names))
ax_ind.bar(x_ind - 0.2, ind_vals, width=0.35, label="Companie",
           color=[DANGER if v < b else SUCCESS
                  for v, b in zip(ind_vals, ind_bench)], alpha=0.85)
ax_ind.bar(x_ind + 0.2, ind_bench, width=0.35, label="Benchmark",
           color=ACCENT, alpha=0.4)
ax_ind.set_xticks(x_ind)
ax_ind.set_xticklabels(ind_names, fontsize=8, color=MUTED)
ax_ind.axhline(0, color=BORDER, lw=1)
ax_ind.set_title("Indicatori vs. Benchmark Sector", fontsize=10,
                 color=TEXT, loc='left')
ax_ind.tick_params(colors=MUTED, labelsize=8)
for sp in ax_ind.spines.values(): sp.set_edgecolor(BORDER)
ax_ind.legend(fontsize=8, framealpha=0, labelcolor=TEXT)

plt.savefig(f"{OUT}/screen3_prediction.png", dpi=120, bbox_inches='tight',
            facecolor=BG, edgecolor='none')
plt.close()
print("✓ screen3_prediction.png")


# ══════════════════════════════════════════════════════════════════════
# SCREENSHOT 4 — Statistici Avansate
# ══════════════════════════════════════════════════════════════════════
fig = plt.figure(figsize=(16, 9), dpi=120)
fig.patch.set_facecolor(BG)
add_header(fig, "Statistici Avansate — Analiză Multidimensională",
           "Corelații indicatori · Distribuții · Evoluție temporală")

gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.35,
                        top=0.88, bottom=0.07, left=0.04, right=0.98)

# 1. Heatmap corelatie (simulat)
ax_hm = fig.add_subplot(gs[0, 0])
ax_hm.set_facecolor(SURFACE)
ind_short = ["CR", "QR", "DR", "D/E", "NPM", "ROA", "ROE", "AT", "WC", "IC"]
corr = np.array([
    [1.0,  0.89, -0.72, -0.68, 0.45,  0.51,  0.38, 0.29, 0.67, 0.41],
    [0.89, 1.0,  -0.68, -0.61, 0.41,  0.48,  0.35, 0.27, 0.61, 0.38],
    [-0.72,-0.68, 1.0,  0.82, -0.61, -0.65, -0.52,-0.34,-0.75,-0.48],
    [-0.68,-0.61, 0.82, 1.0,  -0.55, -0.59, -0.48,-0.31,-0.68,-0.44],
    [0.45, 0.41, -0.61,-0.55,  1.0,   0.88,  0.75, 0.42, 0.58, 0.61],
    [0.51, 0.48, -0.65,-0.59,  0.88,  1.0,   0.82, 0.51, 0.63, 0.67],
    [0.38, 0.35, -0.52,-0.48,  0.75,  0.82,  1.0,  0.44, 0.52, 0.58],
    [0.29, 0.27, -0.34,-0.31,  0.42,  0.51,  0.44, 1.0,  0.38, 0.33],
    [0.67, 0.61, -0.75,-0.68,  0.58,  0.63,  0.52, 0.38, 1.0,  0.51],
    [0.41, 0.38, -0.48,-0.44,  0.61,  0.67,  0.58, 0.33, 0.51, 1.0],
])
im = ax_hm.imshow(corr, cmap='RdYlGn', vmin=-1, vmax=1, aspect='auto')
ax_hm.set_xticks(range(10)); ax_hm.set_yticks(range(10))
ax_hm.set_xticklabels(ind_short, fontsize=7, color=MUTED)
ax_hm.set_yticklabels(ind_short, fontsize=7, color=MUTED)
ax_hm.set_title("Matrice Corelație Indicatori", fontsize=9, color=TEXT, pad=6)
ax_hm.tick_params(colors=MUTED)

# 2. Distribution debt_ratio
ax_dist = fig.add_subplot(gs[0, 1])
ax_dist.set_facecolor(SURFACE)
np.random.seed(42)
healthy  = np.random.beta(2, 5, 800) * 1.5
bankrupt = np.random.beta(5, 2, 200) * 3 + 0.5
ax_dist.hist(healthy,  bins=35, color=SUCCESS, alpha=0.7, label="Sănătoase", density=True)
ax_dist.hist(bankrupt, bins=25, color=DANGER,  alpha=0.7, label="Falimentate", density=True)
ax_dist.axvline(x=1.0, color=WARNING, lw=2, linestyle='--', label="Prag risc (DR=1)")
ax_dist.set_title("Distribuție Debt Ratio", fontsize=9, color=TEXT)
ax_dist.tick_params(colors=MUTED, labelsize=8)
for sp in ax_dist.spines.values(): sp.set_edgecolor(BORDER)
ax_dist.legend(fontsize=8, framealpha=0, labelcolor=TEXT)

# 3. Scatter ROA vs Current Ratio
ax_sc = fig.add_subplot(gs[0, 2])
ax_sc.set_facecolor(SURFACE)
np.random.seed(42)
n_h = 400; n_b = 100
roa_h = np.random.normal(8, 5, n_h)
cr_h  = np.random.normal(2.1, 0.8, n_h)
roa_b = np.random.normal(-8, 6, n_b)
cr_b  = np.random.normal(0.7, 0.4, n_b)
ax_sc.scatter(cr_h, roa_h, color=SUCCESS, alpha=0.5, s=12, label="Sănătoase")
ax_sc.scatter(cr_b, roa_b, color=DANGER, alpha=0.6, s=15, label="Falimentate")
ax_sc.axhline(0, color=BORDER, lw=1); ax_sc.axvline(1, color=WARNING, lw=1.5, ls='--')
ax_sc.set_xlabel("Current Ratio", fontsize=8, color=MUTED)
ax_sc.set_ylabel("ROA (%)", fontsize=8, color=MUTED)
ax_sc.set_title("ROA vs. Current Ratio", fontsize=9, color=TEXT)
ax_sc.tick_params(colors=MUTED, labelsize=7)
for sp in ax_sc.spines.values(): sp.set_edgecolor(BORDER)
ax_sc.legend(fontsize=7.5, framealpha=0, labelcolor=TEXT)

# 4. Box plot pe sectoare
ax_box = fig.add_subplot(gs[1, :2])
ax_box.set_facecolor(SURFACE)
sectors_b = ["IT", "Constructii", "Comert", "Productie", "Energie", "Transport"]
data_box = [np.random.normal(m, 15, 200) for m in [22, 54, 38, 48, 41, 44]]
bp = ax_box.boxplot(data_box, patch_artist=True, notch=False,
                     medianprops=dict(color=TEXT, lw=2))
colors_box = [SUCCESS, DANGER, WARNING, WARNING, ACCENT, ACCENT]
for patch, color in zip(bp['boxes'], colors_box):
    patch.set_facecolor(color); patch.set_alpha(0.5)
for element in ['whiskers', 'caps', 'fliers']:
    plt.setp(bp[element], color=MUTED)
ax_box.set_xticklabels(sectors_b, fontsize=9, color=MUTED)
ax_box.set_ylabel("Scor Risc", fontsize=9, color=MUTED)
ax_box.set_title("Distribuție Scoruri Risc pe Sectoare", fontsize=9, color=TEXT)
ax_box.tick_params(colors=MUTED, labelsize=8)
for sp in ax_box.spines.values(): sp.set_edgecolor(BORDER)

# 5. Altman Z zones
ax_z = fig.add_subplot(gs[1, 2])
ax_z.set_facecolor(SURFACE)
z_vals = np.random.normal(1.8, 1.2, 500)
ax_z.hist(z_vals, bins=40, color=ACCENT, alpha=0.7, edgecolor=BORDER)
ax_z.axvline(1.81, color=DANGER,  lw=2.5, linestyle='--', label="Distress < 1.81")
ax_z.axvline(2.99, color=SUCCESS, lw=2.5, linestyle='--', label="Safe > 2.99")
ax_z.fill_betweenx([0, 60], 1.81, 2.99, color=WARNING, alpha=0.1)
ax_z.set_xlabel("Altman Z-score", fontsize=8, color=MUTED)
ax_z.set_title("Distribuție Altman Z-score", fontsize=9, color=TEXT)
ax_z.tick_params(colors=MUTED, labelsize=7)
for sp in ax_z.spines.values(): sp.set_edgecolor(BORDER)
ax_z.legend(fontsize=7.5, framealpha=0, labelcolor=TEXT)

plt.savefig(f"{OUT}/screen4_stats.png", dpi=120, bbox_inches='tight',
            facecolor=BG, edgecolor='none')
plt.close()
print("✓ screen4_stats.png")


# ══════════════════════════════════════════════════════════════════════
# SCREENSHOT 5 — Landing Page
# ══════════════════════════════════════════════════════════════════════
fig = plt.figure(figsize=(16, 9), dpi=120)
fig.patch.set_facecolor("#06070d")

ax = fig.add_axes([0, 0, 1, 1])
ax.set_facecolor("#06070d"); ax.axis('off')
ax.set_xlim(0, 1); ax.set_ylim(0, 1)

# gradient background circles
for r, a in [(0.4, 0.04), (0.3, 0.07), (0.2, 0.1)]:
    ax.add_patch(plt.Circle((0.5, 0.55), r, color=ACCENT, alpha=a))

ax.text(0.5, 0.88, "💡 BankruptIQ", fontsize=16, color=TEXT,
        ha='center', va='center', fontweight='bold')
ax.text(0.5, 0.75, "Predicție Inteligentă a Riscului\nde Faliment al Companiilor",
        fontsize=28, color=TEXT, ha='center', va='center', fontweight='bold',
        linespacing=1.4)
ax.text(0.5, 0.60,
        "Sistem bazat pe Machine Learning și date financiare oficiale\n"
        "de la Ministerul Finanțelor · Acoperire națională · 80.000+ companii",
        fontsize=13, color=MUTED, ha='center', va='center', linespacing=1.5)

# CTA buttons
ax.add_patch(FancyBboxPatch((0.35, 0.44), 0.13, 0.07,
                             boxstyle="round,pad=0.01",
                             facecolor=ACCENT, lw=0))
ax.text(0.415, 0.475, "→  Accesează Dashboard", fontsize=11,
        color='white', ha='center', va='center', fontweight='bold')

ax.add_patch(FancyBboxPatch((0.51, 0.44), 0.13, 0.07,
                             boxstyle="round,pad=0.01",
                             facecolor='none', edgecolor=BORDER, lw=1.5))
ax.text(0.575, 0.475, "📖  Documentație", fontsize=11,
        color=MUTED, ha='center', va='center')

# Feature cards de jos
features_lp = [
    ("🤖", "Machine Learning", "RandomForest + Altman Z-score\nPrecizie >88%"),
    ("🗄️", "Date Reale MF", "Ministerul Finanțelor\n80.000+ companii 2017–2023"),
    ("📊", "Dashboard Live", "Vizualizări interactive\nFiltru sector/risc/an"),
    ("⚡", "API REST", "FastAPI + MongoDB\nScalabilitate ridicată"),
]
for fi, (icon, title, desc) in enumerate(features_lp):
    fx = 0.06 + fi * 0.235
    ax.add_patch(FancyBboxPatch((fx, 0.08), 0.215, 0.30,
                                 boxstyle="round,pad=0.01",
                                 facecolor=SURFACE, edgecolor=BORDER, lw=1))
    ax.text(fx + 0.108, 0.345, icon, fontsize=20, ha='center', va='center')
    ax.text(fx + 0.108, 0.30, title, fontsize=11, color=TEXT,
            ha='center', va='center', fontweight='bold')
    ax.text(fx + 0.108, 0.20, desc, fontsize=9, color=MUTED,
            ha='center', va='center', linespacing=1.4)

plt.savefig(f"{OUT}/screen5_landing.png", dpi=120, bbox_inches='tight',
            facecolor="#06070d", edgecolor='none')
plt.close()
print("✓ screen5_landing.png")

print(f"\n✅ Toate screenshots salvate în: {OUT}")
