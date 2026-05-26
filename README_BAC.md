# BacalaureatIQ – Predicție Examen BAC România

Platformă de analiză și predicție pentru examenul de Bacalaureat din România, cu date realistice, modele ML și dashboard Streamlit interactiv.

## Structura proiectului

```
BankruptIQ/
├── data/
│   └── bac_romania.csv          # ~15,000 rânduri date BAC (generat)
├── models/
│   ├── bac_predictor.py         # Antrenare și predicție ML
│   ├── bac_classifier.pkl       # Model clasificare (RandomForest)
│   ├── bac_regressor.pkl        # Model regresie (GradientBoosting)
│   └── encoders.pkl             # LabelEncoders pentru variabile categorice
├── scripts/
│   ├── generate_bac_data.py     # Generator date sintetice realistice
│   └── load_to_mongo.py         # Loader date în MongoDB
├── app_bac.py                   # Aplicație Streamlit principală
├── requirements.txt
└── .env.example
```

## Pași de rulare

### 1. Instalare dependențe

```bash
pip install -r requirements.txt
```

### 2. Generare date

```bash
python scripts/generate_bac_data.py
```

Generează `data/bac_romania.csv` cu ~15,000 rânduri de date BAC realiste (2019–2024, toate județele României).

### 3. (Opțional) Încărcare în MongoDB

Copiați `.env.example` în `.env` și configurați conexiunea MongoDB:

```bash
cp .env.example .env
# Editați MONGO_URI dacă MongoDB rulează pe altă adresă
python scripts/load_to_mongo.py
```

Dacă MongoDB nu este disponibil, aplicația va folosi direct CSV-ul.

### 4. Antrenare modele ML

```bash
python models/bac_predictor.py
```

Antrenează:
- `RandomForestClassifier` pentru predicție promovat/nepromovat (~96% acuratețe)
- `GradientBoostingRegressor` pentru predicție medie generală (R² ~0.92)

Salvează modelele în `models/`.

### 5. Rulare aplicație Streamlit

```bash
streamlit run app_bac.py
```

Deschideți browserul la `http://localhost:8501`.

## Pagini disponibile

| Pagina | Descriere |
|--------|-----------|
| Dashboard | KPI-uri, statistici generale pe ani, grafice tendință |
| Județe | Rata de promovare per județ, top 10, heatmap |
| Școli & Profile | Performanță pe tip școală, profil, urban/rural |
| Note | Distribuția notelor, corelații, histograme |
| Demografic | Statistici pe sex, sesiune vara/toamnă |
| Predicție ML | Formular live, rezultat PROMOVAT/NEPROMOVAT, historic sesiune |
| Date Brute | Tabel paginat cu filtrare și descărcare CSV |

## Modele ML

**Clasificare – RandomForestClassifier**
- Target: `promovat` (0/1)
- Features: județ, mediu, sex, profil, tip_scoală, sesiune, an, notă română, notă matematică/istorie, notă specialitate
- Acuratețe test: ~96%

**Regresie – GradientBoostingRegressor**
- Target: `medie_generala`
- Aceleași features
- MAE: ~0.26 | R²: ~0.92

## Date generate

- **Ani**: 2019–2024
- **Județe**: toate 41 județe + București
- **Profile**: Real, Uman, Tehnologic, Pedagogic, Sportiv
- **Rata de promovare**: 60–65% total, mai mare în Cluj/Timiș/Brașov, mai mică în Vaslui/Teleorman/Călărași
- **Efectul COVID 2020**: penalizare ușoară a mediilor
