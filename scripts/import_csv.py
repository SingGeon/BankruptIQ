#!/usr/bin/env python3
"""
Import CSV financiar direct în MongoDB.

Utilizare:
    python scripts/import_csv.py data/sample_data.csv
    python scripts/import_csv.py myfile.csv --db-url mongodb://localhost:27017 --db-name bankruptiq
    python scripts/import_csv.py myfile.csv --clear   # șterge colecția înainte de import
"""
import argparse
import asyncio
import csv
import sys
from datetime import datetime
from pathlib import Path

import motor.motor_asyncio

REQUIRED_COLUMNS = [
    "company_name", "year",
    "current_ratio", "quick_ratio", "debt_ratio",
    "debt_to_equity", "net_profit_margin", "return_on_assets",
    "return_on_equity", "asset_turnover", "working_capital_ratio",
    "interest_coverage",
]
NUMERIC_COLS = [c for c in REQUIRED_COLUMNS if c not in ("company_name", "year")]
OPTIONAL = {"is_bankrupt", "sector"}


def parse_row(row: dict, lineno: int) -> dict | None:
    missing = [c for c in REQUIRED_COLUMNS if c not in row]
    if missing:
        print(f"  [!] Linia {lineno}: coloane lipsă {missing} — sărit")
        return None

    indicators = {}
    for col in NUMERIC_COLS:
        try:
            indicators[col] = float(row[col])
        except ValueError:
            print(f"  [!] Linia {lineno}: valoare non-numerică în '{col}' — sărit")
            return None

    doc = {
        "company_name": row["company_name"].strip(),
        "year": int(row["year"]),
        "indicators": indicators,
        "sector": row.get("sector", "").strip() or "Necunoscut",
        "created_at": datetime.utcnow(),
    }

    if "is_bankrupt" in row and row["is_bankrupt"].strip() != "":
        try:
            val = int(float(row["is_bankrupt"]))
            if val in (0, 1):
                doc["is_bankrupt"] = val
        except ValueError:
            pass

    return doc


async def run(csv_path: str, db_url: str, db_name: str, clear: bool, dry_run: bool):
    path = Path(csv_path)
    if not path.exists():
        print(f"Eroare: fișierul '{csv_path}' nu există.")
        sys.exit(1)

    client = motor.motor_asyncio.AsyncIOMotorClient(db_url, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command("ping")
    except Exception as e:
        print(f"Eroare conexiune MongoDB ({db_url}): {e}")
        sys.exit(1)

    db = client[db_name]
    col = db["companies"]

    if clear and not dry_run:
        count = await col.count_documents({})
        await col.drop()
        print(f"Colecție ștearsă ({count} documente).")

    docs = []
    errors = 0
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            doc = parse_row(row, i)
            if doc:
                docs.append(doc)
            else:
                errors += 1

    print(f"\nFișier: {path.name}")
    print(f"  Rânduri valide   : {len(docs)}")
    print(f"  Rânduri cu erori : {errors}")

    if not docs:
        print("Nicio înregistrare de importat.")
        return

    if dry_run:
        print("\n[dry-run] Import simulat — MongoDB nu a fost modificat.")
        return

    result = await col.insert_many(docs)
    print(f"  Importate în MongoDB: {len(result.inserted_ids)} documente")
    print(f"  Colecție: {db_name}.companies")
    print(f"  Server  : {db_url}")
    print("\nImport finalizat cu succes.")
    print("Rulează acum antrenarea modelului din dashboard (Setări → Antrenează Model)")
    print("sau via API: POST http://localhost:8000/api/ml/train")


def main():
    parser = argparse.ArgumentParser(
        description="Import CSV financiar direct în MongoDB BankruptIQ"
    )
    parser.add_argument("csv_file", help="Calea către fișierul CSV")
    parser.add_argument("--db-url", default="mongodb://localhost:27017",
                        help="URL MongoDB (implicit: mongodb://localhost:27017)")
    parser.add_argument("--db-name", default="bankruptiq",
                        help="Numele bazei de date (implicit: bankruptiq)")
    parser.add_argument("--clear", action="store_true",
                        help="Șterge colecția existentă înainte de import")
    parser.add_argument("--dry-run", action="store_true",
                        help="Simulează importul fără a modifica MongoDB")
    args = parser.parse_args()

    asyncio.run(run(args.csv_file, args.db_url, args.db_name, args.clear, args.dry_run))


if __name__ == "__main__":
    main()
