"""
Load Romanian BAC data into MongoDB.
Collections: rezultate, judete, scoli, predictii
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime

try:
    from pymongo import MongoClient, ASCENDING, DESCENDING
    from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
    MONGO_AVAILABLE = True
except ImportError:
    MONGO_AVAILABLE = False

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "bac_romania")

DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data", "bac_romania.csv"
)


def get_mongo_client():
    """Return a MongoClient or raise if unavailable."""
    if not MONGO_AVAILABLE:
        raise RuntimeError("pymongo is not installed. Run: pip install pymongo")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Ping to verify connection
    client.admin.command("ping")
    return client


def load_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    # Replace NaN with None so pymongo handles it as null
    df = df.where(pd.notna(df), None)
    return df


def insert_rezultate(db, df: pd.DataFrame):
    """Insert raw results into 'rezultate' collection."""
    col = db["rezultate"]
    col.drop()
    records = df.to_dict(orient="records")
    result = col.insert_many(records)
    col.create_index([("an", ASCENDING)])
    col.create_index([("judet", ASCENDING)])
    col.create_index([("promovat", ASCENDING)])
    col.create_index([("profil", ASCENDING)])
    print(f"  Inserted {len(result.inserted_ids)} documents into 'rezultate'")


def compute_judete_stats(df: pd.DataFrame) -> list:
    """Aggregate stats per county."""
    grp = df.groupby("judet")
    rows = []
    for judet, g in grp:
        total = len(g)
        passed = int(g["promovat"].sum())
        failed = total - passed
        pass_rate = round(passed / total * 100, 2) if total else 0
        avg_grade = round(float(g["medie_generala"].mean()), 2)
        urban_pct = round(float((g["oras_tip"] == "Urban").mean() * 100), 1)
        rows.append({
            "judet": judet,
            "total": total,
            "promovat": passed,
            "nepromovat": failed,
            "rata_promovare": pass_rate,
            "medie_generala": avg_grade,
            "urban_pct": urban_pct,
            "updated_at": datetime.utcnow(),
        })
    return sorted(rows, key=lambda x: x["rata_promovare"], reverse=True)


def insert_judete(db, df: pd.DataFrame):
    """Insert county stats into 'judete' collection."""
    col = db["judete"]
    col.drop()
    rows = compute_judete_stats(df)
    # Add rank
    for i, row in enumerate(rows, 1):
        row["rank"] = i
    col.insert_many(rows)
    col.create_index([("judet", ASCENDING)], unique=True)
    col.create_index([("rata_promovare", DESCENDING)])
    print(f"  Inserted {len(rows)} documents into 'judete'")


def compute_scoli_stats(df: pd.DataFrame) -> list:
    """Aggregate stats per school type."""
    grp = df.groupby("tip_scoala")
    rows = []
    for tip, g in grp:
        total = len(g)
        passed = int(g["promovat"].sum())
        pass_rate = round(passed / total * 100, 2) if total else 0
        avg_grade = round(float(g["medie_generala"].mean()), 2)
        rows.append({
            "tip_scoala": tip,
            "total": total,
            "promovat": passed,
            "nepromovat": total - passed,
            "rata_promovare": pass_rate,
            "medie_generala": avg_grade,
            "updated_at": datetime.utcnow(),
        })
    return sorted(rows, key=lambda x: x["rata_promovare"], reverse=True)


def insert_scoli(db, df: pd.DataFrame):
    """Insert school type stats into 'scoli' collection."""
    col = db["scoli"]
    col.drop()
    rows = compute_scoli_stats(df)
    col.insert_many(rows)
    col.create_index([("tip_scoala", ASCENDING)], unique=True)
    print(f"  Inserted {len(rows)} documents into 'scoli'")


def ensure_predictii(db):
    """Ensure 'predictii' collection exists with proper indexes."""
    col = db["predictii"]
    col.create_index([("timestamp", DESCENDING)])
    col.create_index([("judet", ASCENDING)])
    print("  Collection 'predictii' ready (indexes created)")


def compute_yearly_stats(df: pd.DataFrame):
    """Print and return yearly aggregate stats."""
    grp = df.groupby("an")
    rows = []
    for an, g in grp:
        total = len(g)
        passed = int(g["promovat"].sum())
        pass_rate = round(passed / total * 100, 2)
        avg_grade = round(float(g["medie_generala"].mean()), 2)
        rows.append({
            "an": int(an),
            "total": total,
            "promovat": passed,
            "nepromovat": total - passed,
            "rata_promovare": pass_rate,
            "medie_generala": avg_grade,
        })
    return rows


def main():
    if not os.path.exists(DATA_PATH):
        print(f"ERROR: Data file not found at {DATA_PATH}")
        print("Run: python scripts/generate_bac_data.py first")
        sys.exit(1)

    print(f"Loading CSV from {DATA_PATH} ...")
    df = load_csv(DATA_PATH)
    print(f"  Loaded {len(df)} rows")

    print(f"\nConnecting to MongoDB at {MONGO_URI} ...")
    try:
        client = get_mongo_client()
    except Exception as e:
        print(f"ERROR: Cannot connect to MongoDB: {e}")
        sys.exit(1)

    db = client[MONGO_DB]
    print(f"  Connected to database '{MONGO_DB}'")

    print("\nInserting data...")
    insert_rezultate(db, df)
    insert_judete(db, df)
    insert_scoli(db, df)
    ensure_predictii(db)

    print("\nYearly stats:")
    yearly = compute_yearly_stats(df)
    for row in yearly:
        print(f"  {row['an']}: {row['total']} students, "
              f"{row['rata_promovare']}% pass rate, "
              f"avg grade {row['medie_generala']}")

    print("\nDone!")
    client.close()


if __name__ == "__main__":
    main()
