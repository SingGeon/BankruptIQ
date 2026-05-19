# ⚡ BankruptIQ — Sistem de Analiză a Riscului de Faliment

Aplicație completă pentru predicția riscului de faliment al întreprinderilor, folosind Machine Learning (Random Forest), FastAPI, MongoDB și un dashboard modern în browser.

---

## 🏗 Arhitectură

```
BankruptIQ/
├── backend/
│   ├── main.py              # FastAPI app (CORS, routere, fișiere statice)
│   ├── database.py          # Conexiune MongoDB async (motor)
│   ├── models.py            # Modele Pydantic (validare date)
│   ├── routes/
│   │   ├── companies.py     # CRUD companii + predicție individuală
│   │   ├── upload.py        # Import CSV cu validare
│   │   └── ml_routes.py     # Antrenare, predicție, info model
│   ├── ml/
│   │   ├── features.py      # Definiție coloane și descrieri
│   │   ├── trainer.py       # Pipeline Random Forest + metrici
│   │   └── predictor.py     # Scoring (0-100) + etichetare risc
│   └── utils/
│       ├── logger.py        # Logging structurat cu timestamps
│       └── validators.py    # Validare CSV (coloane, tipuri, intervale)
├── frontend/
│   ├── index.html           # Dashboard SPA
│   ├── css/style.css        # Design dark-mode modern
│   └── js/app.js            # Logica UI + Chart.js
├── data/
│   ├── sample_data.csv      # 80 companii de exemplu
│   └── generate_data.py     # Script generator date
├── models/                  # Modele ML serializate (joblib)
├── requirements.txt
└── .env.example
```

---

## 🚀 Instalare și Rulare

### 1. Cerințe preliminare

- **Python 3.11+**
- **MongoDB** (local sau Atlas)

Instalare MongoDB local (Ubuntu/Debian):
```bash
sudo apt install -y mongodb
sudo systemctl start mongodb
```

### 2. Clonare și setup

```bash
git clone <repo-url>
cd BankruptIQ

# Mediu virtual (recomandat)
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

### 3. Configurare

```bash
cp .env.example .env
# Editeaza .env daca MongoDB e pe alt host/port
```

Continut `.env`:
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=bankruptiq
MODEL_PATH=models/bankruptcy_model.pkl
LOG_LEVEL=INFO
```

### 4. Pornire server

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Deschide **http://localhost:8000** in browser.

---

## 📋 Flux de Utilizare

1. **Import CSV** — trage `data/sample_data.csv` in zona de upload
2. **Antrenare Model** — click "Antreneaza Model" (necesita coloane `is_bankrupt`)
3. **Scoruri automate** — dupa antrenare, toate companiile primesc scor 0-100
4. **Explorare** — cauta companii, vizualizeaza detalii, grafice

---

## 📊 Indicatori Financiari (Coloane CSV)

| Coloana | Descriere |
|---------|-----------|
| `company_name` | Denumirea companiei |
| `year` | Anul datelor financiare |
| `current_ratio` | Lichiditate curenta (active curente / datorii curente) |
| `quick_ratio` | Lichiditate rapida (fara stocuri) |
| `debt_ratio` | Rata datoriilor (total datorii / total active) |
| `debt_to_equity` | Datorii / Capital propriu |
| `net_profit_margin` | Marja profit net (%) |
| `return_on_assets` | ROA — Rentabilitatea activelor (%) |
| `return_on_equity` | ROE — Rentabilitatea capitalului propriu (%) |
| `asset_turnover` | Rotatia activelor (vanzari / total active) |
| `working_capital_ratio` | Fond de rulment / Total active |
| `interest_coverage` | Acoperire dobanzi (EBIT / Cheltuieli dobanzi) |
| `is_bankrupt` | **Optional** — 0 = sanatos, 1 = falimentat (pentru antrenare) |

---

## 🧠 Model Machine Learning

### Algoritm: Random Forest

**De ce Random Forest?**
- Gestioneaza relatii **neliniare** intre indicatori (tipic in date financiare)
- **Robust la outlieri** — frecventi in bilanturile contabile
- Ofera **importanta variabilelor** — interpretabilitate esentiala in finante
- `class_weight='balanced'` compenseaza **dezechilibrul claselor** (rare falimente)
- Superior Logistic Regression pentru pattern-uri complexe, fara tuning intensiv

### Pipeline
```
CSV → Imputare mediana → StandardScaler → RandomForest(200 arbori) → Probabilitate → Scor 0-100
```

### Clasificare risc
| Scor | Eticheta |
|------|----------|
| 0 - 32 | Risc mic |
| 33 - 65 | Risc mediu |
| 66 - 100 | Risc mare |

---

## 🔌 API Endpoints

| Method | Endpoint | Descriere |
|--------|----------|-----------|
| `GET` | `/api/companies/` | Listeaza companii (paginare + cautare) |
| `GET` | `/api/companies/stats` | Statistici agregate |
| `GET` | `/api/companies/{id}` | Detalii companie |
| `POST` | `/api/companies/{id}/predict` | Predictie individuala |
| `DELETE` | `/api/companies/{id}` | Sterge companie |
| `POST` | `/api/upload/csv` | Import fisier CSV |
| `POST` | `/api/ml/train` | Antrenare model |
| `POST` | `/api/ml/predict` | Predictie ad-hoc (JSON body) |
| `POST` | `/api/ml/predict-all` | Re-scoreaza toate companiile |
| `GET` | `/api/ml/model-info` | Info model curent |
| `GET` | `/docs` | Swagger UI interactiv |

### Exemplu predictie ad-hoc

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

---

## 🛠 Comenzi Utile

```bash
# Genereaza un nou CSV de test
python data/generate_data.py > data/sample_data.csv

# Rulare cu logging detaliat
LOG_LEVEL=DEBUG uvicorn backend.main:app --reload

# Testare rapida a ML-ului (fara MongoDB)
python -c "
import pandas as pd
from backend.ml.trainer import train
from backend.ml.predictor import predict
df = pd.read_csv('data/sample_data.csv')
metrics = train(df.to_dict(orient='records'))
print(metrics)
"
```
