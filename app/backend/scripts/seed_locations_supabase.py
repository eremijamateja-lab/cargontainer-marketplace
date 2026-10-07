"""One-off: copy the location autocomplete table (~616k postal codes) from the local SQLite
dev database into marketplace.locations on Supabase.

    python scripts/seed_locations_supabase.py [path/to/local.db]

Reads DATABASE_URL from .env (the Supabase session-pooler URL). Refuses to run if
marketplace.locations already has rows, so it can't double-insert.
"""

import asyncio
import os
import sqlite3
import sys
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
COLUMNS = ["country_code", "country_name", "postal_code", "city", "location_name", "location_type", "search_key"]
BATCH = 20000


def pg_dsn(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://", 1).replace("postgres+asyncpg://", "postgresql://", 1)


async def main() -> None:
    load_dotenv(ROOT / ".env")
    url = os.environ.get("DATABASE_URL", "")
    if not url.startswith("postgres"):
        sys.exit("DATABASE_URL is not a Postgres URL — point .env at Supabase first.")
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "local.db"
    if not src.exists():
        sys.exit(f"Source SQLite db not found: {src}")

    lite = sqlite3.connect(src)
    rows = lite.execute(f"select {', '.join(COLUMNS)} from locations order by id").fetchall()
    print(f"read {len(rows)} locations from {src.name}")
    missing_key = sum(1 for r in rows if not r[6])
    if missing_key:
        sys.exit(f"{missing_key} rows have no search_key — backfill before copying.")

    conn = await asyncpg.connect(pg_dsn(url), statement_cache_size=0)
    try:
        existing = await conn.fetchval("select count(*) from marketplace.locations")
        if existing:
            sys.exit(f"marketplace.locations already has {existing} rows — not copying again.")
        for i in range(0, len(rows), BATCH):
            chunk = rows[i : i + BATCH]
            await conn.copy_records_to_table("locations", schema_name="marketplace", records=chunk, columns=COLUMNS)
            print(f"  copied {i + len(chunk)}/{len(rows)}")
        await conn.execute("analyze marketplace.locations")
        print("done:", await conn.fetchval("select count(*) from marketplace.locations"), "rows")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
