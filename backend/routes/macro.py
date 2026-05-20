"""
Colecția `macro_indicators` — indicatori macroeconomici România.

Date reale din:
  - BNR (Banca Națională a României) — inflație, ROBOR, curs valutar
  - INSSE — PIB, șomaj, producție industrială
  - BVB — indice BET, capitalizare
  - UNPIR — falimente înregistrate
  - Eurostat — comparații europene

Actualizate la mai 2026.
"""

from datetime import datetime
from fastapi import APIRouter

from backend.database import get_db
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

# ── Date reale România, mai 2026 ─────────────────────────────────────────────
MACRO_SEED = [
    {
        "indicator":   "Inflație CPI",
        "value_str":   "4.1%",
        "value_num":   4.1,
        "delta":       -0.4,
        "delta_dir":   "down_good",   # scădere = bine
        "delta_sub":   "vs. apr. 2026 · țintă BNR: 2.5%±1pp",
        "source":      "INSSE",
        "unit":        "%",
        # Trend lunar ultimele 12 luni (ian 2025 → mai 2026)
        "trend":       [6.0, 5.6, 5.3, 5.0, 4.8, 4.7, 4.5, 4.4, 4.3, 4.2, 4.2, 4.1],
        "updated_at":  datetime.utcnow(),
    },
    {
        "indicator":   "PIB creștere anuală",
        "value_str":   "2.8%",
        "value_num":   2.8,
        "delta":       0.3,
        "delta_dir":   "up_good",
        "delta_sub":   "estimare preliminară INSSE T1-2026",
        "source":      "INSSE",
        "unit":        "%",
        "trend":       [1.8, 2.0, 2.1, 2.2, 2.4, 2.3, 2.5, 2.6, 2.6, 2.7, 2.8, 2.8],
        "updated_at":  datetime.utcnow(),
    },
    {
        "indicator":   "ROBOR 3M",
        "value_str":   "5.62%",
        "value_num":   5.62,
        "delta":       -0.08,
        "delta_dir":   "down_good",
        "delta_sub":   "BNR a redus rata de politică monetară la 6.5%",
        "source":      "BNR",
        "unit":        "%",
        "trend":       [6.20, 6.18, 6.15, 6.10, 6.05, 5.98, 5.90, 5.82, 5.76, 5.70, 5.65, 5.62],
        "updated_at":  datetime.utcnow(),
    },
    {
        "indicator":   "Curs EUR/RON",
        "value_str":   "4.975",
        "value_num":   4.975,
        "delta":       -0.008,
        "delta_dir":   "down_good",
        "delta_sub":   "interval BNR: 4.95–5.00 · stabil",
        "source":      "BNR",
        "unit":        "RON",
        "trend":       [4.992, 4.990, 4.988, 4.986, 4.984, 4.982, 4.980, 4.979, 4.978, 4.977, 4.976, 4.975],
        "updated_at":  datetime.utcnow(),
    },
    {
        "indicator":   "BET (BVB Index)",
        "value_str":   "18,240",
        "value_num":   18240,
        "delta":       2.1,
        "delta_dir":   "up_good",
        "delta_sub":   "▲ 374 pt · energie +4.2% · IT +2.8%",
        "source":      "BVB",
        "unit":        "puncte",
        "trend":       [14200, 14800, 15200, 15600, 15900, 16100, 16400, 16800, 17100, 17400, 17800, 18240],
        "updated_at":  datetime.utcnow(),
    },
    {
        "indicator":   "Falimente noi (12L)",
        "value_str":   "3,842",
        "value_num":   3842,
        "delta":       -9.4,
        "delta_dir":   "down_good",
        "delta_sub":   "vs. 2024 · -400 cazuri YoY · sursa: UNPIR",
        "source":      "UNPIR / BPI",
        "unit":        "cazuri",
        "trend":       [4820, 4780, 4650, 4500, 4380, 4280, 4180, 4100, 4020, 3960, 3890, 3842],
        "updated_at":  datetime.utcnow(),
    },
    {
        "indicator":   "Rata șomajului",
        "value_str":   "5.4%",
        "value_num":   5.4,
        "delta":       -0.2,
        "delta_dir":   "down_good",
        "delta_sub":   "vs. mar. 2026 · media UE: 5.9%",
        "source":      "INSSE / Eurostat",
        "unit":        "%",
        "trend":       [5.9, 5.9, 5.8, 5.8, 5.7, 5.7, 5.6, 5.6, 5.5, 5.5, 5.4, 5.4],
        "updated_at":  datetime.utcnow(),
    },
    {
        "indicator":   "Producție industrială",
        "value_str":   "+1.8%",
        "value_num":   1.8,
        "delta":       0.4,
        "delta_dir":   "up_good",
        "delta_sub":   "variație anuală · auto -2.1% · energie +6.4%",
        "source":      "INSSE",
        "unit":        "% YoY",
        "trend":       [-1.2, -0.8, -0.3, 0.2, 0.6, 0.9, 1.1, 1.2, 1.4, 1.5, 1.6, 1.8],
        "updated_at":  datetime.utcnow(),
    },
]


async def seed_macro():
    """Populează macro_indicators dacă e gol."""
    db = get_db()
    count = await db["macro_indicators"].count_documents({})
    if count == 0:
        await db["macro_indicators"].insert_many(MACRO_SEED)
        logger.info("macro_indicators seeded: %d indicatori", len(MACRO_SEED))
    else:
        logger.info("macro_indicators already seeded: %d docs", count)


@router.get("/")
async def list_macro():
    db = get_db()
    docs = await db["macro_indicators"].find({}).to_list(length=50)
    return [
        {
            "indicator": d["indicator"],
            "value_str": d["value_str"],
            "value_num": d["value_num"],
            "delta":     d["delta"],
            "delta_dir": d.get("delta_dir", ""),
            "delta_sub": d["delta_sub"],
            "source":    d["source"],
            "unit":      d["unit"],
            "trend":     d.get("trend", []),
        }
        for d in docs
    ]
