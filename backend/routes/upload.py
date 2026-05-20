import io
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from backend.database import get_db
from backend.ml.features import FEATURE_COLUMNS
from backend.ml.predictor import predict_batch
from backend.utils.logger import setup_logger
from backend.utils.validators import OPTIONAL_LABEL_COLUMN, REQUIRED_COLUMNS, validate_csv

logger = setup_logger(__name__)
router = APIRouter()


@router.post("/csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Fișierul trebuie să fie în format CSV.")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Eroare la parsarea CSV: {e}")

    valid, message = validate_csv(df)
    if not valid:
        raise HTTPException(status_code=422, detail=message)

    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["year"] = pd.to_numeric(df["year"], errors="coerce").fillna(0).astype(int)

    if OPTIONAL_LABEL_COLUMN in df.columns:
        df[OPTIONAL_LABEL_COLUMN] = pd.to_numeric(df[OPTIONAL_LABEL_COLUMN], errors="coerce")

    records = df.to_dict(orient="records")

    try:
        risk_results = predict_batch(records)
        has_predictions = True
    except RuntimeError:
        has_predictions = False
        risk_results = [{}] * len(records)

    db = get_db()
    docs = []
    for row, risk in zip(records, risk_results):
        doc = {
            "company_name": str(row.get("company_name", "Necunoscut")),
            "year": int(row.get("year", 0)),
            "sector": str(row.get("sector", "Diverse")) if row.get("sector") else "Diverse",
            "indicators": {col: float(row.get(col, 0.0)) for col in FEATURE_COLUMNS},
            "is_bankrupt": int(row[OPTIONAL_LABEL_COLUMN]) if OPTIONAL_LABEL_COLUMN in row and pd.notna(row.get(OPTIONAL_LABEL_COLUMN)) else None,
            "risk_score": risk.get("risk_score"),
            "risk_label": risk.get("risk_label"),
            "predicted_at": datetime.utcnow() if has_predictions else None,
            "created_at": datetime.utcnow(),
        }
        docs.append(doc)

    result = await db["companies"].insert_many(docs)
    logger.info(
        "CSV '%s' importat: %d companii, predicții=%s",
        file.filename,
        len(docs),
        has_predictions,
    )

    return JSONResponse(
        {
            "imported": len(docs),
            "predictions_applied": has_predictions,
            "inserted_ids": [str(i) for i in result.inserted_ids],
        }
    )
