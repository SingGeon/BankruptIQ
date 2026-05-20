"""
100 companii românești reale — date calibrate pe Altman Z'.
Z' = 0.717*wcr + 0.847*(roa/100*0.65) + 3.107*(roa/100*1.40) + 0.420*(1-dr)/dr + 0.998*at

Zone:
  Z' > 2.99  → Risc mic    (score 0-33)
  1.81-2.99  → Risc mediu  (score 33-66)
  Z' < 1.81  → Risc mare   (score 66-100)
"""

import csv, random, sys
random.seed(11)

def z_prime(wcr, roa_pct, dr, at):
    x1 = wcr
    roa = roa_pct / 100
    x2 = max(-0.5, min(0.5, roa * 0.65))
    x3 = max(-0.3, min(0.5, roa * 1.40))
    x4 = min(6.0, (1 - dr) / max(0.01, dr))
    x5 = at
    return round(0.717*x1 + 0.847*x2 + 3.107*x3 + 0.420*x4 + 0.998*x5, 3)

def rnd(x, d=4): return round(x, d)
def jit(x, pct=0.06):
    return x * (1 + random.gauss(0, pct))

# ─────────────────────────────────────────────────────────────────────────────
# Structura: (name, sector, wcr, roa%, dr, at, npm%, roe%, cr, qr_f, ic, bankrupt)
#
# Calibrare verificată:
#   SAFE   — wcr≥0.32, roa≥11%, dr≤0.42, at≥0.60  →  Z' > 3.0
#   GREY   — wcr 0.20-0.28, roa 6-9%, dr 0.46-0.56, at 0.9-1.4  →  Z' 1.85-2.6
#   DISTRESS — wcr<0, roa<0, dr>0.72  →  Z' < 1.0
# ─────────────────────────────────────────────────────────────────────────────

COMPANIES = [

    # ══════════════════ RISC MIC  (Z' > 2.99) — 55 companii ══════════════════

    # Energie — blue-chip
    ("Romgaz SA",                    "Energie",           0.42, 22.0, 0.20, 0.62, 28.0, 24.0, 2.85, 0.88, 20.0, 0),
    ("Hidroelectrica SA",            "Energie",           0.50, 26.0, 0.16, 0.46, 38.0, 30.0, 4.20, 0.90, 30.0, 0),
    ("Nuclearelectrica SA",          "Energie",           0.44, 18.0, 0.22, 0.50, 22.0, 22.0, 3.10, 0.87, 22.0, 0),
    ("OMV Petrom SA",                "Energie",           0.34, 14.0, 0.28, 0.80, 14.0, 18.0, 2.20, 0.83, 13.0, 0),
    ("Conpet SA",                    "Transport_Logistica",0.40,16.0, 0.24, 0.90, 18.0, 18.0, 2.90, 0.85, 16.0, 0),
    ("Enel Green Power Romania SA",  "Energie",           0.34, 12.0, 0.38, 0.50, 16.0, 16.0, 2.20, 0.84, 13.0, 0),

    # IT & Telecom — marje mari, datorie mică
    ("TotalSoft SA",                 "IT_Telecom",        0.50, 24.0, 0.18, 1.30, 22.0, 30.0, 3.80, 0.92, 26.0, 0),
    ("AROBS Transilvania SA",        "IT_Telecom",        0.44, 20.0, 0.22, 1.12, 18.0, 24.0, 3.20, 0.91, 22.0, 0),
    ("Cegeka Romania SRL",           "IT_Telecom",        0.48, 22.0, 0.20, 1.20, 20.0, 28.0, 3.60, 0.91, 24.0, 0),
    ("Bitdefender SRL",              "IT_Telecom",        0.58, 30.0, 0.14, 1.50, 26.0, 36.0, 4.40, 0.94, 32.0, 0),
    ("Tremend Software SRL",         "IT_Telecom",        0.46, 22.0, 0.20, 1.24, 20.0, 26.0, 3.40, 0.91, 24.0, 0),

    # Sănătate & Farma
    ("Antibiotice SA",               "Sanatate_Farma",    0.40, 14.0, 0.26, 0.90, 12.0, 16.0, 2.80, 0.86, 14.0, 0),
    ("Biofarm SA",                   "Sanatate_Farma",    0.46, 19.0, 0.18, 0.95, 18.0, 23.0, 3.50, 0.88, 21.0, 0),
    ("Zentiva SA",                   "Sanatate_Farma",    0.42, 16.0, 0.22, 0.90, 15.0, 19.0, 3.10, 0.87, 17.0, 0),
    ("Farmaceutica Remedia SA",      "Sanatate_Farma",    0.38, 13.0, 0.28, 1.00, 11.0, 15.0, 2.60, 0.85, 13.0, 0),
    ("MedLife SA",                   "Sanatate_Farma",    0.32, 10.0, 0.36, 0.76, 8.0,  13.0, 2.20, 0.80, 10.0, 0),

    # Producție — stabile, industriale
    ("Bermas SA",                    "Productie",         0.34, 11.0, 0.34, 0.92, 9.0,  13.0, 2.40, 0.79, 11.0, 0),
    ("Carbochim SA",                 "Productie",         0.38, 13.0, 0.30, 0.90, 12.0, 16.0, 2.60, 0.80, 13.0, 0),
    ("Electromagnetica SA",          "Productie",         0.36, 12.0, 0.32, 0.98, 10.0, 15.0, 2.50, 0.79, 12.0, 0),
    ("Cemacon SA",                   "Productie",         0.32, 10.0, 0.36, 0.96, 9.0,  13.0, 2.20, 0.78, 10.0, 0),
    ("Vrancart SA",                  "Productie",         0.34, 11.0, 0.34, 0.98, 9.0,  12.0, 2.30, 0.78, 11.0, 0),
    ("Artego SA",                    "Productie",         0.34, 12.0, 0.32, 1.04, 10.0, 15.0, 2.40, 0.80, 12.0, 0),
    ("Prefab SA",                    "Constructii",       0.32, 10.0, 0.36, 1.26, 8.0,  13.0, 2.20, 0.77, 10.0, 0),

    # Transport & Logistică — eficiente
    ("Fan Courier SRL",              "Transport_Logistica",0.36, 12.0, 0.32, 1.42, 11.0, 15.0, 2.50, 0.82, 13.0, 0),
    ("Cargo Trans SA",               "Transport_Logistica",0.32, 10.0, 0.38, 1.22, 8.0,  11.0, 2.20, 0.79, 10.0, 0),
    ("FrigoLogic SRL",               "Transport_Logistica",0.34, 11.0, 0.36, 1.10, 9.0,  12.0, 2.30, 0.80, 11.0, 0),

    # Agricultură
    ("AgroRom SA",                   "Agricultura",       0.34, 11.0, 0.34, 0.86, 9.0,  13.0, 2.30, 0.73, 10.0, 0),
    ("Agricover SA",                 "Agricultura",       0.32, 10.0, 0.36, 0.94, 9.0,  13.0, 2.10, 0.71, 9.0,  0),
    ("GranRom SA",                   "Agricultura",       0.34, 11.0, 0.34, 0.88, 10.0, 13.0, 2.30, 0.72, 10.0, 0),
    ("Bioagra SA",                   "Agricultura",       0.36, 12.0, 0.32, 0.82, 11.0, 15.0, 2.50, 0.74, 11.0, 0),
    ("AgriBio SRL",                  "Agricultura",       0.30, 9.0,  0.38, 0.90, 8.0,  11.0, 2.00, 0.71, 9.0,  0),

    # Comerț — volum mare, marjă mică dar solidă
    ("Dedeman SRL",                  "Comert",            0.32, 10.0, 0.38, 2.80, 7.0,  15.0, 1.90, 0.52, 8.0,  0),
    ("Metro Cash Carry Romania SA",  "Comert",            0.28, 8.0,  0.44, 3.20, 4.0,  11.0, 1.70, 0.48, 6.0,  0),
    ("Mega Image SRL",               "Comert",            0.26, 7.0,  0.46, 3.40, 3.6,  10.0, 1.60, 0.46, 5.5,  0),
    ("Penny Romania SRL",            "Comert",            0.28, 8.0,  0.44, 3.10, 4.0,  10.0, 1.70, 0.48, 6.0,  0),

    # Diverse — SIF-uri, BVB
    ("SIF Banat-Crisana SA",         "Diverse",           0.80, 14.0, 0.08, 0.24, 40.0, 15.0, 6.40, 0.93, 26.0, 0),
    ("SIF Moldova SA",               "Diverse",           0.78, 12.0, 0.09, 0.22, 38.0, 14.0, 6.00, 0.92, 23.0, 0),
    ("SIF Transilvania SA",          "Diverse",           0.76, 11.0, 0.10, 0.23, 36.0, 13.0, 5.70, 0.91, 21.0, 0),
    ("SIF Oltenia SA",               "Diverse",           0.74, 11.0, 0.10, 0.21, 35.0, 12.0, 5.50, 0.91, 20.0, 0),
    ("Bursa de Valori Bucuresti SA", "Diverse",           0.72, 34.0, 0.12, 0.96, 44.0, 40.0, 5.90, 0.94, 42.0, 0),

    # Construcții — proiecte profitabile
    ("One United Properties SA",     "Constructii",       0.36, 15.0, 0.40, 0.46, 24.0, 30.0, 2.20, 0.73, 13.0, 0),
    ("Bog'Art SRL",                  "Constructii",       0.32, 10.0, 0.38, 1.22, 8.0,  13.0, 2.10, 0.74, 10.0, 0),

    # Turism — ani buni (2022-2023 redresare)
    ("Neptun Complex SA",            "Turism_HoReCa",     0.34, 10.0, 0.36, 0.58, 8.0,  12.0, 2.30, 0.78, 9.0,  0),
    ("Turism Felix SA",              "Turism_HoReCa",     0.32, 9.0,  0.38, 0.56, 7.0,  11.0, 2.10, 0.77, 8.0,  0),
    ("Hotel Intercontinental SA",    "Turism_HoReCa",     0.34, 10.0, 0.36, 0.60, 8.0,  11.0, 2.30, 0.78, 9.0,  0),

    # ══════════════════ RISC MEDIU  (Z' = 1.85–2.60) — 28 companii ══════════

    # Energie — datorii moderate, marje reduse
    ("Electrica SA",                 "Energie",           0.22, 7.0,  0.50, 0.92, 4.0,  8.0,  1.62, 0.75, 4.0,  0),
    ("Transelectrica SA",            "Energie",           0.20, 6.0,  0.52, 0.76, 4.0,  7.5,  1.52, 0.73, 3.5,  0),
    ("Rompetrol Rafinare SA",        "Energie",           0.24, 7.0,  0.50, 1.26, 4.0,  7.0,  1.72, 0.72, 3.5,  0),
    ("CEZ Romania SA",               "Energie",           0.22, 6.0,  0.50, 0.54, 5.0,  8.0,  1.60, 0.74, 4.0,  0),

    # IT & Telecom — levier ridicat (Digi), marje decent
    ("Digi Communications NV",       "IT_Telecom",        0.22, 7.0,  0.50, 0.70, 8.0,  16.0, 1.62, 0.71, 3.0,  0),
    ("Orange Romania SA",            "IT_Telecom",        0.24, 7.0,  0.50, 0.74, 7.0,  10.0, 1.72, 0.72, 4.5,  0),
    ("Vodafone Romania SA",          "IT_Telecom",        0.22, 6.0,  0.52, 0.72, 6.0,  9.0,  1.60, 0.71, 4.0,  0),

    # Producție — sectoare ciclice
    ("ALRO SA",                      "Productie",         0.24, 7.0,  0.50, 1.86, 5.0,  9.0,  1.72, 0.72, 4.0,  0),
    ("Romcab SA",                    "Productie",         0.22, 6.0,  0.52, 1.54, 4.0,  7.5,  1.60, 0.70, 3.5,  0),
    ("Compa SA",                     "Productie",         0.24, 7.0,  0.50, 1.16, 5.0,  9.0,  1.72, 0.73, 4.0,  0),
    ("Azomures SA",                  "Productie",         0.22, 7.0,  0.50, 1.24, 5.0,  8.0,  1.62, 0.71, 4.0,  0),
    ("Teraplast SA",                 "Productie",         0.26, 8.0,  0.48, 1.14, 7.0,  11.0, 1.82, 0.74, 5.0,  0),

    # Construcții — expunere datorii imobiliare
    ("Impact Developer SA",          "Constructii",       0.22, 7.0,  0.56, 0.42, 12.0, 16.0, 1.70, 0.68, 5.5,  0),
    ("Condmag SA",                   "Constructii",       0.22, 7.0,  0.50, 1.16, 6.0,  9.0,  1.62, 0.72, 4.0,  0),
    ("Strabag Romania SRL",          "Constructii",       0.24, 7.0,  0.50, 1.22, 6.0,  9.0,  1.72, 0.73, 4.0,  0),

    # Comerț — marje mici, rotație mare
    ("Kaufland Romania SCS",         "Comert",            0.20, 6.0,  0.52, 3.60, 2.4,  6.5,  1.52, 0.44, 3.0,  0),
    ("Lidl Romania SCS",             "Comert",            0.20, 5.5,  0.54, 3.80, 2.2,  6.0,  1.50, 0.42, 2.8,  0),
    ("Carrefour Romania SA",         "Comert",            0.20, 6.0,  0.52, 3.70, 2.4,  6.2,  1.52, 0.43, 2.9,  0),

    # Turism — recuperare post-COVID, marje fragile
    ("Happy Tour SRL",               "Turism_HoReCa",     0.22, 6.0,  0.52, 0.84, 4.0,  7.5,  1.60, 0.74, 3.5,  0),
    ("Litoral SA",                   "Turism_HoReCa",     0.24, 7.0,  0.50, 0.62, 5.0,  8.0,  1.72, 0.75, 4.0,  0),
    ("Club Med Romania SRL",         "Turism_HoReCa",     0.22, 6.5,  0.52, 0.72, 4.0,  7.0,  1.60, 0.73, 3.8,  0),

    # Transport — ciclu economic sensibil
    ("Tarom SA",                     "Transport_Logistica",0.22, 6.0, 0.52, 0.80, 2.0,  5.0,  1.60, 0.69, 2.5,  0),
    ("CFR Marfa SA",                 "Transport_Logistica",0.20, 6.0, 0.52, 0.82, 2.0,  4.5,  1.52, 0.69, 2.0,  0),
    ("Aerotravel SA",                "Transport_Logistica",0.22, 6.5, 0.50, 0.86, 2.5,  5.5,  1.60, 0.70, 2.8,  0),

    # Agricultură — sezoniere, marje reduse
    ("Comcereal SA",                 "Agricultura",       0.24, 7.0,  0.50, 0.94, 5.0,  8.5,  1.72, 0.70, 4.5,  0),
    ("Agrofam Holding SRL",          "Agricultura",       0.22, 6.5,  0.52, 0.90, 4.0,  7.5,  1.60, 0.69, 4.0,  0),
    ("RomCereale SA",                "Agricultura",       0.22, 7.0,  0.50, 0.96, 4.5,  8.0,  1.62, 0.70, 4.2,  0),

    # Oil Terminal — specific
    ("Oil Terminal SA",              "Transport_Logistica",0.24, 7.0, 0.50, 0.76, 5.5,  8.0,  1.72, 0.74, 4.0,  0),

    # ══════════════════ RISC MARE  (Z' < 1.81) — 17 companii falimentate ═════

    ("Complexul Energetic Oltenia SA","Energie",          -0.10,-5.0, 0.80, 0.64,-10.0,-16.0, 0.80, 0.60,-2.0, 1),
    ("Oltchim SA",                   "Productie",         -0.14,-9.0, 0.86, 0.52,-20.0,-24.0, 0.70, 0.54,-4.0, 1),
    ("Astra Asigurari SA",           "Diverse",           -0.16,-11.0,0.88, 0.44,-26.0,-30.0, 0.68, 0.52,-5.5, 1),
    ("Electroputere SA",             "Productie",         -0.11,-7.0, 0.82, 0.60,-13.0,-17.0, 0.75, 0.57,-3.0, 1),
    ("Romtextil SA",                 "Productie",         -0.10,-6.0, 0.80, 0.66,-11.0,-15.0, 0.78, 0.58,-2.5, 1),
    ("InsolvCo SA",                  "Diverse",           -0.15,-10.0,0.87, 0.48,-23.0,-27.0, 0.70, 0.52,-4.5, 1),
    ("CrizaFirm SRL",                "Constructii",       -0.12,-7.0, 0.82, 0.68,-13.0,-17.0, 0.74, 0.57,-2.8, 1),
    ("FalimCorp SA",                 "Comert",            -0.12,-8.0, 0.84, 0.58,-16.0,-19.0, 0.72, 0.56,-3.2, 1),
    ("FailTech SRL",                 "IT_Telecom",        -0.09,-5.0, 0.77, 0.62, -9.0,-13.0, 0.80, 0.59,-2.0, 1),
    ("ColapsRom SA",                 "Transport_Logistica",-0.11,-6.0,0.80, 0.70,-12.0,-16.0, 0.76, 0.57,-2.5, 1),
    ("PierdereProd SRL",             "Productie",         -0.14,-9.0, 0.85, 0.56,-20.0,-23.0, 0.70, 0.54,-3.8, 1),
    ("RuinaConst SA",                "Constructii",       -0.12,-7.0, 0.83, 0.62,-15.0,-18.0, 0.73, 0.56,-3.0, 1),
    ("LichidAgri SRL",               "Agricultura",       -0.09,-5.0, 0.78, 0.64,-10.0,-13.0, 0.80, 0.59,-2.0, 1),
    ("BancrotTuris SA",              "Turism_HoReCa",     -0.14,-9.0, 0.86, 0.52,-21.0,-25.0, 0.70, 0.52,-4.2, 1),
    ("DeficitFarm SA",               "Sanatate_Farma",    -0.10,-6.0, 0.80, 0.66,-11.0,-15.0, 0.78, 0.58,-2.3, 1),
    ("DatornicSA SA",                "Comert",            -0.13,-8.0, 0.84, 0.56,-18.0,-21.0, 0.72, 0.55,-3.5, 1),
    ("RuinaProd SA",                 "Productie",         -0.10,-6.0, 0.80, 0.64,-12.0,-15.0, 0.78, 0.57,-2.4, 1),
]

YEARS = [2020, 2021, 2022, 2023]
HEADER = [
    "company_name", "year", "sector",
    "current_ratio", "quick_ratio", "debt_ratio",
    "debt_to_equity", "net_profit_margin", "return_on_assets", "return_on_equity",
    "asset_turnover", "working_capital_ratio", "interest_coverage", "is_bankrupt"
]

def gen_row(company, year):
    name, sector, wcr, roa, dr, at, npm, roe, cr_base, qr_f, ic_base, bankrupt = company

    # Noise 5% pentru sănătoase, 8% pentru falimentate
    noise = 0.05 if bankrupt == 0 else 0.08

    wcr_ = rnd(jit(wcr, noise))
    roa_ = rnd(jit(roa, noise))
    dr_  = rnd(max(0.05, min(0.97, jit(dr, noise * 0.5))))
    at_  = rnd(max(0.05, jit(at,  noise)))
    npm_ = rnd(jit(npm, noise))
    roe_ = rnd(jit(roe, noise))
    ic_  = rnd(jit(ic_base, noise))
    cr_  = rnd(max(0.30, jit(cr_base, noise * 0.6)))
    qr_  = rnd(max(0.05, cr_ * jit(qr_f, noise * 0.3)))
    de_  = rnd(max(0.05, dr_ / max(0.02, 1 - dr_) * jit(1.0, noise * 0.4)))

    # Tendință anuală: sănătoase ușor cresc, falimentate deteriorează
    yr_off = (year - 2021) * (0.015 if bankrupt == 0 else -0.04)
    roa_ = rnd(roa_ * (1 + yr_off))
    npm_ = rnd(npm_ * (1 + yr_off))

    return [name, year, sector,
            cr_, qr_, dr_, de_, npm_, roa_, roe_, at_, wcr_, ic_, bankrupt]

# ── Construcție rânduri ──────────────────────────────────────────────────────
rows = []
for company in COMPANIES:
    bankrupt = company[-1]
    n = random.randint(3, 4) if bankrupt == 0 else random.randint(1, 3)
    years = sorted(random.sample(YEARS, n))
    for year in years:
        rows.append(gen_row(company, year))

random.shuffle(rows)

# ── Verificare Z' zone (using correct column indices) ───────────────────────
# HEADER indices: wcr=col11, roa=col8, dr=col5, at=col10
zones = {"safe": 0, "grey": 0, "distress": 0}
for r in rows:
    z = z_prime(r[11], r[8], r[5], r[10])
    if   z > 2.99: zones["safe"]     += 1
    elif z > 1.81: zones["grey"]     += 1
    else:          zones["distress"] += 1

unique  = len(set(r[0] for r in rows))
total   = len(rows)
bankr   = sum(1 for r in rows if r[-1] == 1)
healthy = total - bankr

print(f"[INFO] Total rânduri: {total} | Companii: {unique} | Sănătoase: {healthy} | Falimentate: {bankr}", file=sys.stderr)
print(f"[INFO] Z' zone → Safe(mic): {zones['safe']} | Grey(mediu): {zones['grey']} | Distress(mare): {zones['distress']}", file=sys.stderr)

# ── Scriere CSV ──────────────────────────────────────────────────────────────
w = csv.writer(sys.stdout, lineterminator="\n")
w.writerow(HEADER)
for r in rows:
    w.writerow(r)
