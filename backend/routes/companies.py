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
