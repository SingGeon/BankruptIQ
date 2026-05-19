import pandas as pd
from typing import Tuple

REQUIRED_COLUMNS = [
    "company_name",
    "year",
    "current_ratio",
    "quick_ratio",
    "debt_ratio",
    "debt_to_equity",
    "net_profit_margin",
    "return_on_assets",
    "return_on_equity",
    "asset_turnover",
    "working_capital_ratio",
    "interest_coverage",
]

OPTIONAL_LABEL_COLUMN = "is_bankrupt"

NUMERIC_COLUMNS = [c for c in REQUIRED_COLUMNS if c not in ("company_name", "year")]

COLUMN_BOUNDS = {
    "current_ratio": (-50, 100),
    "quick_ratio": (-50, 100),
    "debt_ratio": (-10, 20),
    "debt_to_equity": (-500, 500),
    "net_profit_margin": (-100, 100),
    "return_on_assets": (-100, 100),
    "return_on_equity": (-500, 500),
    "asset_turnover": (-10, 50),
    "working_capital_ratio": (-50, 50),
    "interest_coverage": (-1000, 1000),
}


def validate_csv(df: pd.DataFrame) -> Tuple[bool, str]:
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        return False, f"Coloane lipsă: {', '.join(missing)}"

    if df.empty:
        return False, "Fișierul CSV nu conține date."

    for col in NUMERIC_COLUMNS:
        non_numeric = pd.to_numeric(df[col], errors="coerce").isna().sum()
        if non_numeric > 0:
            return False, f"Coloana '{col}' conține {non_numeric} valori non-numerice."

    for col, (low, high) in COLUMN_BOUNDS.items():
        vals = pd.to_numeric(df[col], errors="coerce")
        out_of_range = ((vals < low) | (vals > high)).sum()
        if out_of_range > 0:
            return (
                False,
                f"Coloana '{col}' are {out_of_range} valori în afara intervalului [{low}, {high}].",
            )

    if OPTIONAL_LABEL_COLUMN in df.columns:
        unique_labels = set(pd.to_numeric(df[OPTIONAL_LABEL_COLUMN], errors="coerce").dropna().unique())
        if not unique_labels.issubset({0, 1, 0.0, 1.0}):
            return False, f"Coloana '{OPTIONAL_LABEL_COLUMN}' trebuie să conțină doar valori 0 sau 1."

    return True, "OK"
