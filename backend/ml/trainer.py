"""
Model ML pentru predicția riscului de faliment.

Alegerea algoritmului — Random Forest:
  • Gestionează relații neliniare între indicatorii financiari
  • Robust la outlieri (frecvenți în date financiare)
  • Oferă importanța variabilelor (interpretabilitate)
  • Funcționează bine pe seturi mici/medii fără tuning intensiv
  • Mai stabil decât un singur arbore de decizie

Pipeline:
  1. Imputare mediană pentru valori lipsă
  2. Scalare standard (StandardScaler)
  3. RandomForestClassifier cu class_weight='balanced'
     (compensează dezechilibrul tipic între clase: puține falimente)
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)

from backend.ml.features import FEATURE_COLUMNS
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)

MODEL_PATH = os.getenv("MODEL_PATH", "models/bankruptcy_model.pkl")


def build_pipeline() -> Pipeline:
    return Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=200,
                    max_depth=8,
                    min_samples_leaf=2,
                    class_weight="balanced",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )


def train(records: list[dict]) -> dict:
    df = pd.DataFrame(records)
    logger.info("Antrenare model pe %d înregistrări", len(df))

    X = df[FEATURE_COLUMNS].astype(float)
    y = df["is_bankrupt"].astype(int)

    if y.nunique() < 2:
        raise ValueError(
            "Setul de date trebuie să conțină atât exemple falimentate cât și sănătoase (is_bankrupt = 0 și 1)."
        )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
        "auc_roc": round(roc_auc_score(y_test, y_prob), 4) if y_test.nunique() >= 2 else 0.0,
        "n_samples": len(df),
        "n_features": len(FEATURE_COLUMNS),
        "model_type": "RandomForestClassifier",
    }

    rf: RandomForestClassifier = pipeline.named_steps["clf"]
    importance = dict(
        zip(FEATURE_COLUMNS, (rf.feature_importances_ * 100).round(2).tolist())
    )
    metrics["feature_importance"] = importance

    os.makedirs(os.path.dirname(MODEL_PATH) or ".", exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    logger.info("Model salvat la %s | AUC-ROC=%.4f", MODEL_PATH, metrics["auc_roc"])

    return metrics


def load_model() -> Pipeline | None:
    if not os.path.exists(MODEL_PATH):
        return None
    return joblib.load(MODEL_PATH)
