import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from backend.ml.features import FEATURE_COLUMNS
from backend.ml.trainer import load_model
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)


def _altman_z(ind: dict) -> float:
    """
    Altman Z' (private firm, 1983):
    Z' = 0.717*X1 + 0.847*X2 + 3.107*X3 + 0.420*X4 + 0.998*X5

    X1 = Working Capital / Total Assets  (working_capital_ratio)
    X2 = Retained Earnings / TA          (approx: ROA * 0.65)
    X3 = EBIT / TA                       (approx: ROA * 1.40)
    X4 = BV Equity / Total Liabilities   (approx: (1-DR)/DR)
    X5 = Revenue / TA                    (asset_turnover)

    Zone:  Z' < 1.81 = distress | 1.81–2.99 = grey | > 2.99 = safe
    """
    x1 = float(ind.get("working_capital_ratio", 0.0))
    roa = float(ind.get("return_on_assets", 0.0)) / 100.0
    x2 = max(-0.5, min(0.5, roa * 0.65))
    x3 = max(-0.3, min(0.5, roa * 1.40))
    dr = max(0.01, min(0.99, float(ind.get("debt_ratio", 0.5))))
    x4 = min(6.0, (1.0 - dr) / dr)
    x5 = max(0.0, float(ind.get("asset_turnover", 0.0)))
    z = 0.717 * x1 + 0.847 * x2 + 3.107 * x3 + 0.420 * x4 + 0.998 * x5
    return round(z, 3)


def _risk_from_z(z: float) -> tuple[float, str]:
    """
    Maps Altman Z' to a risk score (0 = safe, 100 = distress) and label.

    Piecewise linear:
      Z >= 5.0  → score 0
      Z = 2.99  → score 33   (boundary safe/grey)
      Z = 1.81  → score 66   (boundary grey/distress)
      Z <= 0    → score 100
    """
    if z >= 5.0:
        score = 0.0
    elif z >= 2.99:
        score = 33.0 * (5.0 - z) / (5.0 - 2.99)
    elif z >= 1.81:
        score = 33.0 + 33.0 * (2.99 - z) / (2.99 - 1.81)
    elif z >= 0.0:
        score = 66.0 + 34.0 * (1.81 - z) / 1.81
    else:
        score = 100.0

    score = round(min(100.0, max(0.0, score)), 2)

    if score < 33.0:
        return score, "Risc mic"
    if score < 66.0:
        return score, "Risc mediu"
    return score, "Risc mare"


def predict(indicators: dict) -> dict:
    pipeline: Pipeline | None = load_model()
    if pipeline is None:
        raise RuntimeError(
            "Modelul nu este antrenat. Apelați endpoint-ul /api/ml/train mai întâi."
        )

    X = pd.DataFrame([{col: indicators.get(col, 0.0) for col in FEATURE_COLUMNS}])
    X = X.astype(float)

    prob_bankrupt: float = float(pipeline.predict_proba(X)[0, 1])

    z = _altman_z(indicators)
    risk_score, label = _risk_from_z(z)

    # Blended score: 60% Altman Z, 40% ML probability
    ml_score = round(prob_bankrupt * 100, 2)
    blended = round(risk_score * 0.60 + ml_score * 0.40, 2)
    blended = min(100.0, max(0.0, blended))

    if blended < 33.0:
        final_label = "Risc mic"
    elif blended < 66.0:
        final_label = "Risc mediu"
    else:
        final_label = "Risc mare"

    rf = pipeline.named_steps["clf"]
    importance = rf.feature_importances_
    feature_contributions = {
        col: round(float(imp * 100), 2)
        for col, imp in zip(FEATURE_COLUMNS, importance)
    }

    logger.debug("Z'=%.3f z_score=%.1f ml=%.1f blended=%.1f label=%s", z, risk_score, ml_score, blended, final_label)

    return {
        "risk_score": blended,
        "risk_label": final_label,
        "altman_z": z,
        "probabilities": {
            "sanatate": round((1.0 - prob_bankrupt) * 100, 2),
            "faliment": round(prob_bankrupt * 100, 2),
        },
        "feature_contributions": feature_contributions,
    }


def predict_batch(records: list[dict]) -> list[dict]:
    pipeline: Pipeline | None = load_model()
    if pipeline is None:
        raise RuntimeError("Modelul nu este antrenat.")

    rows = [{col: r.get(col, 0.0) for col in FEATURE_COLUMNS} for r in records]
    X = pd.DataFrame(rows).astype(float)

    probs = pipeline.predict_proba(X)[:, 1]
    results = []
    for r, prob in zip(records, probs):
        z = _altman_z(r)
        z_score, _ = _risk_from_z(z)
        ml_score = round(float(prob) * 100, 2)
        blended = round(z_score * 0.60 + ml_score * 0.40, 2)
        blended = min(100.0, max(0.0, blended))

        if blended < 33.0:
            label = "Risc mic"
        elif blended < 66.0:
            label = "Risc mediu"
        else:
            label = "Risc mare"

        results.append({"risk_score": blended, "risk_label": label, "altman_z": z})
    return results
