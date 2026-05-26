# BankruptIQ — Sistem de Analiză a Riscului de Faliment

Platformă completă de monitorizare și predicție a riscului de faliment pentru companii românești. Combină **Altman Z-Score**, **Ohlson O-Score** și un model **Random Forest** antrenat pe date reale, cu un dashboard interactiv care acoperă zeci de mii de companii.

---

## Ce face aplicația

BankruptIQ analizează indicatorii financiari ai companiilor și calculează în timp real probabilitatea de faliment pe 12 și 36 de luni. Sistemul procesează date istorice (mai mulți ani de exerciții financiare), detectează semnale de alertă timpurie și prezintă totul într-un dashboard glassmorphism cu grafice live.

**Funcționalități principale:**

- **Dashboard live** — Z-Score animat, metrici pe perioade 1Y/3Y/5Y, glob 3D interactiv cu companiile colorate după risc
- **Profil companie** — evoluție Z-Score pe 60 luni, predicție ML 12L/36L, comparație cu media sectorului, benchmark indicatori
- **Comparator** — selectezi până la 4 companii din lista completă, grafice Z-Score suprapuse, tabel metrici cu ★ pe cel mai bun
- **Statistici macro** — indicatori BNR/INSSE, timeline falimente lunare ONRC/UNPIR, distribuție Z-Score, matrice trimestrială sectorială
- **Alerte** — generate automat pentru companii cu semnale de distress (levier ridicat, marjă negativă, current ratio sub 1)
- **Scoruri triple** — Altman Z-Score (formula privată 1983), Ohlson O-Score, Random Forest ML blended

---

## Arhitectură

```
BankruptIQ/
├── backend/
│   ├── main.py                  # FastAPI: CORS, routere, fișiere statice, indexuri MongoDB
│   ├── database.py              # Conexiune MongoDB async (motor)
│   ├── models.py                # Modele Pydantic
│   ├── routes/
│   │   ├── companies.py         # CRUD + /unique + /aggregate-stats + /forecast
│   │   ├── ml_routes.py         # Antrenare, predicție, forecast 12L/36L
│   │   ├── upload.py            # Import CSV cu validare
│   │   ├── alerts.py            # Generare și listare alerte
│   │   └── macro.py             # Indicatori macro BNR/INSSE
│   ├── ml/
│   │   ├── features.py          # Coloanele folosite de model
│   │   ├── trainer.py           # Pipeline Random Forest + metrici AUC/F1
│   │   └── predictor.py         # Scor 0-100 + etichetare risc
│   └── utils/
│       ├── logger.py            # Logging structurat
│       └── validators.py        # Validare CSV
├── frontend/
│   ├── dashboard.html           # Dashboard SPA (entry point)
│   ├── index.html               # Landing page marketing
│   ├── landing/
│   │   └── landing.jsx          # Pagina principală React
│   ├── src/
│   │   ├── app.jsx              # Componenta App + navigare + tabel companii
│   │   ├── data.jsx             # Layer date: fetch API → window.BIQ_DATA
│   │   ├── theme.jsx            # Sistem teme: glassmorphism/terminal/fintech/editorial
│   │   ├── hero.jsx             # Hero Command Bridge (Z-Score animat live)
│   │   ├── charts.jsx           # LineChart, Sparkline, Donut, HeatmapMatrix etc.
│   │   ├── compare.jsx          # Comparator + ComparatorPage cu picker
│   │   ├── profile.jsx          # Drawer profil companie + predicție ML
│   │   ├── stats.jsx            # Pagina Statistici (macro, falimente, sectoare)
│   │   ├── globe.jsx            # Glob 3D interactiv cu companii
│   │   └── loading.jsx          # Loading screen animat (glob 3D + progress)
│   └── tweaks-panel.jsx         # Panel configurare estetică (teme, densitate)
├── data/                        # CSV-uri cu date financiare
├── models/                      # Modele ML serializate (.pkl)
├── requirements.txt
└── .env
```

> **Frontend fără build step** — Babel Standalone compilează JSX direct în browser. Nu e nevoie de npm, webpack sau vite. Totul se servește static prin FastAPI.

---

## Cerințe

- **Python 3.11+**
- **MongoDB** rulând local (sau MongoDB Atlas)

### Instalare MongoDB pe Ubuntu/Debian

```bash
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

Verificare:
```bash
mongod --version
```

---

## Instalare

```bash
# 1. Clonează repo-ul
git clone https://github.com/SingGeon/BankruptIQ.git
cd BankruptIQ

# 2. Creează mediu virtual
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Instalează dependențele
pip install -r requirements.txt
```

---

## Configurare

Creează fișierul `.env` în rădăcina proiectului:

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=bankruptiq
MODEL_PATH=models/bankruptcy_model.pkl
LOG_LEVEL=INFO
```

---

## Pornire

**Rulează întotdeauna din rădăcina proiectului** (nu din subdirectoare):

```bash
cd BankruptIQ
source venv/bin/activate
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

- **Dashboard:** `http://localhost:8000/dashboard`
- **Landing page:** `http://localhost:8000`
- **API docs (Swagger):** `http://localhost:8000/docs`

> **Notă:** La pornire, sistemul creează automat indexuri MongoDB pe `company_name`, `risk_label` și `sector` pentru interogări rapide.

---

## Import date

### Format CSV

Fișierul CSV trebuie să conțină coloanele:

| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `company_name` | string | Denumirea companiei |
| `year` | int | Anul exercițiului financiar |
| `sector` | string | Sectorul economic (ex: `Productie`, `IT_Telecom`) |
| `current_ratio` | float | Active curente / Datorii curente |
| `quick_ratio` | float | (Active curente − Stocuri) / Datorii curente |
| `debt_ratio` | float | Total datorii / Total active (0–1) |
| `debt_to_equity` | float | Total datorii / Capital propriu |
| `net_profit_margin` | float | Profit net / Vânzări × 100 (%) |
| `return_on_assets` | float | Profit net / Total active × 100 (%) |
| `return_on_equity` | float | Profit net / Capital propriu × 100 (%) |
| `asset_turnover` | float | Vânzări / Total active |
| `working_capital_ratio` | float | (Active curente − Datorii curente) / Total active |
| `interest_coverage` | float | EBIT / Cheltuieli cu dobânzile |
| `is_bankrupt` | int | **Opțional** — 0 = sănătos, 1 = falimentat (necesar pentru antrenare ML) |
| `risk_score` | float | **Opțional** — scor pre-calculat 0–100 |
| `risk_label` | string | **Opțional** — `Risc mic` / `Risc mediu` / `Risc mare` |

### Import prin interfață

1. Pornește serverul
2. Mergi la `http://localhost:8000/dashboard`
3. Navigare → secțiunea **Upload** (sau folosește `/api/upload/csv`)

### Import din linie de comandă

```bash
curl -X POST http://localhost:8000/api/upload/csv \
  -F "file=@data/fisier.csv"
```

---

## Antrenare model ML

După importul datelor care conțin coloana `is_bankrupt`:

```bash
curl -X POST http://localhost:8000/api/ml/train
```

Sau din Python:

```bash
python -m backend.ml.trainer
```

Modelul antrenat se salvează automat la `models/bankruptcy_model.pkl`. După antrenare, toate companiile din baza de date primesc un scor actualizat.

**Metrici returnate:** accuracy, precision, recall, F1, AUC-ROC, importanță variabile.

---

## Cum funcționează scoring-ul

### 1. Altman Z-Score (formula privată 1983)

```
Z = 0.717×X1 + 0.847×X2 + 3.107×X3 + 0.420×X4 + 0.998×X5
```

| Variabilă | Semnificație |
|-----------|-------------|
| X1 | Capital circulant / Total active |
| X2 | Profit reinvestit / Total active (aproximat din ROA) |
| X3 | EBIT / Total active |
| X4 | Capitalizare bursieră / Total datorii (aproximat) |
| X5 | Vânzări / Total active |

| Z-Score | Interpretare |
|---------|-------------|
| < 1.81 | **Zonă distress** — risc ridicat de faliment |
| 1.81 – 2.99 | **Zonă gri** — incert, monitorizare activă |
| > 2.99 | **Zonă sigură** — sănătos financiar |

### 2. Ohlson O-Score

Model probit cu 8 variabile financiare. Valori pozitive indică risc crescut.

### 3. Random Forest ML

Pipeline complet:
```
Date brute → Imputare mediană → StandardScaler → RandomForest(200 arbori) → Probabilitate → Scor 0–100
```

- `n_estimators=200`, `max_depth=8`, `class_weight='balanced'`
- Scorul final (0–100) este probabilitatea de faliment multiplicată

| Scor | Etichetă |
|------|----------|
| 0 – 32 | Risc mic |
| 33 – 65 | Risc mediu |
| 66 – 100 | Risc mare |

### 4. Predicție 12L/36L

Forecast cu tendință istorică + amortizare geometrică:
- Tendința se calculează din istoricul anual al companiei (cel mai recent minus cel mai vechi)
- Se aplică factor de amortizare 7%/lună — trendul scade în intensitate în timp
- Rezultatul e convertit din scor risc (0–100%) la Z-Score echivalent pentru vizualizare

---

## Semnale Early-Warning (Flags)

Sistemul detectează automat 8 tipuri de semnale:

| Flag | Condiție | Semnificație |
|------|----------|-------------|
| `cr_low` | Current ratio < 1.0 | Risc de lichiditate pe termen scurt |
| `debt_high` | Debt ratio > 70% | Levier financiar ridicat |
| `npm_neg` | Net profit margin < 0 | Pierdere operațională |
| `roe_neg` | ROE < 0 | Distrugere de valoare |
| `ic_low` | Interest coverage < 1.5× | Risc de neplată dobânzi |
| `roa_low` | ROA < 2% | Eficiență scăzută active |
| `z_distress` | Altman Z < 1.81 | Zonă distress confirmată |
| `z_grey` | Altman Z 1.81–2.99 | Zonă gri, monitorizare |

---

## API Endpoints

### Companii

| Method | Endpoint | Descriere |
|--------|----------|-----------|
| `GET` | `/api/companies/` | Listare cu paginare (`skip`, `limit` max 5000) |
| `GET` | `/api/companies/unique` | Un record per companie, cel mai recent an (recomandat pentru frontend) |
| `GET` | `/api/companies/aggregate-stats` | KPIs agregate pentru toate companiile (foarte rapid, MongoDB pipeline) |
| `GET` | `/api/companies/stats` | Statistici globale |
| `GET` | `/api/companies/{id}` | Detalii companie |
| `DELETE` | `/api/companies/{id}` | Șterge companie |

### ML

| Method | Endpoint | Descriere |
|--------|----------|-----------|
| `POST` | `/api/ml/train` | Antrenează modelul pe toate datele cu `is_bankrupt` |
| `POST` | `/api/ml/predict` | Predicție ad-hoc (JSON body cu indicatori) |
| `POST` | `/api/ml/predict-all` | Re-scorează toate companiile din DB |
| `GET` | `/api/ml/model-info` | Info model curent (metrici, features) |
| `GET` | `/api/ml/forecast/{company_name}?months=36` | Forecast 12L sau 36L pentru o companie |

### Altele

| Method | Endpoint | Descriere |
|--------|----------|-----------|
| `POST` | `/api/upload/csv` | Import fișier CSV |
| `GET` | `/api/alerts/` | Listare alerte active |
| `GET` | `/api/alerts/count` | Număr alerte per severitate |
| `GET` | `/api/macro/` | Indicatori macro (BNR, INSSE) |
| `POST` | `/api/macro/refresh` | Actualizează EUR/RON live de la BNR |
| `GET` | `/docs` | Swagger UI interactiv |

### Exemplu predicție ad-hoc

```bash
curl -X POST http://localhost:8000/api/ml/predict \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": {
      "current_ratio": 0.6,
      "quick_ratio": 0.4,
      "debt_ratio": 0.9,
      "debt_to_equity": 8.5,
      "net_profit_margin": -15.0,
      "return_on_assets": -8.0,
      "return_on_equity": -40.0,
      "asset_turnover": 0.3,
      "working_capital_ratio": -0.2,
      "interest_coverage": -1.5
    }
  }'
```

### Exemplu forecast 36 luni

```bash
curl "http://localhost:8000/api/ml/forecast/NUME%20COMPANIE%20SRL?months=36"
```

Returnează array de 36 scoruri lunare (0–100%), calculate cu tendință istorică + amortizare geometrică.

---

## Performanță

| Operație | Timp tipic |
|----------|-----------|
| `/api/companies/aggregate-stats` (24k companii) | ~35ms |
| `/api/companies/unique?limit=10000` | ~400ms |
| Randare dashboard (2000 companii afișate) | ~1–2s |
| Antrenare model (10k companii) | ~15–30s |

**Optimizări active:**
- Indexuri MongoDB pe `company_name`, `risk_label`, `sector`
- Endpoint `/aggregate-stats` cu pipeline MongoDB — nu trimite date în frontend
- Tabel frontend paginat (80 rânduri vizibile, „Încarcă mai multe" pe click)
- KPIs globale calculați server-side, nu în browser

---

## Teme vizuale

Dashboard-ul suportă 4 teme configurabile din panoul **Tweaks** (colț dreapta):

| Temă | Descriere |
|------|-----------|
| **Glass** | Glassmorphism — fundal deep-navy, carduri transparente cu blur, aurora violet/albastru |
| **Terminal** | Dens, monospace, accente verzi |
| **Fintech** | Modern, clean, albastru |
| **Editorial** | Serif, generos, ton cald |

Fiecare temă suportă modul **dark/light** și densitate **compact/comfortable**.

---

## Structura bazei de date (MongoDB)

### Colecția `companies`

```json
{
  "_id": "ObjectId",
  "company_name": "EXEMPLU SRL",
  "year": 2023,
  "sector": "Productie",
  "risk_score": 45.2,
  "risk_label": "Risc mediu",
  "is_bankrupt": 0,
  "indicators": {
    "current_ratio": 1.45,
    "quick_ratio": 1.12,
    "debt_ratio": 0.52,
    "debt_to_equity": 1.08,
    "net_profit_margin": 8.3,
    "return_on_assets": 6.1,
    "return_on_equity": 12.7,
    "asset_turnover": 0.73,
    "working_capital_ratio": 0.18,
    "interest_coverage": 4.2
  },
  "created_at": "2026-05-20T21:17:35.774Z"
}
```

### Colecția `alerts`

Generată automat pe baza flag-urilor detectate pentru fiecare companie cu risc ridicat.

### Colecția `macro_indicators`

Indicatori macroeconomici: rata dobânzii BNR, inflație, EUR/RON, șomaj, producție industrială.

---

## Depanare frecventă

### `ModuleNotFoundError: No module named 'backend'`

Cauză: script rulat direct cu `python backend/main.py` în loc de modul.

Soluție:
```bash
# GREȘIT
python backend/main.py

# CORECT
python -m uvicorn backend.main:app --reload --port 8000
```

### Dashboard arată 0 companii

Verifică:
1. MongoDB rulează: `sudo systemctl status mongod`
2. Baza de date conține date: `mongosh bankruptiq --eval "db.companies.countDocuments()"`
3. Serverul a pornit corect: `curl http://localhost:8000/health`

### Modelul ML nu există

Dacă nu există `models/bankruptcy_model.pkl`:
```bash
curl -X POST http://localhost:8000/api/ml/predict-all
```
Aceasta generează scoruri pe baza Altman Z-Score fără model antrenat. Pentru model complet:
```bash
# Asigură-te că datele au coloana is_bankrupt
curl -X POST http://localhost:8000/api/ml/train
```

### Pagina se încarcă lent (prima dată)

Normal — la primul acces, browser-ul compilează ~10 fișiere JSX cu Babel Standalone. Compilarea e cachată pentru sesiunile ulterioare. Timp normal: 3–8 secunde la prima încărcare.

---

## Stack tehnologic

| Componentă | Tehnologie |
|-----------|-----------|
| Backend | FastAPI + Uvicorn |
| Bază de date | MongoDB + Motor (async) |
| ML | scikit-learn (RandomForest, StandardScaler, SimpleImputer) |
| Frontend | React 18 + Babel Standalone (fără build step) |
| Grafice | SVG custom (fără librării externe) |
| Fonturi | Geist, Geist Mono, Instrument Serif (Google Fonts) |

---

## Licență

© 2026 BankruptIQ · Toate drepturile rezervate.
