
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from backend.database import close_db, get_db
from backend.routes import companies, ml_routes, upload
from backend.routes.alerts import router as alerts_router, generate_alerts
from backend.routes.macro import router as macro_router, seed_macro
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("BankruptIQ pornit. Conectare MongoDB...")
    get_db()
    await seed_macro()
    # Generează alerte dacă colecția e goală
    from backend.database import get_db as _db
    db = _db()
    alert_count = await db["alerts"].count_documents({})
    if alert_count == 0:
        company_count = await db["companies"].count_documents({})
        if company_count > 0:
            await generate_alerts()
    yield
    await close_db()
    logger.info("BankruptIQ oprit.")


app = FastAPI(
    title="BankruptIQ API",
    description="Sistem de analiză a riscului de faliment al întreprinderilor",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router,  prefix="/api/companies",  tags=["Companii"])
app.include_router(upload.router,     prefix="/api/upload",     tags=["Import CSV"])
app.include_router(ml_routes.router,  prefix="/api/ml",         tags=["Machine Learning"])
app.include_router(alerts_router,     prefix="/api/alerts",      tags=["Alerte"])
app.include_router(macro_router,      prefix="/api/macro",       tags=["Macro Indicatori"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "BankruptIQ"}


@app.get("/", include_in_schema=False)
async def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/dashboard", include_in_schema=False)
async def serve_dashboard():
    return FileResponse(
        os.path.join(FRONTEND_DIR, "dashboard.html"),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@app.get("/src/{filename:path}", include_in_schema=False)
async def serve_jsx(filename: str):
    """Servește fișierele JSX/JS fără cache."""
    path = os.path.join(FRONTEND_DIR, "src", filename.split("?")[0])
    if not os.path.exists(path):
        return Response(status_code=404)
    return FileResponse(
        path,
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")
