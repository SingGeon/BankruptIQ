"""
Romanian BAC ML Predictor
- Classification: RandomForestClassifier -> predict pass/fail
- Regression: GradientBoostingRegressor -> predict medie_generala
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, classification_report, mean_absolute_error, r2_score
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "bac_romania.csv")
MODELS_DIR = os.path.dirname(os.path.abspath(__file__))

CLF_PATH = os.path.join(MODELS_DIR, "bac_classifier.pkl")
REG_PATH = os.path.join(MODELS_DIR, "bac_regressor.pkl")
ENC_PATH = os.path.join(MODELS_DIR, "encoders.pkl")

# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------
CATEGORICAL_FEATURES = ["judet", "oras_tip", "sex", "profil", "tip_scoala", "sesiune"]
NUMERIC_FEATURES = ["an", "nota_romana", "nota_matematica_or_istorie", "nota_specialitate"]
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def prepare_features(df: pd.DataFrame, encoders: dict = None, fit: bool = False):
    """
    Prepare feature matrix X.
    - nota_matematica_or_istorie = matematica if available else istorie
    - Encode categoricals
    """
    data = df.copy()

    # Merge matematica/istorie into one numeric column
    data["nota_matematica_or_istorie"] = np.where(
        data["nota_matematica"].notna(),
        data["nota_matematica"],
        data["nota_istorie"]
    )

    # Fill NaN numeric features with column median
    for col in ["nota_romana", "nota_matematica_or_istorie", "nota_specialitate"]:
        if fit:
            median = data[col].median()
            data[col] = data[col].fillna(median)
        else:
            data[col] = data[col].fillna(0)

    if fit:
        encoders = {}
        for col in CATEGORICAL_FEATURES:
            le = LabelEncoder()
            data[col] = le.fit_transform(data[col].astype(str))
            encoders[col] = le
    else:
        for col in CATEGORICAL_FEATURES:
            le = encoders[col]
            # Handle unseen labels by mapping to first class
            data[col] = data[col].astype(str).apply(
                lambda x: x if x in le.classes_ else le.classes_[0]
            )
            data[col] = le.transform(data[col])

    X = data[ALL_FEATURES].values
    return X, encoders


def train_models(data_path: str = DATA_PATH):
    """Train classifier and regressor, save to disk."""
    print(f"Loading data from {data_path} ...")
    df = pd.read_csv(data_path)
    print(f"  {len(df)} rows loaded")

    # Prepare features
    X, encoders = prepare_features(df, fit=True)
    y_clf = df["promovat"].values.astype(int)
    y_reg = df["medie_generala"].values.astype(float)

    # Train/test split
    X_train, X_test, y_clf_train, y_clf_test, y_reg_train, y_reg_test = train_test_split(
        X, y_clf, y_reg, test_size=0.2, random_state=42, stratify=y_clf
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

    # -----------------------------------------------------------------------
    # Classification
    # -----------------------------------------------------------------------
    print("\nTraining RandomForestClassifier ...")
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_clf_train)
    y_clf_pred = clf.predict(X_test)
    acc = accuracy_score(y_clf_test, y_clf_pred)
    print(f"  Accuracy: {acc:.4f}")
    print(classification_report(y_clf_test, y_clf_pred, target_names=["NEPROMOVAT", "PROMOVAT"]))

    # -----------------------------------------------------------------------
    # Regression
    # -----------------------------------------------------------------------
    print("Training GradientBoostingRegressor ...")
    reg = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    reg.fit(X_train, y_reg_train)
    y_reg_pred = reg.predict(X_test)
    mae = mean_absolute_error(y_reg_test, y_reg_pred)
    r2 = r2_score(y_reg_test, y_reg_pred)
    print(f"  MAE: {mae:.4f}  R²: {r2:.4f}")

    # -----------------------------------------------------------------------
    # Save models
    # -----------------------------------------------------------------------
    joblib.dump(clf, CLF_PATH)
    joblib.dump(reg, REG_PATH)
    joblib.dump(encoders, ENC_PATH)
    print(f"\nSaved classifier  -> {CLF_PATH}")
    print(f"Saved regressor   -> {REG_PATH}")
    print(f"Saved encoders    -> {ENC_PATH}")

    # Return stats for later use
    stats = {
        "clf_accuracy": acc,
        "reg_mae": mae,
        "reg_r2": r2,
        "feature_names": ALL_FEATURES,
        "clf_feature_importances": clf.feature_importances_.tolist(),
        "reg_feature_importances": reg.feature_importances_.tolist(),
    }
    return clf, reg, encoders, stats


def load_models():
    """Load saved models from disk."""
    clf = joblib.load(CLF_PATH)
    reg = joblib.load(REG_PATH)
    encoders = joblib.load(ENC_PATH)
    return clf, reg, encoders


def predict_student(
    judet: str,
    oras_tip: str,
    sex: str,
    profil: str,
    tip_scoala: str,
    sesiune: str,
    an: int,
    nota_romana: float,
    nota_matematica_or_istorie: float,
    nota_specialitate: float,
    clf=None,
    reg=None,
    encoders=None,
) -> dict:
    """
    Predict pass/fail and average grade for a single student.

    Returns dict with keys:
      - promovat: 0 or 1
      - probabilitate_promovare: float [0,1]
      - medie_generala_pred: float
      - features_used: dict
    """
    if clf is None or reg is None or encoders is None:
        clf, reg, encoders = load_models()

    # Pass nota_matematica_or_istorie via nota_matematica so prepare_features picks it up
    student_df = pd.DataFrame([{
        "judet": judet,
        "oras_tip": oras_tip,
        "sex": sex,
        "profil": profil,
        "tip_scoala": tip_scoala,
        "sesiune": sesiune,
        "an": an,
        "nota_romana": nota_romana,
        "nota_matematica": nota_matematica_or_istorie,  # used for the merged column
        "nota_istorie": np.nan,
        "nota_specialitate": nota_specialitate,
    }])

    X, _ = prepare_features(student_df, encoders=encoders, fit=False)

    proba = clf.predict_proba(X)[0]
    promovat = int(clf.predict(X)[0])
    medie_pred = float(reg.predict(X)[0])
    medie_pred = round(float(np.clip(medie_pred, 0, 10)), 2)

    return {
        "promovat": promovat,
        "probabilitate_promovare": round(float(proba[1]), 4),
        "probabilitate_nepromovare": round(float(proba[0]), 4),
        "medie_generala_pred": medie_pred,
        "features_used": {
            "judet": judet, "oras_tip": oras_tip, "sex": sex,
            "profil": profil, "tip_scoala": tip_scoala, "sesiune": sesiune,
            "an": an, "nota_romana": nota_romana,
            "nota_matematica_or_istorie": nota_matematica_or_istorie,
            "nota_specialitate": nota_specialitate,
        },
    }


if __name__ == "__main__":
    train_models()
