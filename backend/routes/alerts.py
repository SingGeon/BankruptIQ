"""
Colecția `alerts` — alerte auto-generate din analiza de risc a companiilor.

Logică:
  - Fiecare companie cu Z' < 2.99 sau cu flag financiar activ primește alerte
  - Severitate: critical (Z<1.81 / NPM negativ / IC<1.5)
                high     (DR>70% / ROE<0 / CR<1)
                medium   (Z 1.81-2.99 / ROA<2%)
  - Regenerate automat după fiecare predict-all
"""

from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from backend.database import get_db
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

FLAG_META = {
    "z_distress": ("critical", "Altman Z' < 1.81 — distress financiar", "Compania se află în zona de distress. Probabilitate ridicată de insolvență în 12-24 luni."),
    "npm_neg":    ("critical", "Marjă profit netă negativă", "Compania înregistrează pierderi operaționale. Capitalul propriu este erodat."),
    "ic_low":     ("critical", "Acoperire dobânzi < 1.5×", "Profitul operațional nu acoperă dobânzile. Risc de neplată iminent."),
    "cr_low":     ("high",     "Lichiditate curentă < 1.0", "Activele circulante nu acoperă datoriile pe termen scurt. Risc de lichiditate."),
    "debt_high":  ("high",     "Rata datorii > 70%", "Levier financiar ridicat. Compania este puternic dependentă de creditori."),
    "roe_neg":    ("high",     "ROE negativ — distrugere de valoare", "Randamentul capitalului propriu este negativ. Acționarii pierd valoare."),
    "z_grey":     ("medium",   "Altman Z' 1.81–2.99 — zonă gri", "Compania se află în zona de incertitudine. Monitorizare trimestrială recomandată."),
    "roa_low":    ("medium",   "ROA < 2% — eficiență scăzută", "Activele generează randament sub pragul minim acceptabil."),
}

SEV_ORDER = {"critical": 0, "high": 1, "medium": 2}


def _altman_z(ind: dict) -> float:
    wcr = float(ind.get("working_capital_ratio", 0))
    roa = float(ind.get("return_on_assets", 0)) / 100
    dr  = max(0.01, min(0.99, float(ind.get("debt_ratio", 0.5))))
    at  = max(0.0, float(ind.get("asset_turnover", 0)))
    x2  = max(-0.5, min(0.5, roa * 0.65))
    x3  = max(-0.3, min(0.5, roa * 1.40))
    x4  = min(6.0, (1 - dr) / dr)
    return round(0.717 * wcr + 0.847 * x2 + 3.107 * x3 + 0.420 * x4 + 0.998 * at, 3)


def _get_flags(ind: dict, z: float) -> list[str]:
    flags = []
    if ind.get("current_ratio", 99)    < 1.0:  flags.append("cr_low")
    if ind.get("debt_ratio", 0)        > 0.70:  flags.append("debt_high")
    if ind.get("net_profit_margin", 0) < 0:     flags.append("npm_neg")
    if ind.get("return_on_equity", 0)  < 0:     flags.append("roe_neg")
    if ind.get("interest_coverage", 99)< 1.5:   flags.append("ic_low")
    if ind.get("return_on_assets", 99) < 2.0:   flags.append("roa_low")
    if z < 1.81:   flags.append("z_distress")
    elif z < 2.99: flags.append("z_grey")
    return flags


@router.post("/generate")
async def generate_alerts():
    """Regenerează toate alertele din companiile existente."""
    db = get_db()

    # Preia câte un document per companie (cel mai recent an)
    pipeline = [
        {"$sort": {"year": -1}},
        {"$group": {"_id": "$company_name", "doc": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$doc"}},
    ]
    docs = await db["companies"].aggregate(pipeline).to_list(length=2000)

    await db["alerts"].delete_many({})

    alerts = []
    now = datetime.utcnow()

    for doc in docs:
        ind         = doc.get("indicators", {})
        company     = doc["company_name"]
        sector      = doc.get("sector", "Diverse")
        risk_score  = doc.get("risk_score") or 0
        altman_z    = doc.get("altman_z") or _altman_z(ind)

        flags = _get_flags(ind, altman_z)
        if not flags:
            continue

        # Sortăm după severitate, limităm la 2 alerte per companie
        flags.sort(key=lambda f: SEV_ORDER.get(FLAG_META.get(f, ("medium",))[0], 2))
        for flag in flags[:2]:
            sev, title, detail = FLAG_META.get(flag, ("medium", flag, ""))
            alerts.append({
                "company_name": company,
                "sector":       sector,
                "risk_score":   risk_score,
                "altman_z":     altman_z,
                "severity":     sev,
                "flag":         flag,
                "title":        title,
                "detail":       f"{company}: {detail} (Z'={altman_z:.2f}, risc={risk_score:.1f}%)",
                "read":         False,
                "created_at":   now,
            })

    if alerts:
        await db["alerts"].insert_many(alerts)

    logger.info("Alerte generate: %d", len(alerts))
    return {"generated": len(alerts)}


@router.get("/")
async def list_alerts(
    limit: int = Query(100, ge=1, le=500),
    severity: str = Query("all"),
):
    db = get_db()
    query = {} if severity == "all" else {"severity": severity}
    cursor = (
        db["alerts"]
        .find(query)
        .sort([("severity", 1), ("risk_score", -1)])
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    return [
        {
            "id":           str(d["_id"]),
            "company_name": d["company_name"],
            "sector":       d.get("sector", ""),
            "risk_score":   d.get("risk_score", 0),
            "altman_z":     d.get("altman_z", 0),
            "severity":     d["severity"],
            "flag":         d["flag"],
            "title":        d["title"],
            "detail":       d["detail"],
            "created_at":   d.get("created_at", datetime.utcnow()).isoformat(),
        }
        for d in docs
    ]


@router.get("/count")
async def count_alerts():
    db = get_db()
    total    = await db["alerts"].count_documents({})
    critical = await db["alerts"].count_documents({"severity": "critical"})
    high     = await db["alerts"].count_documents({"severity": "high"})
    medium   = await db["alerts"].count_documents({"severity": "medium"})
    return {"total": total, "critical": critical, "high": high, "medium": medium}
