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
    """Re-calculează scorul de risc pentru toate companiile din baza de date."""
    db = get_db()
    cursor = db["companies"].find({}, {"indicators": 1, "company_name": 1})
    docs = await cursor.to_list(length=10_000)

    if not docs:
        return {"updated": 0}

    try:
        records = [doc["indicators"] for doc in docs]
        results = predictor.predict_batch(records)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from datetime import datetime
    from bson import ObjectId

    updated = 0
    for doc, res in zip(docs, results):
        await db["companies"].update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "risk_score": res["risk_score"],
                    "risk_label": res["risk_label"],
                    "predicted_at": datetime.utcnow(),
                }
            },
        )
        updated += 1

    logger.info("Re-scoring complet: %d companii actualizate", updated)
    return {"updated": updated}


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
