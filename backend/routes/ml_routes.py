import os
from fastapi import APIRouter, HTTPException

from backend.database import get_db
from backend.ml import trainer, predictor
from backend.ml.features import FEATURE_COLUMNS, FEATURE_DESCRIPTIONS
from backend.models import PredictionRequest, PredictionResponse, TrainResponse
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.post("/train", response_model=TrainResponse)
async def train_model():
    db = get_db()
    cursor = db["companies"].find(
        {"is_bankrupt": {"$in": [0, 1]}},
        {"indicators": 1, "is_bankrupt": 1},
    )
    docs = await cursor.to_list(length=10_000)

    if len(docs) < 20:
        raise HTTPException(
            status_code=400,
            detail=f"Date insuficiente pentru antrenare. Sunt necesare cel puțin 20 înregistrări cu eticheta is_bankrupt, dar există doar {len(docs)}.",
        )

    records = []
    for doc in docs:
        row = {col: doc["indicators"].get(col, 0.0) for col in FEATURE_COLUMNS}
        row["is_bankrupt"] = doc["is_bankrupt"]
        records.append(row)

    try:
        metrics = trainer.train(records)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info("Antrenare completă: %s", metrics)
    return metrics


@router.post("/predict", response_model=PredictionResponse)
async def predict_risk(req: PredictionRequest):
    try:
        result = predictor.predict(req.indicators.model_dump())
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/predict-all")
async def predict_all_companies():
    """Re-calculează scorul de risc pentru toate companiile și regenerează alertele."""
    db = get_db()
    cursor = db["companies"].find({}, {"indicators": 1, "company_name": 1})
    docs = await cursor.to_list(length=100_000)

    if not docs:
        return {"updated": 0}

    try:
        records = [doc["indicators"] for doc in docs]
        results = predictor.predict_batch(records)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from datetime import datetime

    updated = 0
    for doc, res in zip(docs, results):
        await db["companies"].update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "risk_score":   res["risk_score"],
                    "risk_label":   res["risk_label"],
                    "altman_z":     res.get("altman_z"),
                    "predicted_at": datetime.utcnow(),
                }
            },
        )
        updated += 1

    # Regenerează alertele pe baza noilor scoruri
    from backend.routes.alerts import generate_alerts as _gen_alerts
    alert_result = await _gen_alerts()

    logger.info("Re-scoring complet: %d companii, %d alerte", updated, alert_result["generated"])
    return {"updated": updated, "alerts_generated": alert_result["generated"]}


@router.get("/forecast/{company_name}")
async def forecast_company(company_name: str, months: int = 12):
    """
    Proiectează scorul de risc pentru o companie pe N luni viitoare.
    Returnează lista de scoruri lunare estimate.
    """
    if months < 1 or months > 60:
        raise HTTPException(status_code=400, detail="months trebuie să fie între 1 și 60.")

    db = get_db()
    cursor = db["companies"].find(
        {"company_name": company_name},
        {"indicators": 1, "year": 1, "risk_score": 1}
    ).sort("year", -1).limit(5)
    docs = await cursor.to_list(length=5)

    if not docs:
        raise HTTPException(status_code=404, detail="Compania nu a fost găsită.")

    try:
        from backend.ml.predictor import predict_batch
        import math

        # Calculăm scorul de bază din cel mai recent an
        latest_ind = docs[0]["indicators"]
        base_score = docs[0].get("risk_score")
        if base_score is None:
            results = predict_batch([latest_ind])
            base_score = results[0]["risk_score"] if results else 50.0

        # Tendința: diferența medie anuală din istoricul disponibil
        if len(docs) >= 2:
            scores = []
            for d in docs:
                if d.get("risk_score") is not None:
                    scores.append(d["risk_score"])
                else:
                    r = predict_batch([d["indicators"]])
                    scores.append(r[0]["risk_score"])
            if len(scores) >= 2:
                annual_trend = (scores[-1] - scores[0]) / max(1, len(scores) - 1)
            else:
                annual_trend = 0.0
        else:
            annual_trend = 0.0

        # Proiecție lunară: tendință + zgomot mic deterministic
        monthly_trend = annual_trend / 12
        forecast = []
        v = base_score
        for i in range(months):
            v = max(0.0, min(100.0, v + monthly_trend + math.sin(i * 0.7) * 0.8))
            forecast.append(round(v, 2))

        return {"company_name": company_name, "base_score": base_score, "months": months, "forecast": forecast}

    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/model-info")
async def model_info():
    model_path = os.getenv("MODEL_PATH", "models/bankruptcy_model.pkl")
    exists = os.path.exists(model_path)
    info = {
        "model_trained": exists,
        "model_path": model_path,
        "features": FEATURE_DESCRIPTIONS,
        "algorithm": "RandomForestClassifier",
        "description": (
            "Random Forest cu 200 arbori, class_weight='balanced', "
            "StandardScaler și imputare mediană pentru valori lipsă."
        ),
    }
    if exists:
        import joblib
        pipeline = joblib.load(model_path)
        rf = pipeline.named_steps["clf"]
        info["n_estimators"] = rf.n_estimators
        fi = dict(zip(FEATURE_COLUMNS, (rf.feature_importances_ * 100).round(2).tolist()))
        info["feature_importance"] = fi
    return info
