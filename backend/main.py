import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import close_db, get_db
from backend.routes import companies, ml_routes, upload
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("BankruptIQ pornit. Conectare MongoDB...")
    get_db()
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

app.include_router(companies.router, prefix="/api/companies", tags=["Companii"])
app.include_router(upload.router, prefix="/api/upload", tags=["Import CSV"])
app.include_router(ml_routes.router, prefix="/api/ml", tags=["Machine Learning"])

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
async def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "BankruptIQ"}
