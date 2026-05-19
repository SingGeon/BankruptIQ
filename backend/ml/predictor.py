import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from backend.ml.features import FEATURE_COLUMNS
from backend.ml.trainer import load_model
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)


def _risk_label(score: float) -> str:
    if score < 33:
        return "Risc mic"
    if score < 66:
        return "Risc mediu"
    return "Risc mare"


def predict(indicators: dict) -> dict:
    pipeline: Pipeline | None = load_model()
    if pipeline is None:
        raise RuntimeError(
            "Modelul nu este antrenat. Apelați endpoint-ul /api/ml/train mai întâi."
        )

    X = pd.DataFrame([{col: indicators.get(col, 0.0) for col in FEATURE_COLUMNS}])
    X = X.astype(float)

    prob_bankrupt: float = float(pipeline.predict_proba(X)[0, 1])
    risk_score = round(prob_bankrupt * 100, 2)
    label = _risk_label(risk_score)

    rf = pipeline.named_steps["clf"]
    importance = rf.feature_importances_
    feature_contributions = {
        col: round(float(imp * 100), 2)
        for col, imp in zip(FEATURE_COLUMNS, importance)
    }

    logger.debug("Predicție: scor=%.2f label=%s", risk_score, label)

    return {
        "risk_score": risk_score,
        "risk_label": label,
        "probabilities": {
            "sanatate": round((1 - prob_bankrupt) * 100, 2),
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
    for prob in probs:
        score = round(float(prob) * 100, 2)
        results.append({"risk_score": score, "risk_label": _risk_label(score)})
    return results
