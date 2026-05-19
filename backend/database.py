import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        _client = AsyncIOMotorClient(url)
        logger.info("MongoDB client creat pentru %s", url)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        db_name = os.getenv("DATABASE_NAME", "bankruptiq")
        _db = get_client()[db_name]
        logger.info("Baza de date '%s' selectată", db_name)
    return _db


async def close_db():
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("Conexiunea MongoDB închisă")
