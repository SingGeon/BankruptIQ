from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from datetime import datetime

from backend.database import get_db
from backend.models import CompanyOut, FinancialIndicators
from backend.ml.predictor import predict
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


def _doc_to_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "company_name": doc["company_name"],
        "year": doc["year"],
        "risk_score": doc.get("risk_score"),
        "risk_label": doc.get("risk_label"),
        "is_bankrupt": doc.get("is_bankrupt"),
        "indicators": doc["indicators"],
        "created_at": doc.get("created_at", datetime.utcnow()),
    }


@router.get("/", response_model=list[CompanyOut])
async def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: str = Query(""),
):
    db = get_db()
    query = {}
    if search:
        query["company_name"] = {"$regex": search, "$options": "i"}

    cursor = db["companies"].find(query).skip(skip).limit(limit).sort("created_at", -1)
    docs = await cursor.to_list(length=limit)
    return [_doc_to_out(d) for d in docs]


@router.get("/sector-stats")
async def get_sector_stats():
    db = get_db()
    pipeline = [
        {
            "$group": {
                "_id": "$sector",
                "count": {"$sum": 1},
                "avg_risk_score": {"$avg": "$risk_score"},
                "high_risk": {"$sum": {"$cond": [{"$eq": ["$risk_label", "Risc mare"]}, 1, 0]}},
                "bankrupt": {"$sum": {"$cond": [{"$eq": ["$is_bankrupt", 1]}, 1, 0]}},
                "avg_debt_ratio": {"$avg": "$indicators.debt_ratio"},
                "avg_current_ratio": {"$avg": "$indicators.current_ratio"},
                "avg_npm": {"$avg": "$indicators.net_profit_margin"},
            }
        },
        {"$sort": {"avg_risk_score": -1}},
    ]
    docs = await db["companies"].aggregate(pipeline).to_list(100)
    return [
        {
            "sector": d["_id"] or "Necunoscut",
            "count": d["count"],
            "avg_risk_score": round(d["avg_risk_score"], 1) if d["avg_risk_score"] else None,
            "high_risk": d["high_risk"],
            "bankrupt": d["bankrupt"],
            "avg_debt_ratio": round(d["avg_debt_ratio"], 3) if d["avg_debt_ratio"] else None,
            "avg_current_ratio": round(d["avg_current_ratio"], 3) if d["avg_current_ratio"] else None,
            "avg_npm": round(d["avg_npm"], 2) if d["avg_npm"] else None,
        }
        for d in docs
    ]


@router.get("/stats")
async def get_stats():
    db = get_db()
    total = await db["companies"].count_documents({})
    high_risk = await db["companies"].count_documents({"risk_label": "Risc mare"})
    medium_risk = await db["companies"].count_documents({"risk_label": "Risc mediu"})
    low_risk = await db["companies"].count_documents({"risk_label": "Risc mic"})
    bankrupt = await db["companies"].count_documents({"is_bankrupt": 1})

    pipeline = [{"$group": {"_id": None, "avg_score": {"$avg": "$risk_score"}}}]
    result = await db["companies"].aggregate(pipeline).to_list(1)
    avg_score = round(result[0]["avg_score"], 2) if result and result[0]["avg_score"] else None

    return {
        "total": total,
        "high_risk": high_risk,
        "medium_risk": medium_risk,
        "low_risk": low_risk,
        "bankrupt_known": bankrupt,
        "avg_risk_score": avg_score,
    }


@router.get("/{company_id}", response_model=CompanyOut)
async def get_company(company_id: str):
    db = get_db()
    try:
        oid = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalid")

    doc = await db["companies"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Compania nu a fost găsită")
    return _doc_to_out(doc)


@router.post("/{company_id}/predict")
async def predict_company_risk(company_id: str):
    db = get_db()
    try:
        oid = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalid")

    doc = await db["companies"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Compania nu a fost găsită")

    try:
        result = predict(doc["indicators"])
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db["companies"].update_one(
        {"_id": oid},
        {
            "$set": {
                "risk_score": result["risk_score"],
                "risk_label": result["risk_label"],
                "predicted_at": datetime.utcnow(),
            }
        },
    )
    logger.info("Predicție pentru %s: scor=%.2f", doc["company_name"], result["risk_score"])
    return result


@router.delete("/{company_id}")
async def delete_company(company_id: str):
    db = get_db()
    try:
        oid = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalid")

    res = await db["companies"].delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Compania nu a fost găsită")
    return {"deleted": True}
