#!/usr/bin/env python3
"""
fetch_mf.py — Pipeline date financiare reale (Ministerul Finanțelor)

Sursă:  https://data.gov.ro  →  dataset "Situații financiare anuale"
Fișier: WEB_BL_BS_SL_AN{an}.csv  (bilanț prescurtat firme normale)

Structura reală a CSV-ului MF (din WEB_BL_BS_SL_AN2017.txt):
  CUI, CAEN,
  I1  = Active imobilizate - TOTAL
  I2  = Active circulante - TOTAL
  I3  = Stocuri
  I4  = Creanțe
  I5  = Casa și conturi la bănci
  I6  = Cheltuieli în avans
  I7  = DATORII - TOTAL  (curente + lungi, neseparat!)
  I8  = Venituri în avans
  I9  = Provizioane
  I10 = CAPITALURI - TOTAL  (capital propriu)
  I11 = Capital subscris vărsat
  I12 = Patrimoniul regiei
  I13 = Cifra de afaceri netă
  I14 = VENITURI TOTALE
  I15 = CHELTUIELI TOTALE
  I16 = Profitul brut       (>0 când firma e profitabilă, altfel 0)
  I17 = Pierdere brută      (>0 când firma pierde, altfel 0)
  I18 = Profitul net        (>0 când firma e profitabilă, altfel 0)
  I19 = Pierderea netă      (>0 când firma pierde, altfel 0)
  I20 = Număr mediu salariați

  ATENȚIE: Nu există denumire firmă — se folosește CUI ca identificator.
  ATENȚIE: I7 = datorii TOTALE (nu există split curent/lung-termen).
           current_ratio și quick_ratio sunt aproximări cu datorii totale.
  ATENȚIE: Nu există cheltuieli dobânzi separate.
           interest_coverage e estimat din profit și datorii.

─── Utilizare ────────────────────────────────────────────────────────────────
  python data/fetch_mf.py --local WEB_BL_BS_SL_AN2022.csv --year 2022
  python data/fetch_mf.py --local WEB_BL_BS_SL_AN2022.csv --year 2022 --sectors IT_Telecom Energie
  python data/fetch_mf.py --local WEB_BL_BS_SL_AN2022.csv --year 2022 --max 10000
  python data/fetch_mf.py --local mf2022.zip --year 2022
  python data/fetch_mf.py --local WEB_BL_BS_SL_AN2022.csv --year 2022 --insolv data/insolv_cui.csv

─── Instalare dependențe ─────────────────────────────────────────────────────
  pip install pandas requests tqdm

─── Surse date faliment ──────────────────────────────────────────────────────
  UNPIR / BPI  →  https://www.buletinulinsolventei.ro/
  ONRC         →  https://portal.onrc.ro/
"""

from __future__ import annotations

import argparse
import io
import os
import sys
import zipfile
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

try:
    from tqdm import tqdm
    _TQDM = True
except ImportError:
    _TQDM = False

# ── Constante ─────────────────────────────────────────────────────────────────

CKAN_API       = "https://data.gov.ro/api/3/action"
MF_DATASET_IDS = ["situatii-financiare-anuale", "situatii-financiare", "bilant-anual"]
MF_ENCODINGS   = ["cp1250", "cp1252", "utf-8-sig", "latin-1", "utf-8"]
OUTPUT_DIR     = Path(__file__).parent

# URL-uri directe WEB_BL_BS_SL_AN — date reale de pe data.gov.ro (Ministerul Finanțelor)
#
# ATENȚIE la convenția MF (contra-intuitivă!):
#   .csv (482 bytes) = descrierea coloanelor  ← NU vrem asta
#   .txt (9-62 MB)   = datele reale CSV       ← vrem asta
#
# Separator în fișier: ";" (punct și virgulă), nu virgulă
#
# Ani lipsă (2015, 2016, 2018, 2021): MF nu a publicat datele reale pentru acești ani.
MF_DIRECT_URLS: dict[int, str] = {
    2014: "https://data.gov.ro/dataset/f8353c0e-fee9-4aa3-b26d-be0e96c328a7/resource/f84467d1-58b3-4f6a-8d9b-90d467014006/download/web_bl_bs_sl_an2014.txt",
    2017: "https://data.gov.ro/dataset/f3c94174-4991-4d25-b183-663370908de3/resource/b00a63a0-4916-459a-a5d8-34cc68d34e86/download/webblbsslan2017.txt",
    2019: "https://data.gov.ro/dataset/f8353c0e-fee9-4aa3-b26d-be0e96c328a7/resource/e684f3bf-2d29-487c-b043-bdb8704c0461/download/web_bl_bs_sl_an2019.txt",
    2020: "https://data.gov.ro/dataset/f8353c0e-fee9-4aa3-b26d-be0e96c328a7/resource/e01e9b9c-ce80-4812-a3f5-82672ba6bb90/download/web_bl_bs_sl_an2020.txt",
    2022: "https://data.gov.ro/dataset/aa2567a4-e7d7-4e6e-ab19-d08d39f99996/resource/b35fab04-f101-42d7-a765-8f41728b373a/download/web_bl_bs_sl_an2022.txt",
    2023: "https://data.gov.ro/dataset/7861a98f-4d5c-4faa-90d4-8e934ebd1782/resource/8c914899-cf2a-494c-9d3b-7f9f7faa47a3/download/web_bl_bs_sl_an2023.txt",
}

# ── Mapare CAEN → sector BankruptIQ ──────────────────────────────────────────

def caen_to_sector(code) -> str:
    try:
        c = int(str(code).strip())
    except (ValueError, TypeError):
        return "Diverse"
    if 100   <= c <= 330:  return "Agricultura"
    if 500   <= c <= 990:  return "Energie"
    if 1000  <= c <= 3390:
        if 1910 <= c <= 1920: return "Energie"
        if 2100 <= c <= 2120: return "Sanatate_Farma"
        return "Productie"
    if 3510  <= c <= 3530: return "Energie"
    if 4100  <= c <= 4399: return "Constructii"
    if 4400  <= c <= 4799: return "Comert"
    if 4900  <= c <= 5339: return "Transport_Logistica"
    if 5500  <= c <= 5630: return "Turism_HoReCa"
    if 5800  <= c <= 5829: return "IT_Telecom"
    if 6100  <= c <= 6209: return "IT_Telecom"
    if 7900  <= c <= 7999: return "Turism_HoReCa"
    if 8600  <= c <= 8699: return "Sanatate_Farma"
    return "Diverse"

# ── Mapare coloane reale MF (WEB_BL_BS_SL format) ────────────────────────────
# Chei posibile pentru fiecare câmp (MF schimbă uneori case-ul)

COL_MAP = {
    "cui":          ["CUI", "cui", "Cui"],
    "caen":         ["CAEN", "caen", "Caen", "CAEN_REV2", "caen_rev2"],
    "den":          ["DEN", "den", "DENUMIRE", "denumire"],   # absent în BL_BS_SL
    # Bilanț active
    "I1":           ["I1", "i1"],   # active imobilizate
    "I2":           ["I2", "i2"],   # active circulante
    "I3":           ["I3", "i3"],   # stocuri
    "I4":           ["I4", "i4"],   # creanțe
    "I5":           ["I5", "i5"],   # casa și conturi
    "I6":           ["I6", "i6"],   # cheltuieli în avans
    # Datorii și capitaluri
    "I7":           ["I7", "i7"],   # DATORII TOTAL
    "I8":           ["I8", "i8"],   # venituri în avans
    "I9":           ["I9", "i9"],   # provizioane
    "I10":          ["I10", "i10"], # CAPITALURI TOTAL (capital propriu)
    "I11":          ["I11", "i11"], # capital subscris vărsat
    "I12":          ["I12", "i12"], # patrimoniul regiei
    # Cont profit și pierdere
    "I13":          ["I13", "i13"], # cifra de afaceri netă
    "I14":          ["I14", "i14"], # venituri totale
    "I15":          ["I15", "i15"], # cheltuieli totale
    "I16":          ["I16", "i16"], # profitul brut (când >0)
    "I17":          ["I17", "i17"], # pierderea brută (când >0)
    "I18":          ["I18", "i18"], # profitul net (când >0)
    "I19":          ["I19", "i19"], # pierderea netă (când >0)
    "I20":          ["I20", "i20"], # număr mediu salariați
}

def detect_columns(df: pd.DataFrame) -> dict[str, str]:
    """Returnează {cheie_logică: coloana_reală} pentru coloanele găsite în DataFrame."""
    cols = set(df.columns)
    found: dict[str, str] = {}
    for key, aliases in COL_MAP.items():
        for alias in aliases:
            if alias in cols:
                found[key] = alias
                break
    return found

# ── Calcul indicatori ─────────────────────────────────────────────────────────

def _s(df: pd.DataFrame, cm: dict, key: str) -> pd.Series:
    """Extrage coloana ca Series numerică; returnează 0 dacă nu există."""
    if key in cm:
        return pd.to_numeric(df[cm[key]], errors="coerce").fillna(0.0)
    return pd.Series(0.0, index=df.index)

def _div(num: pd.Series, den: pd.Series, cap: float = 500.0) -> pd.Series:
    """Împărțire sigură cu clipping."""
    return (num / den.replace(0, float("nan"))).clip(-cap, cap)

def compute_ratios(df: pd.DataFrame, cm: dict[str, str]) -> pd.DataFrame:
    """
    Calculează cei 10 indicatori din coloanele brute MF.

    Particularități față de bilanțul complet:
      • I7 = datorii TOTALE (curent+lung) — current_ratio/quick_ratio sunt aproximări
      • I16/I17 = profit/pierdere brut separate → profit_brut = I16 - I17
      • I18/I19 = profit/pierdere net separate → profit_net  = I18 - I19
      • interest_coverage estimat din profit și 5% din datorii totale
    """
    i1  = _s(df, cm, "I1")   # active imobilizate
    i2  = _s(df, cm, "I2")   # active circulante
    i3  = _s(df, cm, "I3")   # stocuri
    i6  = _s(df, cm, "I6")   # cheltuieli în avans
    i7  = _s(df, cm, "I7")   # DATORII TOTAL
    i10 = _s(df, cm, "I10")  # CAPITALURI TOTAL
    i13 = _s(df, cm, "I13")  # cifra de afaceri
    i16 = _s(df, cm, "I16")  # profitul brut
    i17 = _s(df, cm, "I17")  # pierderea brută
    i18 = _s(df, cm, "I18")  # profitul net
    i19 = _s(df, cm, "I19")  # pierderea netă

    # Combină profit + pierdere (una e întotdeauna 0)
    profit_brut = i16 - i17
    profit_net  = i18 - i19

    # Total active = imobilizate + circulante + cheltuieli avans
    total_active = i1 + i2 + i6

    out = pd.DataFrame(index=df.index)

    # Lichiditate — aproximare: folosim datorii totale ca numitor
    out["current_ratio"]         = _div(i2, i7).round(4)
    out["quick_ratio"]           = _div(i2 - i3, i7).round(4)

    # Îndatorare
    out["debt_ratio"]            = _div(i7, total_active).round(4)
    out["debt_to_equity"]        = _div(i7, i10).round(4)

    # Profitabilitate
    out["net_profit_margin"]     = (_div(profit_net, i13) * 100).round(4)
    out["return_on_assets"]      = (_div(profit_net, total_active) * 100).round(4)
    out["return_on_equity"]      = (_div(profit_net, i10) * 100).round(4)

    # Eficiență
    out["asset_turnover"]        = _div(i13, total_active).round(4)
    out["working_capital_ratio"] = _div(i2 - i7, total_active).round(4)

    # Acoperire dobânzi — estimare: dobanzi ≈ 5% din datorii totale
    # Pentru firme fără datorii: IC = 100 (sigur)
    dob_est = (i7.abs() * 0.05).clip(lower=1.0)
    ic = _div(profit_brut, dob_est, cap=200.0)
    ic = ic.where(i7.abs() > 100, 100.0)   # dacă datorii neglijabile → IC sigur
    out["interest_coverage"]     = ic.round(4)

    return out

# ── Filtrare calitate ─────────────────────────────────────────────────────────

BOUNDS = {
    "current_ratio":        (-50,   100),
    "quick_ratio":          (-50,   100),
    "debt_ratio":           (-10,    20),
    "debt_to_equity":       (-500,  500),
    "net_profit_margin":    (-100,  100),
    "return_on_assets":     (-100,  100),
    "return_on_equity":     (-500,  500),
    "asset_turnover":       (-10,    50),
    "working_capital_ratio":(-50,    50),
    "interest_coverage":    (-1000,1000),
}
INDICATOR_COLS = list(BOUNDS.keys())

# ── Îmbogățire denumiri via API ANAF ─────────────────────────────────────────
# API public ANAF: https://webservicesp.anaf.ro/
# Acceptă max 500 CUI-uri per request, returnează denumire + adresă

ANAF_API = "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva"
ANAF_BATCH = 500   # max CUI-uri per request

ONRC_FIRME_URL = (
    "https://data.gov.ro/dataset/64d3f306-91ef-4c75-babf-56378e3bb3ae"
    "/resource/f0a12fb5-4b83-441d-8e05-709fa7769663/download/od_firme.csv"
)
ONRC_NAMES_CACHE = OUTPUT_DIR / "onrc_names.csv"


def build_onrc_names_cache(dest: Path = ONRC_NAMES_CACHE) -> Path:
    """
    Descarcă OD_FIRME.csv (ONRC, ~650MB) în streaming și salvează
    doar coloanele CUI + DENUMIRE în dest (~30-50MB).
    Se apelează o singură dată; rulările ulterioare folosesc cache-ul.
    """
    print(f"[INFO] Descărcare ONRC OD_FIRME.csv (~650MB) → extrag CUI+Denumire...")
    r = requests.get(ONRC_FIRME_URL, stream=True, timeout=120)
    r.raise_for_status()

    written = 0
    header_done = False
    cui_idx = den_idx = -1

    with open(dest, "w", encoding="utf-8") as out:
        out.write("cui,denumire\n")
        buf = b""
        for chunk in r.iter_content(chunk_size=65536):
            buf += chunk
            while b"\n" in buf:
                line_bytes, buf = buf.split(b"\n", 1)
                try:
                    line = line_bytes.decode("utf-8-sig").rstrip("\r")
                except UnicodeDecodeError:
                    line = line_bytes.decode("latin-1").rstrip("\r")
                parts = line.split("^")
                if not header_done:
                    cols = [c.strip().upper() for c in parts]
                    cui_idx = cols.index("CUI") if "CUI" in cols else -1
                    den_idx = cols.index("DENUMIRE") if "DENUMIRE" in cols else -1
                    header_done = True
                    continue
                if cui_idx < 0 or den_idx < 0 or len(parts) <= max(cui_idx, den_idx):
                    continue
                cui = parts[cui_idx].strip()
                den = parts[den_idx].strip().replace('"', '""')
                if cui and cui != "0" and den:
                    out.write(f'{cui},"{den}"\n')
                    written += 1
            if written % 100000 == 0 and written > 0:
                print(f"[INFO] ONRC: {written:,} firme extrase...", file=sys.stderr)

    print(f"[OK] ONRC names cache: {dest} ({written:,} firme)")
    return dest


def load_names_onrc(cache: Path = ONRC_NAMES_CACHE) -> dict[str, str]:
    """Încarcă cache-ul ONRC (creat de build_onrc_names_cache)."""
    df = pd.read_csv(cache, dtype=str)
    result = {}
    for _, row in df.iterrows():
        cui = str(row["cui"]).strip()
        den = str(row["denumire"]).strip()
        if cui and den and den != "nan":
            result[cui] = den
    print(f"[INFO] ONRC names loaded: {len(result):,} firme")
    return result


def fetch_names_anaf(cuis: list[str], year: int) -> dict[str, str]:
    """
    Returnează un dict {cui_str: denumire} via API ANAF (batch-uri de 500).
    Notă: API-ul ANAF poate fi inaccesibil din anumite rețele/IP-uri.
    """
    ref_date = f"{year}-12-31"
    names: dict[str, str] = {}
    total = len(cuis)

    for i in range(0, total, ANAF_BATCH):
        batch = cuis[i : i + ANAF_BATCH]
        payload = [{"cui": int(c), "data": ref_date} for c in batch if c.isdigit()]
        try:
            r = requests.post(
                ANAF_API, json=payload, timeout=30,
                headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
            )
            r.raise_for_status()
            for item in r.json().get("found", []):
                cui_str = str(item.get("cui", ""))
                den = (item.get("date_generale", {}) or {}).get("denumire", "")
                if cui_str and den:
                    names[cui_str] = den.strip()
        except Exception as e:
            print(f"[WARN] ANAF API batch {i//ANAF_BATCH + 1}: {e}", file=sys.stderr)

        done = min(i + ANAF_BATCH, total)
        print(f"[INFO] Denumiri ANAF: {done}/{total} ({len(names)} găsite)", file=sys.stderr)

    return names


def load_names_csv(path: Path) -> dict[str, str]:
    """
    Citește un CSV cu coloanele 'cui' și 'denumire' (sau 'den' / 'name').
    Returnează {cui_str: denumire}.

    Surse recomandate:
      - termene.ro  → Export companii → CSV
      - listafirme.ro → Download
      - ONRC → portal.onrc.ro
      - ANAF plătitori TVA → anaf.ro (secțiunea Informații publice)
    """
    df = pd.read_csv(path, dtype=str)
    # Detectează automat coloanele
    cui_col = next((c for c in df.columns if c.lower() in ("cui", "cod_fiscal", "cif")), None)
    den_col = next((c for c in df.columns if c.lower() in ("denumire", "den", "name", "firma", "company")), None)
    if not cui_col or not den_col:
        raise ValueError(f"CSV-ul {path} trebuie să aibă coloane 'cui' și 'denumire'. Coloane găsite: {list(df.columns)}")
    result = {}
    for _, row in df.iterrows():
        cui = str(row[cui_col]).strip()
        den = str(row[den_col]).strip()
        if cui and den and den != "nan":
            result[cui] = den
    print(f"[INFO] Denumiri din CSV: {len(result)} înregistrări", file=sys.stderr)
    return result


def filter_valid(df: pd.DataFrame) -> pd.DataFrame:
    mask = pd.Series(True, index=df.index)
    for col, (lo, hi) in BOUNDS.items():
        if col in df.columns:
            v = df[col]
            mask &= v.notna() & (v >= lo) & (v <= hi)
    # Elimină firme fără cifra de afaceri și fără active (probabil inactive)
    if "asset_turnover" in df.columns:
        mask &= df["asset_turnover"].abs() > 0.001
    return df[mask]

# ── Descărcare automată ───────────────────────────────────────────────────────

def find_mf_url(year: int) -> Optional[str]:
    # 1. URL hardcodat — cel mai rapid
    if year in MF_DIRECT_URLS:
        url = MF_DIRECT_URLS[year]
        print(f"[INFO] URL hardcodat pentru {year}: {url}")
        return url
    # 2. Fallback: caută prin API CKAN
    print(f"[WARN] Anul {year} nu are URL hardcodat, caut prin API...")
    for dataset_id in MF_DATASET_IDS:
        try:
            r = requests.get(f"{CKAN_API}/package_show", params={"id": dataset_id}, timeout=15)
            if r.status_code != 200:
                continue
            data = r.json()
            if not data.get("success"):
                continue
            for res in data["result"].get("resources", []):
                name = (res.get("name") or res.get("description") or "").lower()
                url  = res.get("url", "")
                if str(year) in name or str(year) in url:
                    print(f"[INFO] Resource găsit via API: {res.get('name')} → {url}")
                    return url
        except Exception as e:
            print(f"[WARN] CKAN API ({dataset_id}): {e}", file=sys.stderr)
    return None

def download_file(url: str, dest: Path) -> Path:
    print(f"[INFO] Descărcare: {url}")
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    total = int(r.headers.get("content-length", 0))
    with open(dest, "wb") as f:
        if _TQDM and total:
            with tqdm(total=total, unit="B", unit_scale=True, desc=dest.name) as bar:
                for chunk in r.iter_content(8192):
                    f.write(chunk); bar.update(len(chunk))
        else:
            for chunk in r.iter_content(8192):
                f.write(chunk)
    print(f"[INFO] Descărcat: {dest} ({dest.stat().st_size/1e6:.1f} MB)")
    return dest

# ── Încărcare fișier ──────────────────────────────────────────────────────────

def load_file(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".zip":
        with zipfile.ZipFile(path) as zf:
            csv_files = [n for n in zf.namelist() if n.lower().endswith((".csv", ".txt"))
                         and "BL_BS_SL" in n.upper()]
            if not csv_files:
                csv_files = [n for n in zf.namelist() if n.lower().endswith((".csv", ".txt"))]
            if not csv_files:
                raise ValueError(f"Nu există CSV în arhivă: {zf.namelist()}")
            chosen = csv_files[0]
            print(f"[INFO] Fișier ales din ZIP: {chosen}")
            return _read_csv_bytes(zf.read(chosen))
    elif suffix in (".csv", ".txt"):
        return _read_csv(path)
    raise ValueError(f"Format nesuportat: {suffix}")

def _read_csv(path: Path) -> pd.DataFrame:
    for enc in MF_ENCODINGS:
        for sep in (";", ",", "\t"):
            try:
                df = pd.read_csv(path, encoding=enc, sep=sep, low_memory=False, dtype=str)
                if len(df.columns) > 3:   # separator corect → multe coloane
                    return df
            except (UnicodeDecodeError, pd.errors.ParserError):
                continue
    raise ValueError(f"Nu pot citi {path}")

def _read_csv_bytes(data: bytes) -> pd.DataFrame:
    for enc in MF_ENCODINGS:
        for sep in (";", ",", "\t"):
            try:
                df = pd.read_csv(io.BytesIO(data), encoding=enc, sep=sep, low_memory=False, dtype=str)
                if len(df.columns) > 3:
                    return df
            except (UnicodeDecodeError, pd.errors.ParserError):
                continue
    raise ValueError("Nu pot decoda fișierul CSV din ZIP")

# ── Insolvență ────────────────────────────────────────────────────────────────

def load_insolv_cuis(path: Path) -> set[str]:
    df = pd.read_csv(path, dtype=str)
    col = "cui" if "cui" in df.columns else df.columns[0]
    cuis = set(df[col].str.strip().dropna())
    print(f"[INFO] CUI-uri insolvență: {len(cuis)}")
    return cuis

# ── Procesare ─────────────────────────────────────────────────────────────────

SECTOR_NAMES = {
    "Agricultura","Constructii","IT_Telecom","Comert",
    "Productie","Transport_Logistica","Sanatate_Farma",
    "Energie","Turism_HoReCa","Diverse",
}
OUTPUT_COLS = ["company_name","year","sector",*INDICATOR_COLS,"is_bankrupt"]


def process(df: pd.DataFrame, year: int, sectors: Optional[list[str]],
            max_companies: int, insolv_cuis: set[str]) -> pd.DataFrame:

    cm = detect_columns(df)

    # Raportează ce coloane s-au găsit
    found_keys = set(cm.keys())
    critical   = {"cui","I2","I7","I13","I18","I19"}
    missing    = critical - found_keys
    if missing:
        print(f"[WARN] Coloane critice lipsă: {missing}", file=sys.stderr)
        print(f"[INFO] Coloane detectate: {sorted(found_keys)}", file=sys.stderr)
        print(f"[INFO] Toate coloanele din fișier: {list(df.columns[:30])}", file=sys.stderr)

    # Sector din CAEN
    if "caen" in cm:
        df = df.copy()
        df["_sector"] = df[cm["caen"]].apply(caen_to_sector)
    else:
        df = df.copy()
        df["_sector"] = "Diverse"

    # Filtrare sector
    if sectors:
        df = df[df["_sector"].isin(sectors)]
        if df.empty:
            print("[WARN] Niciun rând după filtrarea pe sector.", file=sys.stderr)
            return pd.DataFrame(columns=OUTPUT_COLS)

    # Calcul indicatori
    ratios = compute_ratios(df, cm)

    # Denumire firmă: folosim CUI (nu există DEN în acest format MF)
    if "den" in cm:
        names = df[cm["den"]].astype(str).str.strip()
    elif "cui" in cm:
        names = "Firma_" + df[cm["cui"]].astype(str).str.strip()
    else:
        names = pd.Series("Necunoscut", index=df.index)

    # Salvăm sectoarele ca array numpy înainte de orice filtrare
    sector_arr = df["_sector"].to_numpy()
    s_sector = pd.Series(sector_arr, index=df.index, name="sector")
    result = pd.concat([
        names.rename("company_name"),
        pd.Series(year, index=df.index, name="year"),
        s_sector,
        ratios,
    ], axis=1)

    # Filtrare date valide
    result = filter_valid(result)

    # Etichetă faliment
    if insolv_cuis and "cui" in cm:
        cui_s = df.loc[result.index, cm["cui"]].astype(str).str.strip()
        result["is_bankrupt"] = cui_s.apply(lambda c: 1 if c in insolv_cuis else 0)
    else:
        result["is_bankrupt"] = None

    # Eșantionare stratificată pe sector (compatibil pandas 3.x)
    if max_companies and len(result) > max_companies:
        n_total = len(result)
        parts = []
        for _, grp in result.groupby("sector", group_keys=False):
            n = max(1, int(max_companies * len(grp) / n_total))
            parts.append(grp.sample(min(len(grp), n), random_state=42))
        result = pd.concat(parts).head(max_companies)

    return result.reindex(columns=OUTPUT_COLS).reset_index(drop=True)

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Procesează date MF și generează CSV pentru BankruptIQ.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--year",    type=int, default=2022)
    parser.add_argument("--url",     type=str, default=None,
                        help="Link direct de descărcare CSV/ZIP de pe data.gov.ro")
    parser.add_argument("--local",   type=Path, default=None,
                        help="Fișier local CSV/ZIP deja descărcat")
    parser.add_argument("--sectors", nargs="+", choices=sorted(SECTOR_NAMES))
    parser.add_argument("--max",     type=int, default=0,
                        help="Număr maxim companii (0 = toate)")
    parser.add_argument("--insolv",  type=Path, default=None,
                        help="CSV cu CUI-uri falimentate (coloana 'cui')")
    parser.add_argument("--names",          action="store_true",
                        help="Îmbogățește denumirile via API ANAF")
    parser.add_argument("--names-csv",      type=Path, default=None,
                        help="CSV local cu coloane 'cui' și 'denumire'")
    parser.add_argument("--download-names", action="store_true",
                        help="Descarcă lista ONRC (~650MB) și construiește cache-ul de denumiri")
    parser.add_argument("--output",  type=Path, default=None)
    args = parser.parse_args()

    output_path = args.output or OUTPUT_DIR / f"mf_{args.year}.csv"

    # ── Obține fișierul ───────────────────────────────────────────────────────
    if args.local:
        if not args.local.exists():
            print(f"[ERR] Fișierul nu există: {args.local}", file=sys.stderr); sys.exit(1)
        source = args.local
        print(f"[INFO] Fișier local: {source}")
    elif args.url:
        ext  = Path(args.url.split("?")[0]).suffix or ".csv"
        dest = OUTPUT_DIR / f"mf_raw_{args.year}{ext}"
        source = download_file(args.url, dest)
    else:
        print(f"[INFO] Caut pe data.gov.ro dataset MF {args.year}...")
        url = find_mf_url(args.year)
        if url is None:
            print(
                "\n[ERR] Nu am găsit automat. Folosește --url sau --local:\n"
                "  1. Deschide https://data.gov.ro/dataset/situatii-financiare-anuale\n"
                f"  2. Click dreapta pe 'Deschide' la WEB_BL_BS_SL_AN{args.year}.csv → Copiază linkul\n"
                f"  3. python data/fetch_mf.py --url <link_copiat> --year {args.year}\n",
                file=sys.stderr,
            ); sys.exit(1)
        ext  = Path(url.split("?")[0]).suffix or ".csv"
        dest = OUTPUT_DIR / f"mf_raw_{args.year}{ext}"
        source = download_file(url, dest)

    # ── Încarcă ───────────────────────────────────────────────────────────────
    print(f"[INFO] Încarc {source} ...")
    try:
        df_raw = load_file(source)
    except Exception as e:
        print(f"[ERR] {e}", file=sys.stderr); sys.exit(1)

    print(f"[INFO] Rânduri: {len(df_raw):,} | Coloane: {list(df_raw.columns)}")

    # ── Insolvență ────────────────────────────────────────────────────────────
    insolv_cuis: set[str] = set()
    if args.insolv:
        if args.insolv.exists():
            insolv_cuis = load_insolv_cuis(args.insolv)
        else:
            print(f"[WARN] {args.insolv} nu există", file=sys.stderr)

    # ── Procesează ────────────────────────────────────────────────────────────
    result = process(df_raw, args.year, args.sectors, args.max, insolv_cuis)

    if result.empty:
        print("[ERR] Niciun rând valid.", file=sys.stderr); sys.exit(1)

    # ── Statistici ────────────────────────────────────────────────────────────
    total   = len(result)
    bankr   = int((result["is_bankrupt"] == 1).sum())
    healthy = int((result["is_bankrupt"] == 0).sum())
    unkn    = int(result["is_bankrupt"].isna().sum())

    print(f"\n{'─'*50}")
    print(f"  Companii valide  : {total:,}")
    print(f"  Sănătoase (0)   : {healthy:,}")
    print(f"  Falimentate (1)  : {bankr:,}")
    print(f"  Fără etichetă   : {unkn:,}")
    print(f"  Sectoare:")
    for sec, cnt in result["sector"].value_counts().items():
        print(f"    {sec:<25} {cnt:,}")
    print(f"{'─'*50}\n")

    if bankr == 0:
        print(
            "[HINT] Nu există companii marcate falimentate.\n"
            "       Pentru antrenare ML furnizează --insolv cu CUI-uri UNPIR.\n"
            "       Fără etichetă, BankruptIQ poate prezice dar nu se poate antrena.\n"
        )

    # ── Îmbogățire denumiri (opțional) ───────────────────────────────────────
    name_map: dict[str, str] = {}
    cm_raw = detect_columns(df_raw)

    if args.download_names:
        # Descarcă ONRC și construiește cache → folosește imediat
        build_onrc_names_cache(ONRC_NAMES_CACHE)
        name_map = load_names_onrc(ONRC_NAMES_CACHE)
    elif ONRC_NAMES_CACHE.exists():
        # Cache ONRC există deja din rulare anterioară
        print(f"[INFO] Folosesc cache ONRC existent: {ONRC_NAMES_CACHE}")
        name_map = load_names_onrc(ONRC_NAMES_CACHE)
    elif args.names_csv and args.names_csv.exists():
        try:
            name_map = load_names_csv(args.names_csv)
        except Exception as e:
            print(f"[WARN] Nu pot citi --names-csv: {e}", file=sys.stderr)
    elif args.names_csv:
        print(f"[WARN] --names-csv nu există: {args.names_csv}", file=sys.stderr)

    if args.names and not name_map and "cui" in cm_raw:
        cuis_list = df_raw.loc[result.index, cm_raw["cui"]].astype(str).str.strip().tolist()
        print(f"[INFO] Cerere denumiri ANAF pentru {len(cuis_list)} companii...")
        name_map = fetch_names_anaf(cuis_list, args.year)

    if name_map and "cui" in cm_raw:
        cuis_list = df_raw.loc[result.index, cm_raw["cui"]].astype(str).str.strip().tolist()
        found = 0
        for idx, cui in zip(result.index, cuis_list):
            if cui in name_map:
                result.at[idx, "company_name"] = name_map[cui]
                found += 1
        print(f"[INFO] Denumiri aplicate: {found}/{len(cuis_list)}")

    # ── Salvează ──────────────────────────────────────────────────────────────
    result.to_csv(output_path, index=False)
    print(f"[OK] Salvat: {output_path}")
    print(f"     Import: python scripts/import_csv.py {output_path}")


if __name__ == "__main__":
    main()
